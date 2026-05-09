from sqlmodel import SQLModel, Session, create_engine, select
from models import Patient, TherapySession

# Initialize local SQLite database
sqlite_file_name = "psychai.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

# check_same_thread=False allows FastAPI to share the connection across requests
connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, echo=False, connect_args=connect_args)


def create_db_and_tables():
    """
    Creates all tables based on SQLModel definitions.
    """
    SQLModel.metadata.create_all(engine)


def get_session():
    """
    FastAPI Dependency to get a database session.
    """
    with Session(engine) as session:
        yield session


def seed_database():
    """
    Seeds the database with highly realistic mock data if it is empty.
    """
    with Session(engine) as session:
        # Check if patients already exist
        statement = select(Patient)
        patient_exists = session.exec(statement).first()
        
        if not patient_exists:
            # Seed Patients
            p1 = Patient(
                name="Eleanor Vance",
                age=32,
                condition="Generalized Anxiety Disorder",
                intake_notes="Patient presents with persistent worry and physical tension, exacerbated by work stress. Reports significant sleep disturbances."
            )
            
            p2 = Patient(
                name="Mark Peterson",
                age=45,
                condition="Burnout & Mild Depression",
                intake_notes="High-stress corporate role. Struggling with loss of motivation, anhedonia, and emotional exhaustion."
            )
            
            session.add(p1)
            session.add(p2)
            session.commit()
            
            # Refresh to get DB-assigned IDs
            session.refresh(p1)
            session.refresh(p2)
            
            # Seed TherapySession for Eleanor
            s1 = TherapySession(
                date="2026-05-01T10:00:00Z",
                transcript="Therapist: How have you been sleeping this week?\nEleanor: Still waking up at 3 AM with my mind racing about upcoming deadlines.\nTherapist: Let's explore what specific thoughts are keeping you awake.",
                clinical_note="Explored sleep hygiene and identified recurring intrusive thoughts related to job security. Introduced basic Cognitive Behavioral Therapy (CBT) restructuring techniques.",
                patient_id=p1.id
            )
            
            session.add(s1)
            session.commit()
            print("Database seeded with realistic mock data.")
