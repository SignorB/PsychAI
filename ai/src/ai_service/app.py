from __future__ import annotations

from fastapi import Depends, FastAPI
from fastapi.responses import JSONResponse

from src.ai_models.schemas import ClinicalSessionNote, RAGAnswer, Transcript

from .schemas import (
    AudioAnnotationTranscriptionRequest,
    AudioAnnotationTranscriptionResponse,
    ChunkTextRequest,
    ChunkTextResponse,
    ComposeIndexableTextRequest,
    ComposeIndexableTextResponse,
    EmbeddingRequest,
    EmbeddingResponse,
    HealthResponse,
    IndexSourceRequest,
    IndexSourceResponse,
    ModelCheckRequest,
    ModelCheckResponse,
    ModelsResponse,
    NormalizeAnnotationRequest,
    NormalizeAnnotationResponse,
    NormalizeTranscriptRequest,
    RAGAnswerRequest,
    RAGQueryRequest,
    RAGQueryResponse,
    SemanticSearchRequest,
    SemanticSearchResponse,
    SessionNoteDraftRequest,
    SpeakerAssignmentRequest,
    SpeakerAssignmentResponse,
    TranscriptionRequest,
    TranscriptionResponse,
    ValidateSessionNoteRequest,
    ValidateSessionNoteResponse,
    VectorUpsertRequest,
    VectorUpsertResponse,
)
from .state import AIServiceError, AIServiceState


def create_app(state: AIServiceState | None = None) -> FastAPI:
    app = FastAPI(
        title="Offline Clinical AI Service",
        version="0.1.0",
        description="Servizio AI locale chiamato dal backend applicativo.",
    )
    app.state.ai_service = state or AIServiceState()

    def get_state() -> AIServiceState:
        return app.state.ai_service

    @app.exception_handler(AIServiceError)
    async def ai_service_error_handler(_, exc: AIServiceError):
        status_code = 501 if exc.code == "TRANSCRIPTION_NOT_IMPLEMENTED" else 400
        return JSONResponse(
            status_code=status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": {},
                }
            },
        )

    @app.get("/ai/v1/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse()

    @app.get("/ai/v1/models", response_model=ModelsResponse)
    def models(service: AIServiceState = Depends(get_state)) -> ModelsResponse:
        return service.models()

    @app.post("/ai/v1/models/check", response_model=ModelCheckResponse)
    def check_models(
        request: ModelCheckRequest,
        service: AIServiceState = Depends(get_state),
    ) -> ModelCheckResponse:
        return service.check_models(
            profile_name=request.model_profile,
            require_stt=request.require_stt,
            require_embeddings=request.require_embeddings,
        )

    @app.post("/ai/v1/transcriptions", response_model=TranscriptionResponse)
    def transcribe(
        request: TranscriptionRequest,
        service: AIServiceState = Depends(get_state),
    ) -> TranscriptionResponse:
        transcript = service.transcribe_audio(audio_path=request.audio_path)
        return TranscriptionResponse(
            patient_id=request.patient_id,
            session_id=request.session_id,
            raw_text=transcript.raw_text,
            language=transcript.language,
            segments=[segment.model_dump() for segment in transcript.segments],
            metadata=transcript.metadata,
        )

    @app.post("/ai/v1/transcriptions/normalize", response_model=Transcript)
    def normalize_transcript(request: NormalizeTranscriptRequest) -> Transcript:
        normalized_text = " ".join(request.transcript.raw_text.split())
        return request.transcript.model_copy(update={"raw_text": normalized_text})

    @app.post("/ai/v1/transcriptions/speakers", response_model=SpeakerAssignmentResponse)
    def assign_speakers(request: SpeakerAssignmentRequest) -> SpeakerAssignmentResponse:
        transcript = request.transcript
        uncertainties = []
        if request.strategy not in {"single_speaker", "multi_speaker_unknown", "multi_speaker_a_b"}:
            uncertainties.append(f"Strategia speaker non supportata: {request.strategy}")
        return SpeakerAssignmentResponse(
            raw_text=transcript.raw_text,
            language=transcript.language,
            segments=transcript.segments,
            generated_at=transcript.generated_at,
            metadata={**transcript.metadata, "speaker_strategy": request.strategy},
            uncertainties=uncertainties,
        )

    @app.post("/ai/v1/session-notes/draft", response_model=ClinicalSessionNote, response_model_exclude_none=True)
    def create_session_note_draft(
        request: SessionNoteDraftRequest,
        service: AIServiceState = Depends(get_state),
    ):
        return service.create_session_note(
            profile_name=request.model_profile,
            patient_id=request.patient_id,
            session_id=request.session_id,
            transcript=request.transcript,
            manual_notes=request.manual_notes,
        )

    @app.post("/ai/v1/session-notes/validate", response_model=ValidateSessionNoteResponse)
    def validate_session_note(
        request: ValidateSessionNoteRequest,
        service: AIServiceState = Depends(get_state),
    ) -> ValidateSessionNoteResponse:
        note = service.validate_session_note(
            note=request.clinical_note,
            transcript_text=request.transcript_text,
        )
        return ValidateSessionNoteResponse(valid=True, clinical_note=note, warnings=[])

    @app.post("/ai/v1/annotations/audio/transcribe", response_model=AudioAnnotationTranscriptionResponse)
    def transcribe_audio_annotation(
        request: AudioAnnotationTranscriptionRequest,
        service: AIServiceState = Depends(get_state),
    ) -> AudioAnnotationTranscriptionResponse:
        transcript = service.transcribe_audio(audio_path=request.audio_path)
        return AudioAnnotationTranscriptionResponse(
            annotation_id=request.annotation_id,
            transcript=transcript,
        )

    @app.post("/ai/v1/annotations/normalize", response_model=NormalizeAnnotationResponse)
    def normalize_annotation(
        request: NormalizeAnnotationRequest,
        service: AIServiceState = Depends(get_state),
    ) -> NormalizeAnnotationResponse:
        return NormalizeAnnotationResponse(
            annotation_id=request.annotation_id,
            normalized_text=service.normalize_text(request.text),
            warnings=[],
        )

    @app.post("/ai/v1/embeddings/chunks", response_model=ChunkTextResponse)
    def create_chunks(
        request: ChunkTextRequest,
        service: AIServiceState = Depends(get_state),
    ) -> ChunkTextResponse:
        chunks = service.chunk_source(
            patient_id=request.patient_id,
            source_id=request.source_id,
            source_type=request.source_type,
            text=request.text,
            chunk_size_chars=request.chunk_size_chars,
            chunk_overlap_chars=request.chunk_overlap_chars,
            metadata=request.metadata,
        )
        return ChunkTextResponse(chunks=chunks)

    @app.post("/ai/v1/embeddings", response_model=EmbeddingResponse)
    def create_embeddings(
        request: EmbeddingRequest,
        service: AIServiceState = Depends(get_state),
    ) -> EmbeddingResponse:
        model, vectors = service.embed_texts(profile_name=request.model_profile, texts=request.texts)
        return EmbeddingResponse(model=model, vectors=vectors)

    @app.post("/ai/v1/vector-index/upsert", response_model=VectorUpsertResponse)
    def upsert_vectors(
        request: VectorUpsertRequest,
        service: AIServiceState = Depends(get_state),
    ) -> VectorUpsertResponse:
        service.upsert_vectors(chunks=request.chunks, vectors=request.vectors)
        return VectorUpsertResponse(
            indexed=True,
            source_id=request.source_id,
            chunk_count=len(request.chunks),
        )

    @app.post("/ai/v1/vector-index/index-source", response_model=IndexSourceResponse)
    def index_source(
        request: IndexSourceRequest,
        service: AIServiceState = Depends(get_state),
    ) -> IndexSourceResponse:
        chunk_ids = service.index_source(
            profile_name=request.model_profile,
            patient_id=request.patient_id,
            source_id=request.source_id,
            source_type=request.source_type,
            text=request.text,
            metadata=request.metadata,
        )
        return IndexSourceResponse(
            indexed=True,
            source_id=request.source_id,
            chunk_count=len(chunk_ids),
            chunk_ids=chunk_ids,
        )

    @app.post("/ai/v1/search/semantic", response_model=SemanticSearchResponse)
    def semantic_search(
        request: SemanticSearchRequest,
        service: AIServiceState = Depends(get_state),
    ) -> SemanticSearchResponse:
        results = service.semantic_search(
            profile_name=request.model_profile,
            patient_id=request.patient_id,
            query=request.query,
            top_k=request.top_k,
        )
        return SemanticSearchResponse(results=results)

    @app.post("/ai/v1/rag/answer", response_model=RAGAnswer, response_model_exclude_none=True)
    def rag_answer(
        request: RAGAnswerRequest,
        service: AIServiceState = Depends(get_state),
    ):
        return service.answer_from_chunks(
            profile_name=request.model_profile,
            question=request.question,
            retrieved_chunks=request.retrieved_chunks,
        )

    @app.post("/ai/v1/rag/query", response_model=RAGQueryResponse)
    def rag_query(
        request: RAGQueryRequest,
        service: AIServiceState = Depends(get_state),
    ) -> RAGQueryResponse:
        answer, retrieved_chunk_ids = service.rag_query(
            profile_name=request.model_profile,
            patient_id=request.patient_id,
            question=request.question,
            top_k=request.top_k,
        )
        return RAGQueryResponse(
            answer=answer.answer,
            citations=answer.citations,
            uncertainties=answer.uncertainties,
            retrieved_chunk_ids=retrieved_chunk_ids,
        )

    @app.post("/ai/v1/sessions/compose-indexable-text", response_model=ComposeIndexableTextResponse)
    def compose_indexable_text(
        request: ComposeIndexableTextRequest,
        service: AIServiceState = Depends(get_state),
    ) -> ComposeIndexableTextResponse:
        return service.compose_indexable_text(request)

    return app

app = create_app()
