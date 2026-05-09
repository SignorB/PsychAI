from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any
from urllib import request

from .schemas import RAGAnswer


@dataclass(frozen=True)
class OllamaHTTPClient:
    base_url: str = "http://localhost:11434"
    timeout_seconds: float = 120.0

    def post_json(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        body = json.dumps(payload).encode("utf-8")
        req = request.Request(
            f"{self.base_url.rstrip('/')}{path}",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with request.urlopen(req, timeout=self.timeout_seconds) as response:
            return json.loads(response.read().decode("utf-8"))

    def get_json(self, path: str) -> dict[str, Any]:
        req = request.Request(
            f"{self.base_url.rstrip('/')}{path}",
            method="GET",
        )
        with request.urlopen(req, timeout=self.timeout_seconds) as response:
            return json.loads(response.read().decode("utf-8"))


class OllamaLLMProvider:
    def __init__(
        self,
        *,
        model: str,
        base_url: str = "http://localhost:11434",
        temperature: float = 0.1,
        top_p: float = 0.9,
        timeout_seconds: float = 120.0,
    ) -> None:
        self.model = model
        self.temperature = temperature
        self.top_p = top_p
        self.client = OllamaHTTPClient(base_url=base_url, timeout_seconds=timeout_seconds)

    def generate_json(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_schema: dict[str, Any] | None = None,
    ) -> dict:
        response = self.client.post_json(
            "/api/generate",
            {
                "model": self.model,
                "system": system_prompt,
                "prompt": user_prompt,
                "format": response_schema or "json",
                "stream": False,
                "think": False,
                "options": {
                    "temperature": self.temperature,
                    "top_p": self.top_p,
                },
            },
        )
        return _decode_json_response(response)

    def answer(self, *, system_prompt: str, user_prompt: str) -> RAGAnswer:
        payload = self.generate_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_schema=RAGAnswer.model_json_schema(),
        )
        return RAGAnswer.model_validate(payload)


class OllamaEmbeddingProvider:
    def __init__(
        self,
        *,
        model: str,
        base_url: str = "http://localhost:11434",
        timeout_seconds: float = 120.0,
    ) -> None:
        self.model = model
        self.client = OllamaHTTPClient(base_url=base_url, timeout_seconds=timeout_seconds)

    def embed(self, texts: list[str]) -> list[list[float]]:
        vectors = []
        for text in texts:
            response = self.client.post_json(
                "/api/embeddings",
                {
                    "model": self.model,
                    "prompt": text,
                },
            )
            vectors.append(response["embedding"])
        return vectors


def _decode_json_response(response: dict[str, Any]) -> dict:
    raw = response.get("response", "")
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Ollama did not return valid JSON: {raw}") from exc
    if not isinstance(payload, dict):
        raise ValueError(f"Ollama JSON response must be an object, got: {type(payload).__name__}")
    return payload
