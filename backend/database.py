import os

from sqlmodel import SQLModel, Session, create_engine, select
from models import Patient, TherapySession

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


def get_session():
    """
    FastAPI Dependency to get a database session.
    """
    with Session(engine) as session:
        yield session


import random
from datetime import datetime, timedelta

def seed_database():
    """
    Seeds the database with at least 20 highly realistic mock patients
    and 3 to 10 sessions each if it is empty.
    """
    with Session(engine) as session:
        # Check if patients already exist
        statement = select(Patient)
        patient_exists = session.exec(statement).first()
        
        if not patient_exists:
            first_names = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"]
            last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"]
            conditions = ["Generalized Anxiety Disorder", "Major Depressive Disorder", "PTSD", "Social Anxiety", "Bipolar Disorder", "OCD", "Burnout", "Insomnia", "Panic Disorder", "Eating Disorder"]
            notes_samples = [
                "Patient reports feeling consistently overwhelmed and unable to manage daily stressors.",
                "Struggling with severe sleep deprivation and changes in appetite over the last month.",
                "Experiencing frequent panic attacks in crowded spaces, leading to avoidance behaviors.",
                "Having significant trouble focusing at work, resulting in decreased performance.",
                "Reports persistent feelings of worthlessness and lack of motivation to engage in hobbies.",
                "History of childhood trauma; currently experiencing flashbacks and hyperarousal.",
                "High stress levels due to recent divorce and subsequent financial difficulties.",
                "Obsessive thoughts regarding contamination, accompanied by compulsive hand-washing.",
                "Extreme mood swings observed, ranging from depressive episodes to manic phases.",
                "Preoccupation with body image and restrictive eating patterns impacting physical health."
            ]
            transcripts = [
                "Therapist: How have you been feeling since our last session?\nPatient: Honestly, it's been really tough. I can't seem to shake this feeling of dread.\nTherapist: I hear you. Let's talk about what triggers that dread.",
                "Therapist: Did you manage to try the breathing exercises we discussed?\nPatient: Yes, but only when I was already panicking. It helped a little.\nTherapist: That's a great start. This week, let's try practicing them when you're calm.",
                "Therapist: How are things at work?\nPatient: Still overwhelming. My boss keeps piling on projects and I can't say no.\nTherapist: Let's roleplay some ways you might set boundaries with your boss.",
                "Therapist: You mentioned feeling isolated lately.\nPatient: Yeah, I've been ignoring calls from my friends. I just don't have the energy.\nTherapist: Withdrawal is common when we feel overwhelmed. What's one small step we could take?",
                "Therapist: Tell me about your sleep this week.\nPatient: I wake up at 3 AM every night and my mind starts racing immediately.\nTherapist: What is the main theme of those racing thoughts?"
            ]
            clinical_notes = [
                "Patient continues to struggle with emotional regulation. Introduced grounding techniques (5-4-3-2-1 method). Homework: practice grounding once daily.",
                "Discussed boundary setting in professional environments. Patient identified fear of rejection as the core barrier. Planned to set one small boundary this week.",
                "Explored the root causes of recent panic attacks. Patient recognized a pattern related to performance anxiety. Will continue monitoring triggers.",
                "Patient exhibited signs of anhedonia and withdrawal. Focused on behavioral activation strategies. Goal for the week is to text one friend.",
                "Addressed severe sleep hygiene issues. Patient agreed to stop using screens 1 hour before bed and keep a sleep diary."
            ]

            for i in range(20):
                fname = random.choice(first_names)
                lname = random.choice(last_names)
                age = random.randint(18, 65)
                cond = random.choice(conditions)
                note = random.choice(notes_samples)
                
                p = Patient(
                    name=fname,
                    surname=lname,
                    age=age,
                    condition=cond,
                    address=f"{random.randint(100, 9999)} {random.choice(['Main St', 'Elm St', 'Oak Ave', 'Pine Rd', 'Cedar Ln', 'Maple Dr'])}, Cityville",
                    email=f"{fname.lower()}.{lname.lower()}{random.randint(1,99)}@example.com",
                    phone=f"+1-555-{random.randint(1000,9999):04d}",
                    is_active=random.choice([True, True, True, False]), # 75% active
                    intake_notes=note
                )
                session.add(p)
                session.commit()
                session.refresh(p)
                
                num_sessions = random.randint(3, 10)
                current_date = datetime.utcnow() - timedelta(days=num_sessions * 7)
                
                for j in range(num_sessions):
                    if j == num_sessions - 1 and random.random() > 0.5:
                        s_date = datetime.utcnow() + timedelta(days=random.randint(1, 2))
                    else:
                        s_date = current_date + timedelta(days=j*7 + random.randint(-1, 1))
                    
                    start_hour = random.randint(8, 17)
                    end_hour = start_hour + 1
                    
                    s = TherapySession(
                        date=s_date.isoformat() + "Z",
                        start_time=f"{start_hour:02d}:00",
                        end_time=f"{end_hour:02d}:00",
                        approved=random.choice([True, True, False]), # mostly approved
                        transcript=random.choice(transcripts),
                        clinical_note=random.choice(clinical_notes),
                        patient_id=p.id
                    )
                    session.add(s)
                
                session.commit()
            print("Database seeded with 20 realistic mock patients and their sessions.")
