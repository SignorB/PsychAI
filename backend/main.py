from fastapi import FastAPI, File, Form, HTTPException, UploadFile, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
import os
from contextlib import asynccontextmanager
from pydantic import BaseModel
from datetime import datetime
from pathlib import Path
import shutil
import subprocess
from uuid import uuid4

from database import create_db_and_tables, get_session, seed_database
from models import Patient, TherapySession
from ai_client import AIServiceClientError, ai_health, ask_patient, draft_session_note, index_patient_source, semantic_search, transcribe_audio


def _split_env_list(name: str, default: list[str]) -> list[str]:
    raw = os.getenv(name)
    if not raw:
        return default
    return [item.strip() for item in raw.split(",") if item.strip()]


class SessionCreateRequest(BaseModel):
    date: str
    start_time: str
    end_time: str | None = None


class SessionNoteRequest(BaseModel):
    transcript: str | None = None
    manual_notes: list[str] = []
    model_profile: str = "qwen"


class PatientQuestionRequest(BaseModel):
    question: str
    model_profile: str = "qwen"
    top_k: int = 5


class SemanticSearchRequest(BaseModel):
    query: str
    patient_id: int | None = None
    model_profile: str = "qwen"
    top_k: int = 10


AUDIO_UPLOAD_DIR = Path(os.getenv("AUDIO_UPLOAD_DIR", "/data/audio"))

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize the SQLite database and create tables if they don't exist
    create_db_and_tables()
    # Seed the database with mock data if it's empty
    seed_database()
    yield
    # Any teardown code would go here

app = FastAPI(title="PsychAI Backend", lifespan=lifespan)

# Configurazione CORS per far parlare Next.js (Frontend) e FastAPI anche da LAN.
cors_origins = _split_env_list(
    "BACKEND_CORS_ORIGINS",
    ["http://localhost:3000", "http://127.0.0.1:3000"],
)
cors_origin_regex = os.getenv(
    "BACKEND_CORS_ORIGIN_REGEX",
    r"^https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|[a-zA-Z0-9-]+|[a-zA-Z0-9-]+\.local|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "PsychAI Backend is running! 🧠"}


@app.get("/health")
def health():
    ai_status = None
    try:
        ai_status = ai_health()
    except AIServiceClientError as exc:
        ai_status = {"status": "unavailable", "detail": str(exc)}
    return {"status": "ok", "ai_service": ai_status}

@app.get("/patients")
def get_patients(session: Session = Depends(get_session)):
    """Retrieve all patients."""
    patients = session.exec(select(Patient)).all()
    result = []
    for p in patients:
        p_dict = p.model_dump()
        p_dict["total_sessions"] = len(p.sessions)
        result.append(p_dict)
    return {"patients": result}

@app.post("/patients", response_model=Patient)
def create_patient(patient: Patient, session: Session = Depends(get_session)):
    """Create a new patient."""
    session.add(patient)
    session.commit()
    session.refresh(patient)
    return patient

@app.get("/sessions")
def get_all_sessions(session: Session = Depends(get_session)):
    """Retrieve all therapy sessions across all patients."""
    sessions = session.exec(select(TherapySession)).all()
    return {"sessions": sessions}


@app.get("/patients/{patient_id}/sessions/{session_id}", response_model=TherapySession)
def get_session_detail(patient_id: int, session_id: int, session: Session = Depends(get_session)):
    therapy_session = session.get(TherapySession, session_id)
    if not therapy_session or therapy_session.patient_id != patient_id:
        raise HTTPException(status_code=404, detail="Session not found")
    return therapy_session

@app.get("/patients/{patient_id}", response_model=Patient)
def get_patient(patient_id: int, session: Session = Depends(get_session)):
    """Retrieve a specific patient by ID."""
    patient = session.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@app.get("/patients/{patient_id}/sessions")
def get_sessions(patient_id: int, session: Session = Depends(get_session)):
    """Retrieve all sessions for a specific patient."""
    patient = session.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"patient_id": patient_id, "sessions": patient.sessions}

@app.post("/patients/{patient_id}/sessions", response_model=TherapySession)
def create_session(patient_id: int, request: SessionCreateRequest | None = None, session: Session = Depends(get_session)):
    """Create a new session for a specific patient."""
    patient = session.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    session_date = datetime.utcnow().isoformat() + "Z"
    start_time = None
    end_time = None
    
    if request:
        session_date = request.date
        start_time = request.start_time
        end_time = request.end_time
        if not end_time:
            # Default to 1 hour later
            try:
                sh, sm = map(int, start_time.split(':'))
                eh = (sh + 1) % 24
                end_time = f"{eh:02d}:{sm:02d}"
            except Exception:
                pass
    
    new_session = TherapySession(
        date=session_date,
        start_time=start_time,
        end_time=end_time,
        transcript=patient.intake_notes or "",
        patient_id=patient.id
    )
    
    session.add(new_session)
    session.commit()
    session.refresh(new_session)
    
    return new_session

@app.post("/patients/{patient_id}/sessions/{session_id}/notes")
def upload_session_notes(patient_id: int, session_id: int, request: SessionNoteRequest, session: Session = Depends(get_session)):
    therapy_session = session.get(TherapySession, session_id)
    if not therapy_session or therapy_session.patient_id != patient_id:
        raise HTTPException(status_code=404, detail="Session not found")
    if request.transcript is not None:
        therapy_session.transcript = request.transcript
    if request.manual_notes:
        therapy_session.clinical_note = "\n".join(request.manual_notes)
    session.add(therapy_session)
    session.commit()
    session.refresh(therapy_session)
    return therapy_session


@app.post("/patients/{patient_id}/sessions/{session_id}/approve")
def approve_session(patient_id: int, session_id: int, session: Session = Depends(get_session)):
    therapy_session = session.get(TherapySession, session_id)
    if not therapy_session or therapy_session.patient_id != patient_id:
        raise HTTPException(status_code=404, detail="Session not found")
    therapy_session.approved = True
    session.add(therapy_session)
    session.commit()
    session.refresh(therapy_session)
    return therapy_session


@app.post("/patients/{patient_id}/sessions/{session_id}/generate-note")
def generate_session_note(
    patient_id: int,
    session_id: int,
    request: SessionNoteRequest,
    session: Session = Depends(get_session),
):
    therapy_session = session.get(TherapySession, session_id)
    if not therapy_session or therapy_session.patient_id != patient_id:
        raise HTTPException(status_code=404, detail="Session not found")

    transcript = request.transcript or therapy_session.transcript
    if not transcript:
        raise HTTPException(status_code=400, detail="Session transcript is required")

    try:
        ai_note = draft_session_note(
            patient_id=patient_id,
            session_id=session_id,
            transcript_text=transcript,
            manual_notes=request.manual_notes,
            model_profile=request.model_profile,
        )
        therapy_session.transcript = transcript
        therapy_session.clinical_note = ai_note.get("structured_note", "")
        session.add(therapy_session)
        session.commit()
        session.refresh(therapy_session)

        index_payload = "\n\n".join(
            part for part in [therapy_session.transcript, therapy_session.clinical_note] if part
        )
        index_result = index_patient_source(
            patient_id=patient_id,
            source_id=f"session_{session_id}",
            source_type="clinical_summary",
            text=index_payload,
            session_id=session_id,
            model_profile=request.model_profile,
        )
    except AIServiceClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {"session": therapy_session, "ai_note": ai_note, "index": index_result}

@app.post("/patients/{patient_id}/sessions/{session_id}/transcribe")
def transcribe_session(
    patient_id: int,
    session_id: int,
    audio: UploadFile = File(...),
    append: bool = Form(False),
    session: Session = Depends(get_session),
):
    therapy_session = session.get(TherapySession, session_id)
    if not therapy_session or therapy_session.patient_id != patient_id:
        raise HTTPException(status_code=404, detail="Session not found")

    AUDIO_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    upload_id = uuid4().hex
    suffix = Path(audio.filename or "").suffix or ".webm"
    source_path = AUDIO_UPLOAD_DIR / f"session_{session_id}_{upload_id}{suffix}"
    wav_path = AUDIO_UPLOAD_DIR / f"session_{session_id}_{upload_id}.wav"

    try:
        with source_path.open("wb") as output:
            shutil.copyfileobj(audio.file, output)
        _convert_audio_to_wav(source_path=source_path, wav_path=wav_path)
        transcription = transcribe_audio(
            patient_id=patient_id,
            session_id=session_id,
            audio_path=str(wav_path),
        )
    except AIServiceClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except (OSError, subprocess.CalledProcessError) as exc:
        raise HTTPException(status_code=400, detail=f"Audio transcription failed: {exc}") from exc
    finally:
        audio.file.close()

    transcribed_text = transcription.get("raw_text", "").strip()
    if append and therapy_session.transcript:
        therapy_session.transcript = f"{therapy_session.transcript.rstrip()}\n\n{transcribed_text}"
    else:
        therapy_session.transcript = transcribed_text
    session.add(therapy_session)
    session.commit()
    session.refresh(therapy_session)

    return {
        "session": therapy_session,
        "transcription": transcription,
        "audio_path": str(wav_path),
    }


def _convert_audio_to_wav(*, source_path: Path, wav_path: Path) -> None:
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(source_path),
            "-ac",
            "1",
            "-ar",
            "16000",
            "-sample_fmt",
            "s16",
            str(wav_path),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
    )


@app.post("/patients/{patient_id}/ask")
def ask_patient_history(
    patient_id: int,
    request: PatientQuestionRequest,
    session: Session = Depends(get_session),
):
    patient = session.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    try:
        answer = ask_patient(
            patient_id=patient_id,
            question=request.question,
            model_profile=request.model_profile,
            top_k=request.top_k,
        )
    except AIServiceClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return answer


@app.post("/search/reindex")
def reindex_search_sources(session: Session = Depends(get_session)):
    patients = session.exec(select(Patient)).all()
    sessions = session.exec(select(TherapySession)).all()
    indexed_sources = 0
    indexed_chunks = 0

    try:
        for patient in patients:
            text = _patient_index_text(patient)
            if text.strip():
                result = index_patient_source(
                    patient_id=patient.id,
                    source_id=f"patient_{patient.id}",
                    source_type="written_annotation",
                    text=text,
                    metadata={
                        "record_type": "patient",
                        "patient_name": _patient_display_name(patient),
                    },
                )
                indexed_sources += 1
                indexed_chunks += result.get("chunk_count", 0)

        for therapy_session in sessions:
            text = _session_index_text(therapy_session)
            if text.strip() and therapy_session.patient_id:
                result = index_patient_source(
                    patient_id=therapy_session.patient_id,
                    source_id=f"session_{therapy_session.id}",
                    source_type="clinical_summary",
                    text=text,
                    session_id=therapy_session.id,
                    metadata={
                        "record_type": "session",
                        "session_date": therapy_session.date,
                    },
                )
                indexed_sources += 1
                indexed_chunks += result.get("chunk_count", 0)
    except AIServiceClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {
        "indexed_sources": indexed_sources,
        "indexed_chunks": indexed_chunks,
        "patient_count": len(patients),
        "session_count": len(sessions),
    }


@app.post("/search/semantic")
def search_semantic(request: SemanticSearchRequest, session: Session = Depends(get_session)):
    query = request.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Search query is required")

    if request.patient_id is not None:
        patient = session.get(Patient, request.patient_id)
        patients = [patient] if patient else []
    else:
        patients = session.exec(select(Patient)).all()

    results = []
    per_patient_k = max(request.top_k, 3)
    try:
        for patient in patients:
            response = semantic_search(
                patient_id=patient.id,
                query=query,
                model_profile=request.model_profile,
                top_k=per_patient_k,
            )
            for item in response.get("results", []):
                chunk = item.get("chunk", {})
                metadata = chunk.get("metadata", {})
                session_id = metadata.get("session_id")
                href = f"/patients/{patient.id}"
                if session_id:
                    href = f"/patients/{patient.id}/sessions/{session_id}"
                results.append(
                    {
                        "patient_id": patient.id,
                        "patient_name": _patient_display_name(patient),
                        "source_id": chunk.get("source_id"),
                        "chunk_id": chunk.get("chunk_id"),
                        "source_type": metadata.get("source_type"),
                        "record_type": metadata.get("record_type"),
                        "session_id": session_id,
                        "score": item.get("score", 0),
                        "text": chunk.get("text", ""),
                        "metadata": metadata,
                        "href": href,
                    }
                )
    except AIServiceClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    results.sort(key=lambda item: item["score"], reverse=True)
    return {"query": query, "results": results[: request.top_k], "searched_patients": len(patients)}


def _patient_display_name(patient: Patient) -> str:
    return " ".join(part for part in [patient.name, patient.surname] if part).strip()


def _patient_index_text(patient: Patient) -> str:
    return "\n".join(
        part
        for part in [
            f"Paziente: {_patient_display_name(patient)}",
            f"Eta: {patient.age}" if patient.age else "",
            f"Condizione: {patient.condition}" if patient.condition else "",
            f"Note intake: {patient.intake_notes}" if patient.intake_notes else "",
            f"Referral: {patient.referral_letter}" if patient.referral_letter else "",
        ]
        if part
    )


def _session_index_text(therapy_session: TherapySession) -> str:
    return "\n".join(
        part
        for part in [
            f"Seduta del {therapy_session.date}",
            f"Trascrizione:\n{therapy_session.transcript}" if therapy_session.transcript else "",
            f"Nota clinica:\n{therapy_session.clinical_note}" if therapy_session.clinical_note else "",
        ]
        if part
    )
