from __future__ import annotations

import argparse
import csv
import json
import math
import os
import statistics
import tempfile
import time
from pathlib import Path
from typing import Any
from urllib import request

PROJECT_ROOT = Path(__file__).resolve().parents[1]
import sys

sys.path.insert(0, str(PROJECT_ROOT))

from src.ai_models.schemas import TextChunk
from src.ai_models.vector_store import SQLiteVectorStore
from src.ai_models.whisper_cpp_provider import WhisperCppSpeechToTextProvider


DEFAULT_LLM_PROMPT = (
    "Write a concise clinical session summary in English. Include presenting themes, "
    "interventions used, patient response, risks, and next-session plan. Use structured "
    "paragraphs and do not invent details."
)

DEFAULT_SEARCH_QUERIES = [
    "sleep anxiety and work boundaries",
    "panic symptoms on public transport",
    "grief and family communication",
    "avoidance pattern and exposure practice",
    "self criticism and emotional regulation",
]


def main() -> None:
    args = _parse_args()
    rows: list[dict[str, Any]] = []

    if args.bench_llm:
        rows.extend(_benchmark_llm(args))

    if args.bench_whisper:
        rows.extend(_benchmark_whisper(args))

    if args.bench_semantic_e2e:
        rows.extend(_benchmark_semantic_e2e(args))

    if args.bench_vector_search:
        rows.extend(_benchmark_vector_search(args))

    _write_outputs(rows=rows, output_prefix=args.output_prefix)
    _print_rollup(rows)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Benchmark PsychAI local AI stack.")
    parser.add_argument("--output-prefix", default="/tmp/psychai_benchmark")

    parser.add_argument("--bench-llm", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--ollama-base-url", default=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"))
    parser.add_argument("--llm-models", nargs="+", default=["qwen2.5:3b-instruct", "phi3:mini"])
    parser.add_argument("--llm-runs", type=int, default=5)
    parser.add_argument("--llm-num-predict", type=int, default=512)
    parser.add_argument("--llm-prompt-repeat", type=int, default=40)
    parser.add_argument("--llm-temperature", type=float, default=0.1)

    parser.add_argument("--bench-whisper", action=argparse.BooleanOptionalAction, default=False)
    parser.add_argument("--whisper-audio", nargs="*", default=[])
    parser.add_argument("--whisper-runs", type=int, default=3)
    parser.add_argument("--whisper-executable", default=os.getenv("WHISPER_CPP_EXECUTABLE", "whisper-cli"))
    parser.add_argument("--whisper-model-path", default=os.getenv("WHISPER_CPP_MODEL_PATH", ""))
    parser.add_argument("--whisper-language", default=os.getenv("WHISPER_CPP_LANGUAGE", "it"))

    parser.add_argument("--bench-semantic-e2e", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--ai-service-url", default="http://127.0.0.1:8010")
    parser.add_argument("--semantic-profile", default="qwen")
    parser.add_argument("--semantic-patient-id", default="1")
    parser.add_argument("--semantic-top-k", type=int, default=5)
    parser.add_argument("--semantic-runs", type=int, default=5)
    parser.add_argument("--semantic-queries", nargs="*", default=DEFAULT_SEARCH_QUERIES)

    parser.add_argument("--bench-vector-search", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--vector-runs", type=int, default=20)
    parser.add_argument("--vector-dim", type=int, default=768)
    parser.add_argument("--vector-counts", nargs="+", type=int, default=[100, 500, 1000, 2500, 5000])
    parser.add_argument("--vector-top-k", type=int, default=5)
    return parser.parse_args()


def _benchmark_llm(args: argparse.Namespace) -> list[dict[str, Any]]:
    rows = []
    prompt = _build_llm_prompt(args.llm_prompt_repeat)
    for model in args.llm_models:
        _ollama_generate(
            base_url=args.ollama_base_url,
            model=model,
            prompt="Reply with one short sentence.",
            num_predict=16,
            temperature=args.llm_temperature,
        )
        for run in range(1, args.llm_runs + 1):
            started = time.perf_counter()
            response = _ollama_generate(
                base_url=args.ollama_base_url,
                model=model,
                prompt=prompt,
                num_predict=args.llm_num_predict,
                temperature=args.llm_temperature,
            )
            wall_seconds = time.perf_counter() - started
            eval_count = int(response.get("eval_count", 0) or 0)
            eval_seconds = _ns_to_s(response.get("eval_duration", 0))
            prompt_eval_count = int(response.get("prompt_eval_count", 0) or 0)
            prompt_eval_seconds = _ns_to_s(response.get("prompt_eval_duration", 0))
            rows.append(
                _row(
                    benchmark="llm_generate",
                    subject=model,
                    run=run,
                    wall_seconds=wall_seconds,
                    output_tokens=eval_count,
                    output_tokens_per_second=_rate(eval_count, eval_seconds),
                    prompt_tokens=prompt_eval_count,
                    prompt_tokens_per_second=_rate(prompt_eval_count, prompt_eval_seconds),
                    total_seconds=_ns_to_s(response.get("total_duration", 0)),
                    load_seconds=_ns_to_s(response.get("load_duration", 0)),
                )
            )
    return rows


def _benchmark_whisper(args: argparse.Namespace) -> list[dict[str, Any]]:
    if not args.whisper_audio:
        print("Skipping whisper benchmark: pass --whisper-audio /path/to/audio.wav", flush=True)
        return []
    if not args.whisper_model_path:
        print("Skipping whisper benchmark: WHISPER_CPP_MODEL_PATH is not set", flush=True)
        return []

    provider = WhisperCppSpeechToTextProvider(
        executable=args.whisper_executable,
        model_path=args.whisper_model_path,
        language=args.whisper_language,
    )
    rows = []
    for audio_path in args.whisper_audio:
        for run in range(1, args.whisper_runs + 1):
            started = time.perf_counter()
            transcript = provider.transcribe(audio_path)
            wall_seconds = time.perf_counter() - started
            audio_seconds = _transcript_audio_seconds(transcript.segments)
            rows.append(
                _row(
                    benchmark="whisper_cpp",
                    subject=Path(audio_path).name,
                    run=run,
                    wall_seconds=wall_seconds,
                    audio_seconds=audio_seconds,
                    realtime_factor=_rate(audio_seconds, wall_seconds),
                    transcript_chars=len(transcript.raw_text),
                    segment_count=len(transcript.segments),
                )
            )
    return rows


def _benchmark_semantic_e2e(args: argparse.Namespace) -> list[dict[str, Any]]:
    rows = []
    for query_index, query in enumerate(args.semantic_queries, start=1):
        for run in range(1, args.semantic_runs + 1):
            started = time.perf_counter()
            response = _post_json(
                f"{args.ai_service_url.rstrip('/')}/ai/v1/search/semantic",
                {
                    "model_profile": args.semantic_profile,
                    "patient_id": args.semantic_patient_id,
                    "query": query,
                    "top_k": args.semantic_top_k,
                },
            )
            wall_seconds = time.perf_counter() - started
            rows.append(
                _row(
                    benchmark="semantic_search_e2e",
                    subject=f"query_{query_index}",
                    run=run,
                    wall_seconds=wall_seconds,
                    query=query,
                    top_k=args.semantic_top_k,
                    result_count=len(response.get("results", [])),
                )
            )
    return rows


def _benchmark_vector_search(args: argparse.Namespace) -> list[dict[str, Any]]:
    rows = []
    for count in args.vector_counts:
        with tempfile.TemporaryDirectory(prefix="psychai_vector_bench_") as temp_dir:
            store = SQLiteVectorStore(str(Path(temp_dir) / "vectors.sqlite"))
            chunks, vectors = _synthetic_vectors(count=count, dim=args.vector_dim)
            store.upsert(chunks, vectors)
            query_vector = vectors[count // 2]

            for run in range(1, args.vector_runs + 1):
                started = time.perf_counter()
                results = store.search(
                    patient_id="bench_patient",
                    query_vector=query_vector,
                    top_k=args.vector_top_k,
                )
                wall_seconds = time.perf_counter() - started
                rows.append(
                    _row(
                        benchmark="vector_search_sqlite",
                        subject=f"{count}_chunks",
                        run=run,
                        wall_seconds=wall_seconds,
                        chunk_count=count,
                        vector_dim=args.vector_dim,
                        top_k=args.vector_top_k,
                        result_count=len(results),
                        chunks_per_second=_rate(count, wall_seconds),
                    )
                )
    return rows


def _build_llm_prompt(repeat: int) -> str:
    transcript = (
        "Therapist: What did you notice this week?\n"
        "Patient: I avoided one difficult conversation at work, then practiced a shorter "
        "message with less over-explaining. Anxiety rose at first and then settled.\n"
        "Therapist: What helped you stay with the practice?\n"
        "Patient: Naming the prediction and checking evidence made it feel less automatic.\n"
    )
    return f"{DEFAULT_LLM_PROMPT}\n\nTranscript:\n" + "\n".join(transcript for _ in range(repeat))


def _synthetic_vectors(*, count: int, dim: int) -> tuple[list[TextChunk], list[list[float]]]:
    chunks = []
    vectors = []
    for index in range(count):
        chunks.append(
            TextChunk(
                chunk_id=f"bench_chunk_{index:06d}",
                patient_id="bench_patient",
                source_id=f"source_{index // 5:06d}",
                text=f"Synthetic clinical chunk {index}",
                metadata={"benchmark": True},
            )
        )
        vectors.append([math.sin((index + 1) * (j + 1) * 0.001) for j in range(dim)])
    return chunks, vectors


def _ollama_generate(
    *,
    base_url: str,
    model: str,
    prompt: str,
    num_predict: int,
    temperature: float,
) -> dict[str, Any]:
    return _post_json(
        f"{base_url.rstrip('/')}/api/generate",
        {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "think": False,
            "options": {
                "temperature": temperature,
                "num_predict": num_predict,
            },
        },
        timeout_seconds=300.0,
    )


def _post_json(url: str, payload: dict[str, Any], timeout_seconds: float = 300.0) -> dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")
    req = request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with request.urlopen(req, timeout=timeout_seconds) as response:
        return json.loads(response.read().decode("utf-8"))


def _write_outputs(*, rows: list[dict[str, Any]], output_prefix: str) -> None:
    if not rows:
        print("No benchmark rows collected.", flush=True)
        return

    prefix = Path(output_prefix)
    prefix.parent.mkdir(parents=True, exist_ok=True)
    jsonl_path = prefix.with_suffix(".jsonl")
    csv_path = prefix.with_suffix(".csv")

    with jsonl_path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, sort_keys=True) + "\n")

    fieldnames = sorted({key for row in rows for key in row.keys()})
    with csv_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {csv_path}", flush=True)
    print(f"Wrote {jsonl_path}", flush=True)


def _print_rollup(rows: list[dict[str, Any]]) -> None:
    groups: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for row in rows:
        groups.setdefault((row["benchmark"], row["subject"]), []).append(row)

    print("\nRollup", flush=True)
    for (benchmark, subject), items in sorted(groups.items()):
        wall = [float(item["wall_seconds"]) for item in items]
        line = f"{benchmark} | {subject} | n={len(items)} | wall_median={statistics.median(wall):.4f}s"
        token_rates = [float(item.get("output_tokens_per_second") or 0) for item in items]
        token_rates = [value for value in token_rates if value > 0]
        if token_rates:
            line += f" | tok_s_median={statistics.median(token_rates):.2f}"
        rtf = [float(item.get("realtime_factor") or 0) for item in items]
        rtf = [value for value in rtf if value > 0]
        if rtf:
            line += f" | realtime_factor_median={statistics.median(rtf):.2f}x"
        cps = [float(item.get("chunks_per_second") or 0) for item in items]
        cps = [value for value in cps if value > 0]
        if cps:
            line += f" | chunks_s_median={statistics.median(cps):.0f}"
        print(line, flush=True)


def _row(*, benchmark: str, subject: str, run: int, wall_seconds: float, **extra: Any) -> dict[str, Any]:
    return {
        "benchmark": benchmark,
        "subject": subject,
        "run": run,
        "wall_seconds": wall_seconds,
        **extra,
    }


def _transcript_audio_seconds(segments: list[Any]) -> float:
    if not segments:
        return 0.0
    return max(float(segment.end_seconds) for segment in segments)


def _ns_to_s(value: Any) -> float:
    return float(value or 0) / 1_000_000_000


def _rate(count: float, seconds: float) -> float:
    if count <= 0 or seconds <= 0:
        return 0.0
    return count / seconds


if __name__ == "__main__":
    main()
