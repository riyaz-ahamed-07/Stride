import uuid
from datetime import date, datetime
from enum import Enum as PyEnum

from sqlalchemy import Date, DateTime, Enum, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def new_id() -> str:
    return str(uuid.uuid4())


class UserRole(str, PyEnum):
    patient = "patient"
    physiotherapist = "physiotherapist"
    administrator = "administrator"


class AccountStatus(str, PyEnum):
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


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole))
    status: Mapped[AccountStatus] = mapped_column(Enum(AccountStatus), default=AccountStatus.active)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    therapist_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    therapist: Mapped["User | None"] = relationship("User", remote_side=[id], foreign_keys=[therapist_id])


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    therapist_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class RehabilitationPlan(Base):
    __tablename__ = "rehabilitation_plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    therapist_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(255))
    start_date: Mapped[date] = mapped_column(Date)
    status: Mapped[PlanStatus] = mapped_column(Enum(PlanStatus), default=PlanStatus.active)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    patient: Mapped[User] = relationship(foreign_keys=[patient_id])
    therapist: Mapped[User] = relationship(foreign_keys=[therapist_id])
    items: Mapped[list["PlanExercise"]] = relationship(back_populates="plan", cascade="all, delete-orphan")


class PlanExercise(Base):
    __tablename__ = "plan_exercises"
    __table_args__ = (UniqueConstraint("plan_id", "exercise_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    plan_id: Mapped[str] = mapped_column(String(36), ForeignKey("rehabilitation_plans.id"))
    exercise_id: Mapped[str] = mapped_column(String(36), ForeignKey("exercises.id"))
    target_sets: Mapped[int] = mapped_column(Integer)
    target_repetitions: Mapped[int] = mapped_column(Integer)

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
    observations: Mapped[list["MovementObservation"]] = relationship(back_populates="session", cascade="all, delete-orphan")


class MovementObservation(Base):
    __tablename__ = "movement_observations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("exercise_sessions.id"))
    metric: Mapped[str] = mapped_column(String(100))
    value: Mapped[float] = mapped_column(Float)
    confidence: Mapped[float] = mapped_column(Float)
    review_status: Mapped[ReviewStatus] = mapped_column(Enum(ReviewStatus), default=ReviewStatus.pending)
    therapist_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
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
