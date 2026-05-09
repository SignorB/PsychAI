from __future__ import annotations

from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from src.ai_models.model_config import AIModelConfig
from src.ai_models.pipeline import ClinicalAIPipeline
from tests.fakes import (
    FakeSpeechToTextProvider,
    InMemoryVectorStore,
    RuleBasedLLMProvider,
    SimpleEmbeddingProvider,
    load_fixture_sessions,
)


def main() -> None:
    sessions = load_fixture_sessions(Path("tests/fixtures/clinical_sessions.json"))
    speech_to_text = FakeSpeechToTextProvider(
        {session.audio_path: session.transcript for session in sessions}
    )
    pipeline = ClinicalAIPipeline(
        config=AIModelConfig(),
        speech_to_text=speech_to_text,
        llm=RuleBasedLLMProvider(),
        embeddings=SimpleEmbeddingProvider(),
        vector_store=InMemoryVectorStore(),
    )

    for session in sessions:
        transcript = pipeline.transcribe_session(audio_path=session.audio_path)
        note = pipeline.create_clinical_note(
            patient_id=session.patient_id,
            transcript=transcript,
        )
        pipeline.index_session_text(
            patient_id=session.patient_id,
            source_id=f"{session.patient_id}_sessione_001",
            text=transcript.raw_text,
        )
        answer = pipeline.answer_patient_question(
            patient_id=session.patient_id,
            question="Quali temi vanno ripresi nella prossima seduta?",
        )

        print("=" * 72)
        print(f"Paziente: {note.patient_id}")
        print("Temi:", ", ".join(theme.title for theme in note.themes))
        print("Sintomi:", ", ".join(symptom.name for symptom in note.symptoms))
        print("Nota:", note.structured_note)
        print("RAG:", answer.answer)
        print("Citazioni:", ", ".join(answer.citations))


if __name__ == "__main__":
    main()
