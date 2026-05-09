from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

from src.ai_models.schemas import ClinicalSessionNote, RAGAnswer, RetrievedChunk, TextChunk, Transcript


class SourceType(str, Enum):
    session_transcript = "session_transcript"
    clinical_summary = "clinical_summary"
    voice_annotation = "voice_annotation"
    written_annotation = "written_annotation"
    manual_clinical_note = "manual_clinical_note"
    closure_note = "closure_note"


class HealthResponse(BaseModel):
    status: str = "ok"
    offline_mode: bool = True


class ModelDescriptor(BaseModel):
    name: str
    llm: str
    embedding: str
    stt: str


class ModelsResponse(BaseModel):
    default_profile: str
    profiles: list[ModelDescriptor]


class ModelCheckRequest(BaseModel):
    model_profile: str = "qwen"
    require_stt: bool = False
    require_embeddings: bool = True


class ModelCheckResponse(BaseModel):
    ok: bool
    missing: list[str] = Field(default_factory=list)
    available: list[str] = Field(default_factory=list)


class TranscriptionRequest(BaseModel):
    patient_id: str
    session_id: str | None = None
    audio_path: str
    language: str = "it"
    speaker_mode: str = "single_speaker"
    model: str = "base"


class TranscriptionResponse(BaseModel):
    transcript_id: str | None = None
    patient_id: str
    session_id: str | None = None
    raw_text: str
    language: str = "it"
    segments: list[dict[str, Any]] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class NormalizeTranscriptRequest(BaseModel):
    transcript: Transcript


class SpeakerAssignmentRequest(BaseModel):
    strategy: str
    transcript: Transcript


class SpeakerAssignmentResponse(Transcript):
    uncertainties: list[str] = Field(default_factory=list)


class SessionNoteDraftRequest(BaseModel):
    model_profile: str = "qwen"
    patient_id: str
    session_id: str | None = None
    transcript: Transcript
    manual_notes: list[str] = Field(default_factory=list)
    retrieved_context: list[RetrievedChunk] = Field(default_factory=list)


class ValidateSessionNoteRequest(BaseModel):
    patient_id: str
    session_id: str | None = None
    transcript_text: str
    clinical_note: ClinicalSessionNote


class ValidateSessionNoteResponse(BaseModel):
    valid: bool
    clinical_note: ClinicalSessionNote
    warnings: list[str] = Field(default_factory=list)


class AudioAnnotationTranscriptionRequest(BaseModel):
    patient_id: str
    annotation_id: str
    audio_path: str
    language: str = "it"


class AudioAnnotationTranscriptionResponse(BaseModel):
    annotation_id: str
    transcript: Transcript


class NormalizeAnnotationRequest(BaseModel):
    patient_id: str
    annotation_id: str
    text: str


class NormalizeAnnotationResponse(BaseModel):
    annotation_id: str
    normalized_text: str
    warnings: list[str] = Field(default_factory=list)


class ChunkTextRequest(BaseModel):
    patient_id: str
    source_id: str
    source_type: SourceType
    text: str
    chunk_size_chars: int = 1400
    chunk_overlap_chars: int = 180
    metadata: dict[str, Any] = Field(default_factory=dict)


class ChunkTextResponse(BaseModel):
    chunks: list[TextChunk]


class EmbeddingRequest(BaseModel):
    model_profile: str = "qwen"
    texts: list[str]


class EmbeddingResponse(BaseModel):
    model: str
    vectors: list[list[float]]


class VectorUpsertRequest(BaseModel):
    patient_id: str
    source_id: str
    source_type: SourceType
    chunks: list[TextChunk]
    vectors: list[list[float]]


class VectorUpsertResponse(BaseModel):
    indexed: bool
    source_id: str
    chunk_count: int


class IndexSourceRequest(BaseModel):
    model_profile: str = "qwen"
    patient_id: str
    source_id: str
    source_type: SourceType
    text: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class IndexSourceResponse(BaseModel):
    indexed: bool
    source_id: str
    chunk_count: int
    chunk_ids: list[str]


class SemanticSearchRequest(BaseModel):
    model_profile: str = "qwen"
    patient_id: str
    query: str
    top_k: int = 5
    filters: dict[str, Any] = Field(default_factory=dict)


class SemanticSearchResponse(BaseModel):
    results: list[RetrievedChunk]


class RAGAnswerRequest(BaseModel):
    model_profile: str = "qwen"
    patient_id: str
    question: str
    retrieved_chunks: list[RetrievedChunk]


class RAGQueryRequest(BaseModel):
    model_profile: str = "qwen"
    patient_id: str
    question: str
    top_k: int = 5
    filters: dict[str, Any] = Field(default_factory=dict)


class RAGQueryResponse(RAGAnswer):
    retrieved_chunk_ids: list[str] = Field(default_factory=list)


class ComposeIndexableTextRequest(BaseModel):
    patient_id: str
    session_id: str
    transcript_text: str = ""
    clinical_summary: str = ""
    manual_notes: list[str] = Field(default_factory=list)
    closure_note: str = ""


class TextSection(BaseModel):
    name: str
    start_char: int
    end_char: int


class ComposeIndexableTextResponse(BaseModel):
    source_type: SourceType = SourceType.closure_note
    text: str
    sections: list[TextSection]


class ErrorEnvelope(BaseModel):
    error: dict[str, Any]
