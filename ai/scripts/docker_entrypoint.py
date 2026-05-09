from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path
from urllib import error, request


OLLAMA_MODELS = [
    model.strip()
    for model in os.getenv(
        "BOOTSTRAP_OLLAMA_MODELS",
        "qwen2.5:3b-instruct,phi3:mini,nomic-embed-text",
    ).split(",")
    if model.strip()
]


def main() -> None:
    if _enabled("BOOTSTRAP_OLLAMA", default=True):
        _wait_for_ollama()
        for model in OLLAMA_MODELS:
            _pull_ollama_model(model)

    if _enabled("BOOTSTRAP_WHISPER_MODEL", default=True):
        _ensure_whisper_model()

    command = sys.argv[1:] or [
        "python",
        "scripts/run_ai_service.py",
        "--host",
        "0.0.0.0",
        "--port",
        "8010",
    ]
    os.execvp(command[0], command)


def _enabled(name: str, *, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def _wait_for_ollama() -> None:
    base_url = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434").rstrip("/")
    timeout_seconds = int(os.getenv("BOOTSTRAP_OLLAMA_TIMEOUT_SECONDS", "300"))
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        try:
            with request.urlopen(f"{base_url}/api/tags", timeout=5) as response:
                if response.status == 200:
                    return
        except OSError:
            time.sleep(2)
    raise RuntimeError(f"Ollama not reachable at {base_url} after {timeout_seconds}s")


def _pull_ollama_model(model: str) -> None:
    if _ollama_has_model(model):
        print(f"[bootstrap] Ollama model already present: {model}", flush=True)
        return

    print(f"[bootstrap] Pulling Ollama model: {model}", flush=True)
    base_url = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434").rstrip("/")
    payload = json.dumps({"name": model, "stream": False}).encode("utf-8")
    req = request.Request(
        f"{base_url}/api/pull",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with request.urlopen(req, timeout=int(os.getenv("BOOTSTRAP_MODEL_PULL_TIMEOUT_SECONDS", "1800"))) as response:
        body = response.read().decode("utf-8")
        if response.status >= 400:
            raise RuntimeError(f"Failed to pull {model}: {body}")


def _ollama_has_model(model: str) -> bool:
    base_url = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434").rstrip("/")
    try:
        with request.urlopen(f"{base_url}/api/tags", timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (OSError, json.JSONDecodeError):
        return False
    names = set()
    for item in payload.get("models", []):
        name = item.get("name", "")
        names.add(name)
        if name.endswith(":latest"):
            names.add(name.removesuffix(":latest"))
    return model in names


def _ensure_whisper_model() -> None:
    model_path = Path(os.getenv("WHISPER_CPP_MODEL_PATH", "/models/whisper/ggml-base.bin"))
    if model_path.exists():
        print(f"[bootstrap] Whisper model already present: {model_path}", flush=True)
        return

    model_path.parent.mkdir(parents=True, exist_ok=True)
    model_name = os.getenv("WHISPER_CPP_MODEL_NAME", "base")
    script = Path("/opt/whisper.cpp/models/download-ggml-model.sh")
    if not script.exists():
        raise RuntimeError(f"Whisper model download script not found: {script}")

    print(f"[bootstrap] Downloading whisper.cpp model: {model_name}", flush=True)
    subprocess.run(
        ["sh", str(script), model_name, str(model_path.parent)],
        check=True,
        timeout=int(os.getenv("BOOTSTRAP_WHISPER_TIMEOUT_SECONDS", "900")),
    )


if __name__ == "__main__":
    main()
