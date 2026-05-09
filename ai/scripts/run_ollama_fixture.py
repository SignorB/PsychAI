from __future__ import annotations

from pathlib import Path
import argparse
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from src.ai_models.factory import build_ollama_pipeline
from src.ai_models.model_config import AIModelConfig
from src.ai_models.ollama_provider import OllamaEmbeddingProvider, OllamaLLMProvider
from src.ai_models.pipeline import ClinicalAIPipeline
from src.ai_models.profiles import build_model_profile
from src.ai_models.schemas import Transcript
from src.ai_models.vector_store import InMemoryVectorStore
from tests.fakes import FakeSpeechToTextProvider, SimpleEmbeddingProvider, load_fixture_sessions


def main() -> None:
    args = _parse_args()
    sessions = load_fixture_sessions(Path(args.fixture))
    if args.limit is not None:
        sessions = sessions[: args.limit]

    speech_to_text = FakeSpeechToTextProvider(
        {session.audio_path: session.transcript for session in sessions}
    )
    pipeline = _build_pipeline(
        profile_name=args.profile,
        base_url=args.base_url,
        speech_to_text=speech_to_text,
        fake_embeddings=args.fake_embeddings,
    )
    profile = build_model_profile(args.profile, base_url=args.base_url)

    print(f"Profilo: {profile.name}")
    print(f"LLM: {pipeline.config.llm.model}")
    print(f"Embedding: {pipeline.config.embeddings.model}")
    print(f"STT previsto: whisper.cpp {pipeline.config.speech_to_text.model}")

    for index, session in enumerate(sessions, start=1):
        transcript: Transcript = pipeline.transcribe_session(audio_path=session.audio_path)
        note = pipeline.create_clinical_note(
            patient_id=session.patient_id,
            transcript=transcript,
        )
        source_id = f"{session.patient_id}_sessione_{index:03d}"
        pipeline.index_session_text(
            patient_id=session.patient_id,
            source_id=source_id,
            text=transcript.raw_text,
        )
        answer = pipeline.answer_patient_question(
            patient_id=session.patient_id,
            question=args.question,
        )

        print("=" * 72)
        print(f"Paziente: {note.patient_id}")
        print("Temi:")
        for theme in note.themes:
            print(f"- {theme.title}")
        print("Sintomi:")
        for symptom in note.symptoms:
            print(f"- {symptom.name} ({symptom.confidence})")
        print("Nota clinica:")
        print(note.structured_note)
        print("Recap prossima seduta:")
        for item in note.next_session_recap.open_points:
            print(f"- {item}")
        print("Risposta RAG:")
        print(answer.answer)
        print("Citazioni:", ", ".join(answer.citations) or "nessuna")
        if note.uncertainties or answer.uncertainties:
            print("Incertezze:", "; ".join(note.uncertainties + answer.uncertainties))


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the AI pipeline with Ollama on synthetic fixtures.")
    parser.add_argument("--base-url", default="http://localhost:11434")
    parser.add_argument("--profile", choices=["qwen", "phi"], default="qwen")
    parser.add_argument("--fake-embeddings", action="store_true")
    parser.add_argument("--fixture", default="tests/fixtures/clinical_sessions.json")
    parser.add_argument("--limit", type=int, default=1)
    parser.add_argument(
        "--question",
        default="Quali temi vanno ripresi nella prossima seduta?",
    )
    return parser.parse_args()


def _build_pipeline(
    *,
    profile_name: str,
    base_url: str,
    speech_to_text: FakeSpeechToTextProvider,
    fake_embeddings: bool,
) -> ClinicalAIPipeline:
    if not fake_embeddings:
        return build_ollama_pipeline(
            profile_name=profile_name,
            speech_to_text=speech_to_text,
            base_url=base_url,
            vector_store=InMemoryVectorStore(),
        )

    profile = build_model_profile(profile_name, base_url=base_url)
    config: AIModelConfig = profile.config
    return ClinicalAIPipeline(
        config=config,
        speech_to_text=speech_to_text,
        llm=OllamaLLMProvider(
            model=config.llm.model,
            base_url=config.llm.base_url,
            temperature=config.llm.temperature,
            top_p=config.llm.top_p,
        ),
        embeddings=SimpleEmbeddingProvider(),
        vector_store=InMemoryVectorStore(),
    )


if __name__ == "__main__":
    main()
