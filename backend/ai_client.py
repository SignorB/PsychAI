import os
import json
from typing import Any
from urllib import error, request


AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://127.0.0.1:8010").rstrip("/")


class AIServiceClientError(RuntimeError):
    pass


def ai_health() -> dict[str, Any]:
    return _get("/ai/v1/health")


def transcribe_audio(
    *,
    patient_id: int,
    session_id: int,
    audio_path: str,
    language: str = "it",
) -> dict[str, Any]:
    return _post(
        "/ai/v1/transcriptions",
        {
            "patient_id": str(patient_id),
            "session_id": str(session_id),
            "audio_path": audio_path,
            "language": language,
            "speaker_mode": "single_speaker",
            "model": "base",
        },
        timeout=600,
    )


def draft_session_note(
    *,
    patient_id: int,
    session_id: int,
    transcript_text: str,
    manual_notes: list[str] | None = None,
    model_profile: str = "qwen",
) -> dict[str, Any]:
    return _post(
        "/ai/v1/session-notes/draft",
        {
            "model_profile": model_profile,
            "patient_id": str(patient_id),
            "session_id": str(session_id),
            "transcript": {
                "raw_text": transcript_text,
                "language": "it",
                "segments": [],
            },
            "manual_notes": manual_notes or [],
            "retrieved_context": [],
        },
        timeout=240,
    )


def index_patient_source(
    *,
    patient_id: int,
    source_id: str,
    source_type: str,
    text: str,
    session_id: int | None = None,
    metadata: dict[str, Any] | None = None,
    model_profile: str = "qwen",
) -> dict[str, Any]:
    metadata = dict(metadata or {})
    if session_id is not None:
        metadata["session_id"] = str(session_id)
    return _post(
        "/ai/v1/vector-index/index-source",
        {
            "model_profile": model_profile,
            "patient_id": str(patient_id),
            "source_id": source_id,
            "source_type": source_type,
            "text": text,
            "metadata": metadata,
        },
        timeout=120,
    )


def semantic_search(
    *,
    patient_id: int,
    query: str,
    model_profile: str = "qwen",
    top_k: int = 5,
) -> dict[str, Any]:
    return _post(
        "/ai/v1/search/semantic",
        {
            "model_profile": model_profile,
            "patient_id": str(patient_id),
            "query": query,
            "top_k": top_k,
            "filters": {},
        },
        timeout=120,
    )


def ask_patient(
    *,
    patient_id: int,
    question: str,
    model_profile: str = "qwen",
    top_k: int = 5,
) -> dict[str, Any]:
    return _post(
        "/ai/v1/rag/query",
        {
            "model_profile": model_profile,
            "patient_id": str(patient_id),
            "question": question,
            "top_k": top_k,
            "filters": {},
        },
        timeout=240,
    )


def _get(path: str) -> dict[str, Any]:
    try:
        with request.urlopen(f"{AI_SERVICE_URL}{path}", timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except (OSError, error.HTTPError, json.JSONDecodeError) as exc:
        raise AIServiceClientError(f"AI service GET {path} failed: {exc}") from exc


def _post(path: str, payload: dict[str, Any], *, timeout: int) -> dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")
    req = request.Request(
        f"{AI_SERVICE_URL}{path}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8")
        raise AIServiceClientError(f"AI service POST {path} failed: HTTP {exc.code} response={detail}") from exc
    except (OSError, json.JSONDecodeError) as exc:
        raise AIServiceClientError(f"AI service POST {path} failed: {exc}") from exc
