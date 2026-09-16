from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

Role = Literal["patient", "physiotherapist", "administrator"]
AccountStatus = Literal[
    "pending_email",
    "pending_onboarding",
    "pending_approval",
    "active",
    "inactive",
]
AppointmentStatus = Literal["scheduled", "completed", "cancelled"]
PlanStatus = Literal["draft", "active", "completed"]
SessionStatus = Literal["in_progress", "completed", "abandoned"]
ReviewStatus = Literal["pending", "approved", "corrected", "rejected"]
ConsentStatus = Literal["granted", "revoked"]
SessionType = Literal["home", "supervised"]
BodyRegion = Literal[
    "knee",
    "hip",
    "shoulder",
    "ankle",
    "back",
    "neck",
    "wrist_hand",
    "pelvic_floor",
    "general",
]


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Role
    full_name: str
    user_id: str
    status: AccountStatus
    email_verified: bool = False
    # Present only when STRIDE_ENV is local/dev — never rely on this in production.
    dev_code: str | None = None


class RegisterIn(BaseModel):
    email: str
    password: str = Field(min_length=8)
    role: Literal["patient", "physiotherapist"]


class VerifyOtpIn(BaseModel):
    email: str
    code: str = Field(min_length=6, max_length=6)


class ResendOtpIn(BaseModel):
    email: str


class ForgotPasswordIn(BaseModel):
    email: str


class ResetPasswordIn(BaseModel):
    token: str
    password: str = Field(min_length=8)


class ForgotPasswordOut(BaseModel):
    detail: str
    dev_reset_token: str | None = None


class ResetPasswordOut(BaseModel):
    detail: str


class PasswordCheckOut(BaseModel):
    valid: bool
    issues: list[str]


class PatientOnboardingIn(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    date_of_birth: date | None = None
    phone: str | None = Field(default=None, max_length=32)
    body_region: BodyRegion
    rehab_goal: str = Field(min_length=1, max_length=280)
    notes: str | None = Field(default=None, max_length=500)
    therapist_invite_code: str = Field(min_length=4, max_length=16)
    camera_analysis_consent: bool

    @field_validator("full_name", "rehab_goal", "therapist_invite_code")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("This field is required.")
        return cleaned

    @field_validator("phone", "notes")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        allowed = set("0123456789+()- .")
        if any(ch not in allowed for ch in value):
            raise ValueError("Phone number contains invalid characters.")
        digits = sum(1 for ch in value if ch.isdigit())
        if digits < 7 or digits > 15:
            raise ValueError("Enter a valid phone number.")
        return value

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob(cls, value: date | None) -> date | None:
        if value is None:
            return None
        today = date.today()
        if value > today:
            raise ValueError("Date of birth cannot be in the future.")
        age_years = (today - value).days / 365.25
        if age_years > 120:
            raise ValueError("Enter a valid date of birth.")
        if age_years < 5:
            raise ValueError("Patients must be at least 5 years old to use Stride.")
        return value

    @field_validator("camera_analysis_consent")
    @classmethod
    def require_camera_consent(cls, value: bool) -> bool:
        if not value:
            raise ValueError("Camera consent is required to complete onboarding.")
        return value


class TherapistOnboardingIn(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    license_number: str = Field(min_length=1, max_length=80)
    clinic_name: str = Field(min_length=1, max_length=255)
    specialty: str | None = Field(default=None, max_length=120)

    @field_validator("full_name", "license_number", "clinic_name")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("This field is required.")
        return cleaned

    @field_validator("phone", "specialty")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class GoogleAuthIn(BaseModel):
    email: str
    full_name: str
    role: Literal["patient", "physiotherapist"]
    provider_id: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: Role
    status: AccountStatus
    email_verified: bool = False
    date_of_birth: date | None = None
    therapist_id: str | None = None
    body_region: str | None = None
    rehab_goal: str | None = None
    notes: str | None = None
    phone: str | None = None
    license_number: str | None = None
    clinic_name: str | None = None
    specialty: str | None = None
    invite_code: str | None = None

    model_config = {"from_attributes": True}


class TherapistContactOut(BaseModel):
    full_name: str
    phone: str | None = None
    clinic_name: str | None = None


class ChangeTherapistIn(BaseModel):
    therapist_invite_code: str = Field(min_length=4, max_length=16)


class PatientProfileUpdateIn(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    notes: str | None = Field(default=None, max_length=500)
    date_of_birth: date | None = None
    body_region: BodyRegion | None = None
    rehab_goal: str | None = Field(default=None, min_length=1, max_length=280)


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
    reason: str | None = Field(default=None, max_length=500)
    plan_id: str | None = None
    week_number: int | None = Field(default=None, ge=1, le=52)


class AppointmentStatusUpdate(BaseModel):
    status: Literal["completed", "cancelled"]


class AppointmentOut(BaseModel):
    id: str
    patient_id: str
    therapist_id: str
    scheduled_at: datetime
    status: AppointmentStatus
    reason: str | None
    patient_name: str | None = None
    therapist_name: str | None = None
    plan_id: str | None = None
    week_number: int | None = None

    model_config = {"from_attributes": True}


class ConsultationParticipant(BaseModel):
    id: str
    full_name: str
    role: Role
    clinic_name: str | None = None
    specialty: str | None = None


class ConsultationExercise(BaseModel):
    name: str
    target_sets: int
    target_repetitions: int
    frequency_note: str = ""
    week_number: int | None = None


class ConsultationPlan(BaseModel):
    id: str
    title: str
    goal: str = ""
    items: list[ConsultationExercise] = []


class ConsultationContext(BaseModel):
    appointment_id: str
    scheduled_at: datetime
    status: AppointmentStatus
    reason: str | None
    patient: ConsultationParticipant
    therapist: ConsultationParticipant
    plan: ConsultationPlan | None = None
    room_name: str


class ConsultationJoinOut(BaseModel):
    livekit_url: str
    token: str
    token_expires_at: datetime
    identity: str
    role: Role
    display_name: str
    consultation: ConsultationContext


class ConsultationEndOut(BaseModel):
    appointment_id: str
    status: AppointmentStatus
    room_closed: bool


class ExerciseCreate(BaseModel):
    name: str
    instructions: str
    safety_notes: str
    body_region: str = "general"
    category: str = "strength"
    default_sets: int = Field(default=2, ge=1, le=10)
    default_repetitions: int = Field(default=8, ge=1, le=50)
    demo_cue: str = ""
    pose_recipe_key: str | None = None


class ExerciseUpdate(BaseModel):
    name: str | None = None
    instructions: str | None = None
    safety_notes: str | None = None
    body_region: str | None = None
    category: str | None = None
    default_sets: int | None = Field(default=None, ge=1, le=10)
    default_repetitions: int | None = Field(default=None, ge=1, le=50)
    demo_cue: str | None = None
    pose_recipe_key: str | None = None


class ExerciseOut(BaseModel):
    id: str
    name: str
    instructions: str
    safety_notes: str
    body_region: str
    category: str
    default_sets: int
    default_repetitions: int
    demo_cue: str
    pose_recipe_key: str | None
    is_system: bool
    created_by_id: str | None = None
    source_id: str | None = None
    source: str | None = None

    model_config = {"from_attributes": True}


class PlanItemIn(BaseModel):
    exercise_id: str
    target_sets: int = Field(ge=1, le=10)
    target_repetitions: int = Field(ge=1, le=50)
    week_number: int = Field(default=1, ge=1, le=16)
    day_of_week: int | None = Field(default=None, ge=0, le=6)
    session_type: SessionType = "home"
    sort_order: int = 0
    frequency_note: str = ""


class PlanCreate(BaseModel):
    patient_id: str
    title: str
    start_date: date
    duration_weeks: int = Field(default=4, ge=1, le=16)
    goal: str = ""
    items: list[PlanItemIn]


class PlanItemOut(BaseModel):
    id: str
    exercise_id: str
    exercise_name: str
    target_sets: int
    target_repetitions: int
    instructions: str
    safety_notes: str
    week_number: int
    day_of_week: int | None
    session_type: SessionType
    sort_order: int
    frequency_note: str
    body_region: str = "general"
    pose_recipe_key: str | None = None
    demo_cue: str = ""


class PlanOut(BaseModel):
    id: str
    patient_id: str
    therapist_id: str
    title: str
    start_date: date
    duration_weeks: int
    goal: str
    status: PlanStatus
    items: list[PlanItemOut] = []


class SessionCreate(BaseModel):
    plan_exercise_id: str


class ObservationItemIn(BaseModel):
    metric: str = Field(min_length=1, max_length=100)
    value: float
    confidence: float = Field(ge=0, le=1)


class SessionComplete(BaseModel):
    reported_repetitions: int = Field(ge=0, le=200)
    patient_notes: str | None = None
    metric: str = "repetitions"
    value: float
    confidence: float = Field(ge=0, le=1)
    observations: list[ObservationItemIn] | None = None


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
    original_value: float | None = None
    patient_id: str | None = None
    patient_name: str | None = None
    exercise_name: str | None = None
    plan_title: str | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None
    reported_repetitions: int | None = None
    patient_notes: str | None = None
    target_sets: int | None = None
    target_repetitions: int | None = None
    created_at: datetime | None = None


class ObservationReview(BaseModel):
    review_status: ReviewStatus
    therapist_comment: str | None = None
    value: float | None = None


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
