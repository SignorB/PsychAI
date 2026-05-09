from __future__ import annotations

import os
from pathlib import Path
from urllib.error import URLError

from src.ai_models.chunking import chunk_text
from src.ai_models.factory import build_ollama_pipeline
from src.ai_models.ollama_provider import OllamaEmbeddingProvider, OllamaHTTPClient, OllamaLLMProvider
from src.ai_models.pipeline import _sanitize_clinical_note, _validate_rag_citations
from src.ai_models.profiles import build_model_profile, list_model_profiles
from src.ai_models.prompts import RAG_SYSTEM_PROMPT, build_rag_user_prompt
from src.ai_models.providers import SpeechToTextProvider
from src.ai_models.schemas import ClinicalSessionNote, RAGAnswer, RetrievedChunk, TextChunk, Transcript
from src.ai_models.vector_store import InMemoryVectorStore, SQLiteVectorStore
from src.ai_models.whisper_cpp_provider import WhisperCppError, WhisperCppSpeechToTextProvider

from .schemas import (
    ComposeIndexableTextRequest,
    ComposeIndexableTextResponse,
    ModelCheckResponse,
    ModelDescriptor,
    ModelsResponse,
    SourceType,
    TextSection,
)


class AIServiceError(RuntimeError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


class UnsupportedSpeechToTextProvider:
    def transcribe(self, audio_path: str) -> Transcript:
        raise AIServiceError(
            "TRANSCRIPTION_NOT_IMPLEMENTED",
            "Adapter whisper.cpp non ancora collegato al servizio AI.",
        )


def build_default_speech_to_text_provider() -> SpeechToTextProvider:
    executable = os.getenv("WHISPER_CPP_EXECUTABLE", "whisper-cli")
    model_path = os.getenv("WHISPER_CPP_MODEL_PATH")
    if not model_path:
        return UnsupportedSpeechToTextProvider()
    return WhisperCppSpeechToTextProvider(
        executable=executable,
        model_path=model_path,
        language=os.getenv("WHISPER_CPP_LANGUAGE", "it"),
    )


def build_default_vector_store():
    path = os.getenv("VECTOR_STORE_PATH")
    if path:
        return SQLiteVectorStore(path)
    return InMemoryVectorStore()


class AIServiceState:
    def __init__(
        self,
        *,
        base_url: str | None = None,
        speech_to_text: SpeechToTextProvider | None = None,
        vector_store: InMemoryVectorStore | None = None,
    ) -> None:
        self.base_url = base_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.speech_to_text = speech_to_text or build_default_speech_to_text_provider()
        self.vector_store = vector_store or build_default_vector_store()
        self._pipelines = {}

    def models(self) -> ModelsResponse:
        descriptors = []
        for profile in list_model_profiles():
            descriptors.append(
                ModelDescriptor(
                    name=profile.name,
                    llm=profile.config.llm.model,
                    embedding=profile.config.embeddings.model,
                    stt=f"whisper.cpp {profile.config.speech_to_text.model}",
                )
            )
        return ModelsResponse(default_profile="qwen", profiles=descriptors)

    def check_models(self, *, profile_name: str, require_stt: bool, require_embeddings: bool) -> ModelCheckResponse:
        profile = build_model_profile(profile_name, base_url=self.base_url)
        required = [profile.config.llm.model]
        if require_embeddings:
            required.append(profile.config.embeddings.model)
        if require_stt:
            required.append(f"whisper.cpp:{profile.config.speech_to_text.model}")

        available = self._available_ollama_models()
        missing = []
        for model in required:
            if model.startswith("whisper.cpp:"):
                if not self._is_whisper_available():
                    missing.append(model)
            elif model not in available:
                missing.append(model)
        return ModelCheckResponse(ok=not missing, missing=missing, available=sorted(available))

    def transcribe_audio(self, *, audio_path: str) -> Transcript:
        try:
            return self.speech_to_text.transcribe(audio_path)
        except WhisperCppError as exc:
            raise AIServiceError("TRANSCRIPTION_FAILED", str(exc)) from exc

    def create_session_note(
        self,
        *,
        profile_name: str,
        patient_id: str,
        session_id: str | None,
        transcript: Transcript,
        manual_notes: list[str],
    ) -> ClinicalSessionNote:
        normalized_transcript = transcript
        if manual_notes:
            manual_text = "\n".join(f"Nota manuale: {note}" for note in manual_notes)
            normalized_transcript = transcript.model_copy(
                update={"raw_text": f"{transcript.raw_text}\n\n{manual_text}"}
            )
        note = self._pipeline(profile_name).create_clinical_note(
            patient_id=patient_id,
            transcript=normalized_transcript,
        )
        return note.model_copy(update={"session_id": session_id})

    def validate_session_note(
        self,
        *,
        note: ClinicalSessionNote,
        transcript_text: str,
    ) -> ClinicalSessionNote:
        return _sanitize_clinical_note(note=note, transcript_text=transcript_text)

    def normalize_text(self, text: str) -> str:
        return " ".join(text.split())

    def chunk_source(
        self,
        *,
        patient_id: str,
        source_id: str,
        source_type: SourceType,
        text: str,
        chunk_size_chars: int,
        chunk_overlap_chars: int,
        metadata: dict,
    ) -> list[TextChunk]:
        chunks = chunk_text(
            patient_id=patient_id,
            source_id=source_id,
            text=text,
            chunk_size_chars=chunk_size_chars,
            overlap_chars=chunk_overlap_chars,
        )
        enriched = []
        for chunk in chunks:
            enriched_metadata = {
                **chunk.metadata,
                **metadata,
                "source_type": source_type.value,
            }
            enriched.append(chunk.model_copy(update={"metadata": enriched_metadata}))
        return enriched

    def embed_texts(self, *, profile_name: str, texts: list[str]) -> tuple[str, list[list[float]]]:
        profile = build_model_profile(profile_name, base_url=self.base_url)
        provider = OllamaEmbeddingProvider(
            model=profile.config.embeddings.model,
            base_url=profile.config.embeddings.base_url,
        )
        return profile.config.embeddings.model, provider.embed(texts)

    def upsert_vectors(self, *, chunks: list[TextChunk], vectors: list[list[float]]) -> None:
        if len(chunks) != len(vectors):
            raise AIServiceError("INVALID_SCHEMA", "chunks e vectors devono avere la stessa lunghezza.")
        self.vector_store.upsert(chunks, vectors)

    def index_source(
        self,
        *,
        profile_name: str,
        patient_id: str,
        source_id: str,
        source_type: SourceType,
        text: str,
        metadata: dict,
    ) -> list[str]:
        profile = build_model_profile(profile_name, base_url=self.base_url)
        chunks = self.chunk_source(
            patient_id=patient_id,
            source_id=source_id,
            source_type=source_type,
            text=text,
            chunk_size_chars=profile.config.rag.chunk_size_chars,
            chunk_overlap_chars=profile.config.rag.chunk_overlap_chars,
            metadata=metadata,
        )
        _, vectors = self.embed_texts(profile_name=profile_name, texts=[chunk.text for chunk in chunks])
        self.upsert_vectors(chunks=chunks, vectors=vectors)
        return [chunk.chunk_id for chunk in chunks]

    def semantic_search(
        self,
        *,
        profile_name: str,
        patient_id: str,
        query: str,
        top_k: int,
    ) -> list[RetrievedChunk]:
        _, vectors = self.embed_texts(profile_name=profile_name, texts=[query])
        return self.vector_store.search(patient_id=patient_id, query_vector=vectors[0], top_k=top_k)

    def answer_from_chunks(
        self,
        *,
        profile_name: str,
        question: str,
        retrieved_chunks: list[RetrievedChunk],
    ) -> RAGAnswer:
        profile = build_model_profile(profile_name, base_url=self.base_url)
        llm = OllamaLLMProvider(
            model=profile.config.llm.model,
            base_url=profile.config.llm.base_url,
            temperature=profile.config.llm.temperature,
            top_p=profile.config.llm.top_p,
        )
        valid_chunk_ids = {item.chunk.chunk_id for item in retrieved_chunks}
        context = "\n\n".join(
            f"[{item.chunk.chunk_id} | score={item.score:.3f}]\n{item.chunk.text}"
            for item in retrieved_chunks
        )
        answer = llm.answer(
            system_prompt=RAG_SYSTEM_PROMPT,
            user_prompt=build_rag_user_prompt(
                question=question,
                retrieved_context=context,
                citable_chunk_ids=sorted(valid_chunk_ids),
            ),
        )
        return _validate_rag_citations(answer=answer, valid_chunk_ids=valid_chunk_ids)

    def rag_query(
        self,
        *,
        profile_name: str,
        patient_id: str,
        question: str,
        top_k: int,
    ) -> tuple[RAGAnswer, list[str]]:
        retrieved = self.semantic_search(
            profile_name=profile_name,
            patient_id=patient_id,
            query=question,
            top_k=top_k,
        )
        answer = self.answer_from_chunks(
            profile_name=profile_name,
            question=question,
            retrieved_chunks=retrieved,
        )
        return answer, [item.chunk.chunk_id for item in retrieved]

    def compose_indexable_text(self, request: ComposeIndexableTextRequest) -> ComposeIndexableTextResponse:
        parts = [
            ("transcript", request.transcript_text),
            ("clinical_summary", request.clinical_summary),
            ("manual_notes", "\n".join(request.manual_notes)),
            ("closure_note", request.closure_note),
        ]
        text_parts = []
        sections = []
        cursor = 0
        for name, value in parts:
            normalized = value.strip()
            if not normalized:
                continue
            block = f"[{name}]\n{normalized}"
            start = cursor
            text_parts.append(block)
            cursor += len(block)
            sections.append(TextSection(name=name, start_char=start, end_char=cursor))
            cursor += 2
        return ComposeIndexableTextResponse(
            source_type=SourceType.closure_note,
            text="\n\n".join(text_parts),
            sections=sections,
        )

    def _pipeline(self, profile_name: str):
        if profile_name not in self._pipelines:
            self._pipelines[profile_name] = build_ollama_pipeline(
                profile_name=profile_name,
                base_url=self.base_url,
                speech_to_text=self.speech_to_text,
                vector_store=self.vector_store,
            )
        return self._pipelines[profile_name]

    def _available_ollama_models(self) -> set[str]:
        try:
            response = OllamaHTTPClient(base_url=self.base_url, timeout_seconds=5.0).get_json("/api/tags")
        except (OSError, URLError):
            return set()
        names = set()
        for item in response.get("models", []):
            name = item["name"]
            names.add(name)
            if name.endswith(":latest"):
                names.add(name.removesuffix(":latest"))
        return names

    def _is_whisper_available(self) -> bool:
        model_path = os.getenv("WHISPER_CPP_MODEL_PATH")
        return bool(model_path and Path(model_path).exists())
