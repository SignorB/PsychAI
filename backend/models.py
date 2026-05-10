from typing import Optional, List
from sqlmodel import Field, Relationship, SQLModel

class TherapySession(SQLModel, table=True):
    """
    Therapy session model linked to a patient.
    Called TherapySession to avoid conflicts with database sessions.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    date: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    approved: bool = False
    transcript: Optional[str] = None
    clinical_note: Optional[str] = None
    
    # Foreign key to Patient
    patient_id: Optional[int] = Field(default=None, foreign_key="patient.id")
    
    # Relationship back to patient
    patient: Optional["Patient"] = Relationship(back_populates="sessions")


class Patient(SQLModel, table=True):
    """
    Patient model representing a client in the CRM.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    surname: str = ""
    age: int = 0
    condition: str = ""
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    status: str = "Active"
    is_active: bool = True
    referral_letter: Optional[str] = None
    intake_notes: Optional[str] = None
    patient_history_report: Optional[str] = None
    patient_history_report_generated_at: Optional[str] = None
    
    # One-to-many relationship with TherapySession
    sessions: List[TherapySession] = Relationship(back_populates="patient")
