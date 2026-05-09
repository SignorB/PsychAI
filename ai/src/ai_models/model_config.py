from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SpeechToTextConfig:
    provider: str = "whisper_cpp"
    model: str = "small"
    executable: str = "whisper-cli"
    language: str = "it"
    batch_mode: bool = True


@dataclass(frozen=True)
class LLMConfig:
    provider: str = "ollama"
    model: str = "llama3:8b-instruct-q4_K_M"
    base_url: str = "http://localhost:11434"
    temperature: float = 0.1
    top_p: float = 0.9
    json_mode: bool = True


@dataclass(frozen=True)
class EmbeddingConfig:
    provider: str = "ollama"
    model: str = "nomic-embed-text"
    base_url: str = "http://localhost:11434"


@dataclass(frozen=True)
class RAGConfig:
    chunk_size_chars: int = 1400
    chunk_overlap_chars: int = 180
    top_k: int = 5


@dataclass(frozen=True)
class AIModelConfig:
    speech_to_text: SpeechToTextConfig = SpeechToTextConfig()
    llm: LLMConfig = LLMConfig()
    embeddings: EmbeddingConfig = EmbeddingConfig()
    rag: RAGConfig = RAGConfig()
