from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class ConfidenceLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class TranscriptSegment(BaseModel):
    start_seconds: float = Field(ge=0)
    end_seconds: float = Field(ge=0)
    text: str
    speaker_label: str | None = None


class Transcript(BaseModel):
    raw_text: str
    language: str = "it"
    segments: list[TranscriptSegment] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ClinicalTheme(BaseModel):
    title: str
    evidence: list[str] = Field(default_factory=list)


class SymptomObservation(BaseModel):
    name: str
    reported_by_patient: bool = True
    evidence: list[str] = Field(default_factory=list)
    confidence: ConfidenceLevel = ConfidenceLevel.medium


class NextSessionRecap(BaseModel):
    open_points: list[str] = Field(default_factory=list)
    suggested_followups: list[str] = Field(default_factory=list)
    patient_words_to_revisit: list[str] = Field(default_factory=list)


class ClinicalSessionNote(BaseModel):
    patient_id: str
    session_id: str | None = None
    themes: list[ClinicalTheme] = Field(default_factory=list)
    symptoms: list[SymptomObservation] = Field(default_factory=list)
    structured_note: str
    next_session_recap: NextSessionRecap = Field(default_factory=NextSessionRecap)
    uncertainties: list[str] = Field(default_factory=list)
    safety_flags: list[str] = Field(default_factory=list)
    source_transcript_excerpt: list[str] = Field(default_factory=list)


class TextChunk(BaseModel):
    chunk_id: str
    patient_id: str
    source_id: str
    text: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class RetrievedChunk(BaseModel):
    chunk: TextChunk
    score: float


class RAGAnswer(BaseModel):
    answer: str
    citations: list[str] = Field(default_factory=list)
    uncertainties: list[str] = Field(default_factory=list)
