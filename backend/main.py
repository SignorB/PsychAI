from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
import os
from contextlib import asynccontextmanager
from typing import List, Dict, Any
from datetime import datetime

from database import create_db_and_tables, get_session, seed_database
from models import Patient, TherapySession

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize the SQLite database and create tables if they don't exist
    create_db_and_tables()
    # Seed the database with mock data if it's empty
    seed_database()
    yield
    # Any teardown code would go here

app = FastAPI(title="PsychAI Backend", lifespan=lifespan)

# Configurazione CORS per far parlare Next.js (Frontend) e FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # L'URL del tuo frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "PsychAI Backend is running! 🧠"}

@app.get("/patients")
def get_patients(session: Session = Depends(get_session)):
    """Retrieve all patients."""
    patients = session.exec(select(Patient)).all()
    return {"patients": patients}

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
def create_session(patient_id: int, session: Session = Depends(get_session)):
    """Create a new session for a specific patient."""
    patient = session.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    new_session = TherapySession(
        date=datetime.utcnow().isoformat() + "Z",
        patient_id=patient.id
    )
    
    session.add(new_session)
    session.commit()
    session.refresh(new_session)
    
    return new_session

@app.post("/patients/{patient_id}/sessions/{session_id}/notes")
def upload_session_notes(patient_id: str, session_id: str,  notes: str):
    return {"patient_id": patient_id, "session_id": session_id, "notes": notes}

# TODO: implement STT to transcribe the session
@app.post("/patients/{patient_id}/sessions/{session_id}/transcribe")
def transcribe_session(patient_id: str, session_id: str):
    return {"patient_id": patient_id, "session_id": session_id}
