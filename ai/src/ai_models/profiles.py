from __future__ import annotations

from dataclasses import dataclass

from .model_config import AIModelConfig, EmbeddingConfig, LLMConfig, RAGConfig, SpeechToTextConfig


@dataclass(frozen=True)
class ModelProfile:
    name: str
    description: str
    config: AIModelConfig


def build_model_profile(name: str, *, base_url: str = "http://localhost:11434") -> ModelProfile:
    profiles = {
        "qwen": ModelProfile(
            name="qwen",
            description="Profilo default leggero: Qwen 2.5 3B per JSON clinico e nomic embeddings.",
            config=AIModelConfig(
                speech_to_text=SpeechToTextConfig(model="base"),
                llm=LLMConfig(
                    model="qwen2.5:3b-instruct",
                    base_url=base_url,
                    temperature=0.1,
                    top_p=0.9,
                ),
                embeddings=EmbeddingConfig(
                    model="nomic-embed-text",
                    base_url=base_url,
                ),
                rag=RAGConfig(),
            ),
        ),
        "phi": ModelProfile(
            name="phi",
            description="Profilo alternativo leggero: Phi-3 Mini per parsing strutturato e nomic embeddings.",
            config=AIModelConfig(
                speech_to_text=SpeechToTextConfig(model="base"),
                llm=LLMConfig(
                    model="phi3:mini",
                    base_url=base_url,
                    temperature=0.1,
                    top_p=0.9,
                ),
                embeddings=EmbeddingConfig(
                    model="nomic-embed-text",
                    base_url=base_url,
                ),
                rag=RAGConfig(),
            ),
        ),
    }
    try:
        return profiles[name]
    except KeyError as exc:
        valid = ", ".join(sorted(profiles))
        raise ValueError(f"Unknown model profile '{name}'. Valid profiles: {valid}") from exc


def list_model_profiles() -> list[ModelProfile]:
    return [build_model_profile("qwen"), build_model_profile("phi")]
