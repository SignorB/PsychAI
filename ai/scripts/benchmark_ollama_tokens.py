from __future__ import annotations

import argparse
import json
import statistics
import time
from dataclasses import dataclass
from typing import Any
from urllib import request


DEFAULT_PROMPT = (
    "Write a concise clinical session summary in English. Include presenting themes, "
    "interventions used, patient response, risks, and next-session plan. Use structured "
    "paragraphs and do not invent details."
)


@dataclass(frozen=True)
class RunMetrics:
    model: str
    run: int
    wall_seconds: float
    total_seconds: float
    load_seconds: float
    prompt_eval_count: int
    prompt_eval_seconds: float
    eval_count: int
    eval_seconds: float

    @property
    def prompt_tokens_per_second(self) -> float:
        return _rate(self.prompt_eval_count, self.prompt_eval_seconds)

    @property
    def generation_tokens_per_second(self) -> float:
        return _rate(self.eval_count, self.eval_seconds)


def main() -> None:
    args = _parse_args()
    prompt = _build_prompt(args.prompt, args.prompt_repeat)
    all_metrics: list[RunMetrics] = []

    for model in args.models:
        print(f"\nModel: {model}", flush=True)
        if args.warmup:
            _generate(
                base_url=args.base_url,
                model=model,
                prompt="Reply with one short sentence.",
                num_predict=16,
                temperature=args.temperature,
                timeout_seconds=args.timeout,
            )

        model_metrics = []
        for index in range(1, args.runs + 1):
            started = time.perf_counter()
            response = _generate(
                base_url=args.base_url,
                model=model,
                prompt=prompt,
                num_predict=args.num_predict,
                temperature=args.temperature,
                timeout_seconds=args.timeout,
            )
            wall_seconds = time.perf_counter() - started
            metrics = _metrics_from_response(
                model=model,
                run=index,
                response=response,
                wall_seconds=wall_seconds,
            )
            model_metrics.append(metrics)
            all_metrics.append(metrics)
            print(
                "run={run} output_tokens={tokens} gen_tok_s={gen:.2f} "
                "prompt_tokens={prompt_tokens} prompt_tok_s={prompt_rate:.2f} "
                "total_s={total:.2f} wall_s={wall:.2f}".format(
                    run=metrics.run,
                    tokens=metrics.eval_count,
                    gen=metrics.generation_tokens_per_second,
                    prompt_tokens=metrics.prompt_eval_count,
                    prompt_rate=metrics.prompt_tokens_per_second,
                    total=metrics.total_seconds,
                    wall=metrics.wall_seconds,
                ),
                flush=True,
            )

        _print_summary(model_metrics)

    if args.json:
        print(
            json.dumps(
                [
                    {
                        "model": item.model,
                        "run": item.run,
                        "wall_seconds": item.wall_seconds,
                        "total_seconds": item.total_seconds,
                        "load_seconds": item.load_seconds,
                        "prompt_eval_count": item.prompt_eval_count,
                        "prompt_eval_seconds": item.prompt_eval_seconds,
                        "prompt_tokens_per_second": item.prompt_tokens_per_second,
                        "eval_count": item.eval_count,
                        "eval_seconds": item.eval_seconds,
                        "generation_tokens_per_second": item.generation_tokens_per_second,
                    }
                    for item in all_metrics
                ],
                indent=2,
            )
        )


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Benchmark Ollama generation throughput.")
    parser.add_argument("--base-url", default="http://localhost:11434")
    parser.add_argument("--models", nargs="+", default=["qwen2.5:3b-instruct", "phi3:mini"])
    parser.add_argument("--runs", type=int, default=3)
    parser.add_argument("--warmup", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--num-predict", type=int, default=256)
    parser.add_argument("--temperature", type=float, default=0.1)
    parser.add_argument("--timeout", type=float, default=300.0)
    parser.add_argument("--prompt", default=DEFAULT_PROMPT)
    parser.add_argument("--prompt-repeat", type=int, default=8)
    parser.add_argument("--json", action="store_true")
    return parser.parse_args()


def _build_prompt(prompt: str, repeat: int) -> str:
    transcript = (
        "Therapist: What did you notice this week?\n"
        "Patient: I avoided one difficult conversation at work, then practiced a shorter "
        "message with less over-explaining. Anxiety rose at first and then settled.\n"
        "Therapist: What helped you stay with the practice?\n"
        "Patient: Naming the prediction and checking evidence made it feel less automatic.\n"
    )
    return f"{prompt}\n\nTranscript:\n" + "\n".join(transcript for _ in range(repeat))


def _generate(
    *,
    base_url: str,
    model: str,
    prompt: str,
    num_predict: int,
    temperature: float,
    timeout_seconds: float,
) -> dict[str, Any]:
    body = json.dumps(
        {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "think": False,
            "options": {
                "temperature": temperature,
                "num_predict": num_predict,
            },
        }
    ).encode("utf-8")
    req = request.Request(
        f"{base_url.rstrip('/')}/api/generate",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with request.urlopen(req, timeout=timeout_seconds) as response:
        return json.loads(response.read().decode("utf-8"))


def _metrics_from_response(
    *,
    model: str,
    run: int,
    response: dict[str, Any],
    wall_seconds: float,
) -> RunMetrics:
    return RunMetrics(
        model=model,
        run=run,
        wall_seconds=wall_seconds,
        total_seconds=_ns_to_s(response.get("total_duration", 0)),
        load_seconds=_ns_to_s(response.get("load_duration", 0)),
        prompt_eval_count=int(response.get("prompt_eval_count", 0) or 0),
        prompt_eval_seconds=_ns_to_s(response.get("prompt_eval_duration", 0)),
        eval_count=int(response.get("eval_count", 0) or 0),
        eval_seconds=_ns_to_s(response.get("eval_duration", 0)),
    )


def _print_summary(metrics: list[RunMetrics]) -> None:
    rates = [item.generation_tokens_per_second for item in metrics if item.eval_count]
    prompt_rates = [item.prompt_tokens_per_second for item in metrics if item.prompt_eval_count]
    if not rates:
        print("No generation metrics returned by Ollama.", flush=True)
        return
    print(
        "summary gen_tok_s avg={avg:.2f} median={median:.2f} min={min_rate:.2f} max={max_rate:.2f}".format(
            avg=statistics.mean(rates),
            median=statistics.median(rates),
            min_rate=min(rates),
            max_rate=max(rates),
        ),
        flush=True,
    )
    if prompt_rates:
        print(
            "summary prompt_tok_s avg={avg:.2f} median={median:.2f}".format(
                avg=statistics.mean(prompt_rates),
                median=statistics.median(prompt_rates),
            ),
            flush=True,
        )


def _ns_to_s(value: Any) -> float:
    return float(value or 0) / 1_000_000_000


def _rate(count: int, seconds: float) -> float:
    if count <= 0 or seconds <= 0:
        return 0.0
    return count / seconds


if __name__ == "__main__":
    main()
