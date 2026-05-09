from __future__ import annotations

from .chunking import chunk_text
from .model_config import AIModelConfig
from .prompts import (
    CLINICAL_NOTE_SYSTEM_PROMPT,
    RAG_SYSTEM_PROMPT,
    build_clinical_note_user_prompt,
    build_rag_user_prompt,
)
from .providers import EmbeddingProvider, LLMProvider, SpeechToTextProvider, VectorStore
from .schemas import ClinicalSessionNote, RAGAnswer, Transcript


class ClinicalAIPipeline:
    def __init__(
        self,
        *,
        config: AIModelConfig,
        speech_to_text: SpeechToTextProvider,
        llm: LLMProvider,
        embeddings: EmbeddingProvider,
        vector_store: VectorStore,
    ) -> None:
        self.config = config
        self.speech_to_text = speech_to_text
        self.llm = llm
        self.embeddings = embeddings
        self.vector_store = vector_store

    def transcribe_session(self, *, audio_path: str) -> Transcript:
        return self.speech_to_text.transcribe(audio_path)

    def create_clinical_note(
        self,
        *,
        patient_id: str,
        transcript: Transcript,
    ) -> ClinicalSessionNote:
        payload = self.llm.generate_json(
            system_prompt=CLINICAL_NOTE_SYSTEM_PROMPT,
            user_prompt=build_clinical_note_user_prompt(
                patient_id=patient_id,
                transcript_text=transcript.raw_text,
            ),
            response_schema=ClinicalSessionNote.model_json_schema(),
        )
        note = ClinicalSessionNote.model_validate(payload)
        return _sanitize_clinical_note(note=note, transcript_text=transcript.raw_text)

    def index_session_text(
        self,
        *,
        patient_id: str,
        source_id: str,
        text: str,
    ) -> None:
        chunks = chunk_text(
            patient_id=patient_id,
            source_id=source_id,
            text=text,
            chunk_size_chars=self.config.rag.chunk_size_chars,
            overlap_chars=self.config.rag.chunk_overlap_chars,
        )
        vectors = self.embeddings.embed([chunk.text for chunk in chunks])
        self.vector_store.upsert(chunks, vectors)

    def answer_patient_question(self, *, patient_id: str, question: str) -> RAGAnswer:
        query_vector = self.embeddings.embed([question])[0]
        retrieved = self.vector_store.search(
            patient_id=patient_id,
            query_vector=query_vector,
            top_k=self.config.rag.top_k,
        )
        valid_chunk_ids = {item.chunk.chunk_id for item in retrieved}
        context = "\n\n".join(
            f"[{item.chunk.chunk_id} | score={item.score:.3f}]\n{item.chunk.text}"
            for item in retrieved
        )
        answer = self.llm.answer(
            system_prompt=RAG_SYSTEM_PROMPT,
            user_prompt=build_rag_user_prompt(
                question=question,
                retrieved_context=context,
                citable_chunk_ids=sorted(valid_chunk_ids),
            ),
        )
        return _validate_rag_citations(answer=answer, valid_chunk_ids=valid_chunk_ids)


def _validate_rag_citations(*, answer: RAGAnswer, valid_chunk_ids: set[str]) -> RAGAnswer:
    valid_citations = [citation for citation in answer.citations if citation in valid_chunk_ids]
    invalid_citations = [citation for citation in answer.citations if citation not in valid_chunk_ids]
    if not invalid_citations:
        return answer

    uncertainties = list(answer.uncertainties)
    uncertainties.append(
        "Sono state scartate citazioni non presenti nei chunk recuperati: "
        + ", ".join(invalid_citations)
    )
    return answer.model_copy(update={"citations": valid_citations, "uncertainties": uncertainties})


def _sanitize_clinical_note(*, note: ClinicalSessionNote, transcript_text: str) -> ClinicalSessionNote:
    lower_transcript = transcript_text.lower()
    negated_suicidal_ideation = (
        "non emergono" in lower_transcript and "ideazione suicid" in lower_transcript
    ) or (
        "non sono stati" in lower_transcript and "ideazione suicid" in lower_transcript
    )
    if not negated_suicidal_ideation:
        return note

    recap = note.next_session_recap
    open_points = _remove_items_containing(recap.open_points, "ideazione suicid")
    suggested_followups = _remove_items_containing(recap.suggested_followups, "ideazione suicid")
    next_session_recap = recap.model_copy(
        update={
            "open_points": open_points,
            "suggested_followups": suggested_followups,
        }
    )
    return note.model_copy(update={"next_session_recap": next_session_recap})


def _remove_items_containing(items: list[str], needle: str) -> list[str]:
    return [item for item in items if needle not in item.lower()]
