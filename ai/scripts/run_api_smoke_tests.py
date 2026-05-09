from __future__ import annotations

import argparse
import json
import time
from dataclasses import dataclass
from typing import Any
from urllib import error, request


DEMO_TRANSCRIPT = (
    "La paziente riferisce difficolta a dormire da circa tre settimane. "
    "Dice che il lavoro e diventato piu pressante dopo un cambio di responsabile. "
    "Riporta pensieri ricorrenti la sera e tensione fisica alle spalle. "
    "Non emergono riferimenti a ideazione suicidaria. "
    "Vorrebbe riprendere una routine di camminate e monitorare il sonno prima della prossima seduta."
)


@dataclass
class CheckResult:
    name: str
    status: str
    elapsed_ms: float
    details: str = ""


class APIClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    def get(self, path: str) -> Any:
        with request.urlopen(f"{self.base_url}{path}", timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))

    def post(self, path: str, payload: dict[str, Any], *, timeout: int = 180) -> Any:
        body = json.dumps(payload).encode("utf-8")
        req = request.Request(
            f"{self.base_url}{path}",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with request.urlopen(req, timeout=timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            body_text = exc.read().decode("utf-8")
            raise RuntimeError(f"HTTP {exc.code}: {body_text}") from exc


def main() -> None:
    args = _parse_args()
    client = APIClient(args.base_url)
    results = [
        _run("health", lambda: _check_health(client)),
        _run("models", lambda: _check_models(client)),
        _run("models/check", lambda: _check_model_availability(client)),
        _run("transcriptions/normalize", lambda: _check_transcript_normalize(client)),
        _run("transcriptions/speakers", lambda: _check_speaker_assignment(client)),
        _run("annotations/normalize", lambda: _check_annotation_normalize(client)),
        _run("embeddings/chunks", lambda: _check_chunks(client)),
        _run("sessions/compose-indexable-text", lambda: _check_compose_indexable_text(client)),
        _run("session-notes/draft", lambda: _check_session_note_draft(client)),
        _run("embeddings", lambda: _check_embeddings(client)),
        _run("vector-index/index-source", lambda: _check_index_source(client)),
        _run("search/semantic", lambda: _check_semantic_search(client)),
        _run("rag/query", lambda: _check_rag_query(client)),
    ]
    if args.audio_path:
        results.append(_run("transcriptions", lambda: _check_transcription(client, args.audio_path)))

    _print_results(results)
    if any(result.status != "ok" for result in results):
        raise SystemExit(1)


def _run(name: str, fn) -> CheckResult:
    start = time.perf_counter()
    try:
        details = fn() or ""
        status = "ok"
    except Exception as exc:  # noqa: BLE001 - CLI smoke test reports any API failure.
        details = str(exc)
        status = "fail"
    return CheckResult(name=name, status=status, elapsed_ms=(time.perf_counter() - start) * 1000, details=details)


def _check_health(client: APIClient) -> str:
    payload = client.get("/ai/v1/health")
    assert payload["status"] == "ok"
    assert payload["offline_mode"] is True
    return "offline"


def _check_models(client: APIClient) -> str:
    payload = client.get("/ai/v1/models")
    assert payload["default_profile"] == "qwen"
    assert any(profile["name"] == "qwen" for profile in payload["profiles"])
    return ",".join(profile["name"] for profile in payload["profiles"])


def _check_model_availability(client: APIClient) -> str:
    payload = client.post(
        "/ai/v1/models/check",
        {"model_profile": "qwen", "require_stt": True, "require_embeddings": True},
        timeout=60,
    )
    assert payload["ok"] is True, payload
    return "available=" + ",".join(payload["available"])


def _check_transcript_normalize(client: APIClient) -> str:
    payload = client.post(
        "/ai/v1/transcriptions/normalize",
        {"transcript": {"raw_text": " testo   con   spazi ", "language": "it", "segments": []}},
    )
    assert payload["raw_text"] == "testo con spazi"
    return payload["raw_text"]


def _check_speaker_assignment(client: APIClient) -> str:
    payload = client.post(
        "/ai/v1/transcriptions/speakers",
        {
            "strategy": "multi_speaker_a_b",
            "transcript": {"raw_text": "A: buongiorno. B: buongiorno.", "language": "it", "segments": []},
        },
    )
    assert payload["metadata"]["speaker_strategy"] == "multi_speaker_a_b"
    return "strategy stored"


def _check_annotation_normalize(client: APIClient) -> str:
    payload = client.post(
        "/ai/v1/annotations/normalize",
        {"patient_id": "paziente_demo_001", "annotation_id": "annotazione_demo_001", "text": " nota   scritta "},
    )
    assert payload["normalized_text"] == "nota scritta"
    return payload["annotation_id"]


def _check_chunks(client: APIClient) -> str:
    payload = client.post(
        "/ai/v1/embeddings/chunks",
        {
            "patient_id": "paziente_demo_001",
            "source_id": "source_chunk_demo",
            "source_type": "clinical_summary",
            "text": "abcdefghij",
            "chunk_size_chars": 4,
            "chunk_overlap_chars": 1,
            "metadata": {"session_id": "sessione_demo_001"},
        },
    )
    assert [chunk["text"] for chunk in payload["chunks"]] == ["abcd", "defg", "ghij"]
    return f"chunks={len(payload['chunks'])}"


def _check_compose_indexable_text(client: APIClient) -> str:
    payload = client.post(
        "/ai/v1/sessions/compose-indexable-text",
        {
            "patient_id": "paziente_demo_001",
            "session_id": "sessione_demo_001",
            "transcript_text": "trascrizione",
            "clinical_summary": "summary",
            "manual_notes": ["nota manuale"],
            "closure_note": "chiusura",
        },
    )
    assert "[clinical_summary]" in payload["text"]
    assert payload["source_type"] == "closure_note"
    return f"sections={len(payload['sections'])}"


def _check_session_note_draft(client: APIClient) -> str:
    payload = client.post(
        "/ai/v1/session-notes/draft",
        {
            "model_profile": "qwen",
            "patient_id": "paziente_demo_001",
            "session_id": "sessione_demo_001",
            "transcript": {"raw_text": DEMO_TRANSCRIPT, "language": "it", "segments": []},
            "manual_notes": [],
            "retrieved_context": [],
        },
        timeout=240,
    )
    assert payload["patient_id"] == "paziente_demo_001"
    assert payload["structured_note"]
    return f"themes={len(payload['themes'])}, symptoms={len(payload['symptoms'])}"


def _check_embeddings(client: APIClient) -> str:
    payload = client.post(
        "/ai/v1/embeddings",
        {"model_profile": "qwen", "texts": ["La paziente riferisce difficolta a dormire."]},
        timeout=120,
    )
    assert payload["model"] == "nomic-embed-text"
    assert payload["vectors"]
    return f"dimensions={len(payload['vectors'][0])}"


def _check_index_source(client: APIClient) -> str:
    payload = client.post(
        "/ai/v1/vector-index/index-source",
        {
            "model_profile": "qwen",
            "patient_id": "paziente_demo_001",
            "source_id": "sessione_demo_001",
            "source_type": "clinical_summary",
            "text": DEMO_TRANSCRIPT,
            "metadata": {"session_id": "sessione_demo_001"},
        },
        timeout=120,
    )
    assert payload["indexed"] is True
    assert payload["chunk_ids"]
    return f"chunks={payload['chunk_count']}"


def _check_semantic_search(client: APIClient) -> str:
    payload = client.post(
        "/ai/v1/search/semantic",
        {"model_profile": "qwen", "patient_id": "paziente_demo_001", "query": "Cosa e emerso sul sonno?", "top_k": 5, "filters": {}},
        timeout=120,
    )
    assert payload["results"]
    return f"results={len(payload['results'])}"


def _check_rag_query(client: APIClient) -> str:
    payload = client.post(
        "/ai/v1/rag/query",
        {
            "model_profile": "qwen",
            "patient_id": "paziente_demo_001",
            "question": "Cosa e emerso sul sonno?",
            "top_k": 5,
            "filters": {},
        },
        timeout=240,
    )
    assert payload["answer"]
    return f"citations={len(payload['citations'])}"


def _check_transcription(client: APIClient, audio_path: str) -> str:
    payload = client.post(
        "/ai/v1/transcriptions",
        {
            "patient_id": "paziente_demo_001",
            "session_id": "sessione_audio_001",
            "audio_path": audio_path,
            "language": "en",
            "speaker_mode": "single_speaker",
            "model": "base",
        },
        timeout=240,
    )
    assert payload["raw_text"]
    return f"chars={len(payload['raw_text'])}"


def _print_results(results: list[CheckResult]) -> None:
    width = max(len(result.name) for result in results)
    for result in results:
        print(f"{result.status.upper():4}  {result.name:<{width}}  {result.elapsed_ms:8.1f} ms  {result.details}")


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run HTTP smoke tests against the AI service.")
    parser.add_argument("--base-url", default="http://127.0.0.1:8010")
    parser.add_argument("--audio-path", default="", help="Optional audio path visible inside ai-service, e.g. /data/audio/jfk.wav.")
    return parser.parse_args()


if __name__ == "__main__":
    main()
