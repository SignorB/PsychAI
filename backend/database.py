import os

from sqlmodel import SQLModel, Session, create_engine, select
from sqlalchemy import text
from models import Patient, TherapySession
from datetime import date, datetime, time, timedelta

# Initialize local SQLite database
sqlite_file_name = os.getenv("SQLITE_FILE_NAME", "psychai.db")
sqlite_url = f"sqlite:///{sqlite_file_name}"

# check_same_thread=False allows FastAPI to share the connection across requests
connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, echo=False, connect_args=connect_args)


def create_db_and_tables():
    """
    Creates all tables based on SQLModel definitions.
    """
    SQLModel.metadata.create_all(engine)
    ensure_schema_columns()


def ensure_schema_columns():
    """
    Lightweight SQLite migration for local development.
    SQLModel create_all does not add new columns to existing tables.
    """
    with engine.begin() as connection:
        columns = {
            row[1]
            for row in connection.execute(text("PRAGMA table_info(patient)")).fetchall()
        }
        if "patient_history_report" not in columns:
            connection.execute(text("ALTER TABLE patient ADD COLUMN patient_history_report TEXT"))
        if "patient_history_report_generated_at" not in columns:
            connection.execute(text("ALTER TABLE patient ADD COLUMN patient_history_report_generated_at TEXT"))
        if "status" not in columns:
            connection.execute(text("ALTER TABLE patient ADD COLUMN status TEXT DEFAULT 'Active'"))


def get_session():
    """
    FastAPI Dependency to get a database session.
    """
    with Session(engine) as session:
        yield session

def seed_database(force: bool = False):
    """
    Seeds a deterministic demo dataset for local development.

    The dataset contains:
    - 20 patients: 10 active, 6 discharged, 4 on hold.
    - 20 upcoming appointments across this week and next week for the 10 active patients.
    - 70 past transcribed sessions across all patients, with 20 unconfirmed sessions.
    - 10 past transcribed sessions without an AI-generated clinical summary.
    """
    with Session(engine) as session:
        patient_exists = session.exec(select(Patient)).first()
        if patient_exists and not force:
            return

        if force:
            for therapy_session in session.exec(select(TherapySession)).all():
                session.delete(therapy_session)
            for patient in session.exec(select(Patient)).all():
                session.delete(patient)
            session.commit()

        patients = _demo_patients()
        created_patients = []
        for data in patients:
            patient = Patient(
                **data,
                is_active=data["status"] == "Active",
                patient_history_report=_history_report_for(data),
                patient_history_report_generated_at=datetime.utcnow().isoformat() + "Z",
            )
            session.add(patient)
            session.commit()
            session.refresh(patient)
            created_patients.append(patient)

        past_distribution = [6, 5, 5, 5, 4, 4, 4, 4, 3, 3, 4, 4, 3, 3, 3, 3, 2, 2, 2, 1]
        assert sum(past_distribution) == 70

        past_index = 0
        for patient, count in zip(created_patients, past_distribution):
            for local_index in range(count):
                past_index += 1
                session_date = datetime.combine(
                    date.today() - timedelta(days=8 + (past_index * 3) + local_index),
                    time(hour=9 + ((past_index + local_index) % 8), minute=0),
                )
                has_summary = past_index > 10
                therapy_session = TherapySession(
                    date=session_date.isoformat() + "Z",
                    start_time=session_date.strftime("%H:%M"),
                    end_time=(session_date + timedelta(minutes=50)).strftime("%H:%M"),
                    approved=past_index > 20,
                    transcript=_transcript_for(patient, local_index, past_index),
                    clinical_note=_clinical_note_for(patient, local_index) if has_summary else None,
                    patient_id=patient.id,
                )
                session.add(therapy_session)

        active_patients = [patient for patient in created_patients if patient.status == "Active"]
        current_week = _monday(date.today())
        appointment_slots = [
            (0, "09:00"), (0, "11:00"), (1, "10:00"), (1, "15:00"), (2, "09:30"),
            (2, "13:00"), (3, "10:30"), (3, "16:00"), (4, "09:00"), (4, "12:00"),
        ]
        for week_offset in (0, 7):
            for patient, (day_offset, start_time) in zip(active_patients, appointment_slots):
                start_hour, start_minute = map(int, start_time.split(":"))
                session_date = datetime.combine(
                    current_week + timedelta(days=week_offset + day_offset),
                    time(hour=start_hour, minute=start_minute),
                )
                therapy_session = TherapySession(
                    date=session_date.isoformat() + "Z",
                    start_time=start_time,
                    end_time=(session_date + timedelta(minutes=50)).strftime("%H:%M"),
                    approved=False,
                    transcript=None,
                    clinical_note=None,
                    patient_id=patient.id,
                )
                session.add(therapy_session)

        session.commit()
        print("Database seeded with 20 patients, 70 past sessions, and 20 upcoming appointments.")


def _monday(value: date) -> date:
    return value - timedelta(days=value.weekday())


def _demo_patients() -> list[dict]:
    statuses = ["Active"] * 10 + ["Discharged"] * 6 + ["On hold"] * 4
    rows = [
        ("Amelia", "Reed", 34, "Generalized anxiety with work-related rumination"),
        ("Marcus", "Chen", 41, "Panic symptoms and avoidance of public transport"),
        ("Nora", "Patel", 29, "Postpartum adjustment and intrusive worry"),
        ("Ethan", "Brooks", 37, "Burnout, insomnia, and perfectionism"),
        ("Sofia", "Martinez", 45, "Complicated grief after parental loss"),
        ("Daniel", "Kim", 52, "Low mood and social withdrawal"),
        ("Grace", "Morgan", 31, "Health anxiety and reassurance seeking"),
        ("Leo", "Anderson", 26, "Social anxiety and self-critical thoughts"),
        ("Hannah", "Williams", 48, "OCD symptoms focused on contamination"),
        ("Owen", "Taylor", 39, "Relationship stress and emotional regulation"),
        ("Maya", "Johnson", 33, "Adjustment disorder after relocation"),
        ("Lucas", "Brown", 57, "Depressive episode in partial remission"),
        ("Isabella", "Davis", 24, "Eating concerns and body image distress"),
        ("Noah", "Wilson", 44, "PTSD symptoms following a road accident"),
        ("Chloe", "Garcia", 36, "Sleep disruption linked to caregiving strain"),
        ("Liam", "Thomas", 50, "Alcohol reduction maintenance work"),
        ("Ava", "Robinson", 28, "Therapy paused for maternity leave"),
        ("Mason", "Clark", 46, "On hold during medical treatment"),
        ("Mia", "Lewis", 55, "On hold after insurance change"),
        ("Jack", "Walker", 30, "On hold while relocating"),
    ]
    patients = []
    for idx, (name, surname, age, condition) in enumerate(rows):
        patients.append(
            {
                "name": name,
                "surname": surname,
                "age": age,
                "condition": condition,
                "status": statuses[idx],
                "address": f"{118 + idx * 7} {['Maple Street', 'Oak Avenue', 'Cedar Lane', 'Pine Road'][idx % 4]}, Brookfield",
                "email": f"{name.lower()}.{surname.lower()}@example.com",
                "phone": f"+1-555-01{idx:02d}",
                "referral_letter": (
                    f"Referral notes for {name} {surname}: primary care recommended weekly psychotherapy "
                    f"to address {condition.lower()} and support functional recovery."
                ),
                "intake_notes": (
                    f"{name} presented with {condition.lower()}. Initial formulation highlights a pattern of "
                    "stress sensitivity, avoidance under pressure, and meaningful motivation for structured skills practice."
                ),
            }
        )
    return patients


def _transcript_for(patient: Patient, local_index: int, global_index: int) -> str:
    themes = [
        "sleep routine", "work boundaries", "family communication", "avoidance pattern",
        "body sensations", "self-criticism", "grief wave", "exposure practice",
    ]
    theme = themes[(local_index + global_index) % len(themes)]
    paragraphs = [
        f"Therapist: Last time we agreed to track the {theme}. What did you notice during the week?",
        f"Patient: I noticed it most clearly on Tuesday. I was trying to keep the day organised, but the worry became louder when I thought about disappointing someone. It was not a crisis, but it took a lot of energy.",
        "Therapist: When the worry became louder, what did you do first?",
        f"Patient: I paused and wrote down the prediction. The prediction was that if I slowed down or asked for help, people would think I was unreliable. After writing it down, it looked less factual and more like an old rule.",
        "Therapist: That distinction matters. What evidence did you collect for and against that rule?",
        f"Patient: Against it, I remembered two recent examples where I was direct and the reaction was neutral. For it, I mostly had memories and a body feeling. My chest tightened, and I treated that as proof even though nothing had happened yet.",
        "Therapist: How did you respond to the body signal?",
        f"Patient: I used the breathing practice for a few minutes and then sent a shorter message than usual. I did not over-explain. The anxiety stayed around for twenty minutes, then dropped enough for me to continue with the day.",
        "Therapist: What should we carry forward from that experiment?",
        f"Patient: The main point is that I can feel anxious and still choose a smaller, clearer action. I want to keep practicing that before the next session, especially when the {theme} shows up.",
    ]
    text = "\n".join(paragraphs)
    while len(text) < 2450:
        text += (
            "\nTherapist: Let us slow that down and name the thought, feeling, body cue, and action urge."
            "\nPatient: The thought was familiar, the feeling was anxiety mixed with shame, the body cue was tension, "
            "and the action urge was to avoid or overcompensate. Naming each part helped me respond with more choice."
        )
    return text[:2550]


def _clinical_note_for(patient: Patient, local_index: int) -> str:
    focus = [
        "cognitive restructuring", "behavioral activation", "graded exposure",
        "sleep hygiene", "boundary setting", "emotion regulation",
    ][local_index % 6]
    return (
        f"AI Draft Summary: Session focused on {focus} in the context of {patient.condition.lower()}. "
        "Patient described improved ability to pause before reacting, identified one recurring prediction, "
        "and tested a smaller behavioural experiment during the week. No acute safety concerns were reported "
        "in the material reviewed. Plan: continue monitoring triggers, repeat the agreed practice task, and "
        "review barriers at the next appointment."
    )


def _history_report_for(patient_data: dict) -> str:
    return (
        f"Longitudinal snapshot for {patient_data['name']} {patient_data['surname']}: treatment has focused on "
        f"{patient_data['condition'].lower()}, with emphasis on collaborative formulation, symptom tracking, "
        "and practical between-session experiments. Current work prioritises continuity, relapse prevention, "
        "and clear review of unresolved themes before each appointment."
    )
