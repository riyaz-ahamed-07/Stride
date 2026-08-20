from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

Role = Literal["patient", "physiotherapist", "administrator"]
AccountStatus = Literal["active", "inactive"]
AppointmentStatus = Literal["scheduled", "completed", "cancelled"]
PlanStatus = Literal["draft", "active", "completed"]
SessionStatus = Literal["in_progress", "completed", "abandoned"]
ReviewStatus = Literal["pending", "approved", "corrected", "rejected"]
ConsentStatus = Literal["granted", "revoked"]


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Role
    full_name: str
    user_id: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: Role
    status: AccountStatus
    date_of_birth: date | None = None
    therapist_id: str | None = None
    notes: str | None = None

    model_config = {"from_attributes": True}


class PatientCreate(BaseModel):
    email: str
    full_name: str
    password: str = Field(min_length=8)
    date_of_birth: date | None = None
    notes: str | None = None


class PatientUpdate(BaseModel):
    full_name: str | None = None
    status: AccountStatus | None = None
    notes: str | None = None
    therapist_id: str | None = None


class AppointmentCreate(BaseModel):
    patient_id: str
    scheduled_at: datetime
    reason: str | None = None


class AppointmentOut(BaseModel):
    id: str
    patient_id: str
    therapist_id: str
    scheduled_at: datetime
    status: AppointmentStatus
    reason: str | None
    patient_name: str | None = None

    model_config = {"from_attributes": True}


class ExerciseCreate(BaseModel):
    name: str
    instructions: str
    safety_notes: str


class ExerciseOut(BaseModel):
    id: str
    name: str
    instructions: str
    safety_notes: str

    model_config = {"from_attributes": True}


class PlanItemIn(BaseModel):
    exercise_id: str
    target_sets: int = Field(ge=1, le=10)
    target_repetitions: int = Field(ge=1, le=50)


class PlanCreate(BaseModel):
    patient_id: str
    title: str
    start_date: date
    items: list[PlanItemIn]


class PlanItemOut(BaseModel):
    id: str
    exercise_id: str
    exercise_name: str
    target_sets: int
    target_repetitions: int
    instructions: str
    safety_notes: str


class PlanOut(BaseModel):
    id: str
    patient_id: str
    therapist_id: str
    title: str
    start_date: date
    status: PlanStatus
    items: list[PlanItemOut] = []


class SessionCreate(BaseModel):
    plan_exercise_id: str


class SessionComplete(BaseModel):
    reported_repetitions: int = Field(ge=0, le=200)
    patient_notes: str | None = None
    metric: str = "repetitions"
    value: float
    confidence: float = Field(ge=0, le=1)


class SessionOut(BaseModel):
    id: str
    plan_exercise_id: str
    started_at: datetime
    ended_at: datetime | None
    status: SessionStatus
    reported_repetitions: int | None
    patient_notes: str | None


class ObservationOut(BaseModel):
    id: str
    session_id: str
    metric: str
    value: float
    confidence: float
    review_status: ReviewStatus
    therapist_comment: str | None
    patient_name: str | None = None
    exercise_name: str | None = None


class ObservationReview(BaseModel):
    review_status: ReviewStatus
    therapist_comment: str | None = None


class ConsentIn(BaseModel):
    purpose: str = "camera_analysis"
    granted: bool


class ConsentOut(BaseModel):
    id: str
    patient_id: str
    purpose: str
    status: ConsentStatus
    granted_at: datetime
    revoked_at: datetime | None

    model_config = {"from_attributes": True}


class AdminUserUpdate(BaseModel):
    status: AccountStatus
