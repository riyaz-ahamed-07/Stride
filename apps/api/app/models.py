import uuid
from datetime import date, datetime
from enum import Enum as PyEnum

from sqlalchemy import Boolean, Date, DateTime, Enum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def new_id() -> str:
    return str(uuid.uuid4())


class UserRole(str, PyEnum):
    patient = "patient"
    physiotherapist = "physiotherapist"
    administrator = "administrator"


class AccountStatus(str, PyEnum):
    pending_email = "pending_email"
    pending_onboarding = "pending_onboarding"
    pending_approval = "pending_approval"
    active = "active"
    inactive = "inactive"


class AppointmentStatus(str, PyEnum):
    scheduled = "scheduled"
    completed = "completed"
    cancelled = "cancelled"


class PlanStatus(str, PyEnum):
    draft = "draft"
    active = "active"
    completed = "completed"


class SessionStatus(str, PyEnum):
    in_progress = "in_progress"
    completed = "completed"
    abandoned = "abandoned"


class ReviewStatus(str, PyEnum):
    pending = "pending"
    approved = "approved"
    corrected = "corrected"
    rejected = "rejected"


class ConsentStatus(str, PyEnum):
    granted = "granted"
    revoked = "revoked"


class SessionType(str, PyEnum):
    home = "home"
    supervised = "supervised"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255), default="")
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole))
    status: Mapped[AccountStatus] = mapped_column(
        Enum(AccountStatus), default=AccountStatus.pending_email
    )
    auth_provider: Mapped[str] = mapped_column(String(32), default="email")
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    license_number: Mapped[str | None] = mapped_column(String(80), nullable=True)
    clinic_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    specialty: Mapped[str | None] = mapped_column(String(120), nullable=True)
    invite_code: Mapped[str | None] = mapped_column(String(16), unique=True, nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    therapist_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    body_region: Mapped[str | None] = mapped_column(String(40), nullable=True)
    rehab_goal: Mapped[str | None] = mapped_column(String(280), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    therapist: Mapped["User | None"] = relationship("User", remote_side=[id], foreign_keys=[therapist_id])


class EmailOtp(Base):
    __tablename__ = "email_otps"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(255), index=True)
    code_hash: Mapped[str] = mapped_column(String(128))
    purpose: Mapped[str] = mapped_column(String(32))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    consumed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    token_hash: Mapped[str] = mapped_column(String(128))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    consumed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    therapist_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    plan_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("rehabilitation_plans.id"), nullable=True)
    week_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[AppointmentStatus] = mapped_column(Enum(AppointmentStatus), default=AppointmentStatus.scheduled)
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    patient: Mapped[User] = relationship(foreign_keys=[patient_id])
    therapist: Mapped[User] = relationship(foreign_keys=[therapist_id])


class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    instructions: Mapped[str] = mapped_column(Text)
    safety_notes: Mapped[str] = mapped_column(Text)
    body_region: Mapped[str] = mapped_column(String(80), default="general")
    category: Mapped[str] = mapped_column(String(80), default="strength")
    default_sets: Mapped[int] = mapped_column(Integer, default=2)
    default_repetitions: Mapped[int] = mapped_column(Integer, default=8)
    demo_cue: Mapped[str] = mapped_column(Text, default="")
    pose_recipe_key: Mapped[str | None] = mapped_column(String(80), nullable=True)
    source_id: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    source: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_by_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class RehabilitationPlan(Base):
    __tablename__ = "rehabilitation_plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    therapist_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(255))
    start_date: Mapped[date] = mapped_column(Date)
    duration_weeks: Mapped[int] = mapped_column(Integer, default=4)
    goal: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[PlanStatus] = mapped_column(Enum(PlanStatus), default=PlanStatus.active)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    patient: Mapped[User] = relationship(foreign_keys=[patient_id])
    therapist: Mapped[User] = relationship(foreign_keys=[therapist_id])
    items: Mapped[list["PlanExercise"]] = relationship(
        back_populates="plan", cascade="all, delete-orphan", order_by="PlanExercise.sort_order"
    )


class PlanExercise(Base):
    __tablename__ = "plan_exercises"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    plan_id: Mapped[str] = mapped_column(String(36), ForeignKey("rehabilitation_plans.id"))
    exercise_id: Mapped[str] = mapped_column(String(36), ForeignKey("exercises.id"))
    target_sets: Mapped[int] = mapped_column(Integer)
    target_repetitions: Mapped[int] = mapped_column(Integer)
    week_number: Mapped[int] = mapped_column(Integer, default=1)
    day_of_week: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 0=Mon … 6=Sun
    session_type: Mapped[str] = mapped_column(String(20), default=SessionType.home.value)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    frequency_note: Mapped[str] = mapped_column(String(120), default="")

    plan: Mapped[RehabilitationPlan] = relationship(back_populates="items")
    exercise: Mapped[Exercise] = relationship()


class ExerciseSession(Base):
    __tablename__ = "exercise_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    plan_exercise_id: Mapped[str] = mapped_column(String(36), ForeignKey("plan_exercises.id"))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[SessionStatus] = mapped_column(Enum(SessionStatus), default=SessionStatus.in_progress)
    reported_repetitions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    patient_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    plan_exercise: Mapped[PlanExercise] = relationship()
    observations: Mapped[list["MovementObservation"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )


class MovementObservation(Base):
    __tablename__ = "movement_observations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("exercise_sessions.id"))
    metric: Mapped[str] = mapped_column(String(100))
    value: Mapped[float] = mapped_column(Float)
    confidence: Mapped[float] = mapped_column(Float)
    review_status: Mapped[ReviewStatus] = mapped_column(Enum(ReviewStatus), default=ReviewStatus.pending)
    therapist_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    original_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    session: Mapped[ExerciseSession] = relationship(back_populates="observations")


class ConsentRecord(Base):
    __tablename__ = "consent_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    purpose: Mapped[str] = mapped_column(String(100))
    status: Mapped[ConsentStatus] = mapped_column(Enum(ConsentStatus), default=ConsentStatus.granted)
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
