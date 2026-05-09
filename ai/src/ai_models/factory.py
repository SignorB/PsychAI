from __future__ import annotations

from .ollama_provider import OllamaEmbeddingProvider, OllamaLLMProvider
from .pipeline import ClinicalAIPipeline
from .profiles import build_model_profile
from .providers import SpeechToTextProvider, VectorStore
from .vector_store import InMemoryVectorStore


def build_ollama_pipeline(
    *,
    profile_name: str,
    speech_to_text: SpeechToTextProvider,
    base_url: str = "http://localhost:11434",
    vector_store: VectorStore | None = None,
) -> ClinicalAIPipeline:
    profile = build_model_profile(profile_name, base_url=base_url)
    config = profile.config
    return ClinicalAIPipeline(
        config=config,
        speech_to_text=speech_to_text,
        llm=OllamaLLMProvider(
            model=config.llm.model,
            base_url=config.llm.base_url,
            temperature=config.llm.temperature,
            top_p=config.llm.top_p,
        ),
        embeddings=OllamaEmbeddingProvider(
            model=config.embeddings.model,
            base_url=config.embeddings.base_url,
        ),
        vector_store=vector_store or InMemoryVectorStore(),
    )
