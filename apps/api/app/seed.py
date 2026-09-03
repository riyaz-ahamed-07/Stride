"""Development/demo seed for a reproducible SQLite clinic.

Credentials below are **development/demo only**. They are not production secrets.
Override the password with STRIDE_DEMO_PASSWORD if you do not want the default
in your local environment (do not commit real secrets).

Commands (from apps/api):

    python -m app.seed           # idempotent upsert; safe to run repeatedly
    python -m app.seed --reset   # delete the SQLite file, recreate, then seed
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from app.models import (
    AccountStatus,
    Appointment,
    AppointmentStatus,
    ConsentRecord,
    ConsentStatus,
    Exercise,
    ExerciseSession,
    MovementObservation,
    PlanExercise,
    PlanStatus,
    RehabilitationPlan,
    ReviewStatus,
    SessionStatus,
    SessionType,
    User,
    UserRole,
)
from app.open_rehab import POSE_BY_SOURCE, catalog_rows
from app.security import hash_password, verify_password

OPEN_REHAB_SOURCE = "open-rehab-exercises"

# --- Development/demo credentials (not for production) ---
DEMO_PASSWORD = os.getenv("STRIDE_DEMO_PASSWORD", "StrideClinic1!")
DEMO_INVITE_CODE = "THERAP01"
DEMO_ADMIN_EMAIL = "admin@stride.clinic"
DEMO_THERAPIST_EMAIL = "therapist@stride.clinic"
DEMO_PATIENT_EMAIL = "riyaz@stride.clinic"
DEMO_PLAN_TITLE = "Week 1 — knee strength"
DEMO_APPOINTMENT_REASON = "Review home exercises and knee comfort"
DEMO_CONSENT_PURPOSE = "camera_analysis"

# Pose-enabled library entries the current rehab / move flow expects, plus
# supporting knee work so the assigned plan is realistic.
DEMO_PLAN_SOURCE_IDS = (
    "ex-sit-to-stand",
    "ex-heel-slides",
    "ex-slr-flexion",
    "ex-mini-squats-wall",
)


def ensure_system_exercises(db: Session) -> None:
    rows = catalog_rows()
    if not rows:
        return
    for row in rows:
        existing = (
            db.query(Exercise).filter(Exercise.source_id == row["source_id"]).first()
            or db.query(Exercise).filter(Exercise.name == row["name"]).first()
        )
        payload = {**row, "source": OPEN_REHAB_SOURCE, "is_system": True, "created_by_id": None}
        if existing is None:
            db.add(Exercise(**payload))
            continue
        for key, value in payload.items():
            setattr(existing, key, value)
    db.commit()


def _exercise_by_source(db: Session, source_id: str) -> Exercise | None:
    return db.query(Exercise).filter(Exercise.source_id == source_id).first()


def _ensure_password(user: User, password: str) -> None:
    if not verify_password(password, user.password_hash):
        user.password_hash = hash_password(password)


def _upsert_user(
    db: Session,
    *,
    email: str,
    full_name: str,
    role: UserRole,
    status: AccountStatus,
    extra: dict | None = None,
) -> User:
    email = email.lower()
    user = db.query(User).filter(User.email == email).first()
    fields = extra or {}
    if user is None:
        user = User(
            email=email,
            full_name=full_name,
            password_hash=hash_password(DEMO_PASSWORD),
            role=role,
            status=status,
            email_verified=True,
            auth_provider="email",
            **fields,
        )
        db.add(user)
        db.flush()
        return user
    user.full_name = full_name
    user.role = role
    user.status = status
    user.email_verified = True
    user.auth_provider = "email"
    _ensure_password(user, DEMO_PASSWORD)
    for key, value in fields.items():
        setattr(user, key, value)
    db.flush()
    return user


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _seed_accounts(db: Session) -> tuple[User, User, User]:
    admin = _upsert_user(
        db,
        email=DEMO_ADMIN_EMAIL,
        full_name="Clinic administrator",
        role=UserRole.administrator,
        status=AccountStatus.active,
    )

    holder = db.query(User).filter(User.invite_code == DEMO_INVITE_CODE).first()
    if holder is not None and holder.email.lower() != DEMO_THERAPIST_EMAIL:
        holder.invite_code = None
        db.flush()

    therapist = _upsert_user(
        db,
        email=DEMO_THERAPIST_EMAIL,
        full_name="Arun Krishnan, PT",
        role=UserRole.physiotherapist,
        status=AccountStatus.active,
        extra={
            "invite_code": DEMO_INVITE_CODE,
            "license_number": "PT-DEMO-001",
            "clinic_name": "Stride Academic Clinic",
            "specialty": "Musculoskeletal",
            "phone": "+91 98765 43210",
            "notes": "Supervising physiotherapist for the academic clinic prototype.",
        },
    )

    patient = _upsert_user(
        db,
        email=DEMO_PATIENT_EMAIL,
        full_name="Riyaz Ahamed",
        role=UserRole.patient,
        status=AccountStatus.active,
        extra={
            "date_of_birth": date(1998, 7, 15),
            "therapist_id": therapist.id,
            "phone": "+91 90000 11111",
            "notes": "Knee rehabilitation after supervised clinic assessment.",
        },
    )
    return admin, therapist, patient


def _seed_plan(db: Session, *, patient: User, therapist: User) -> RehabilitationPlan | None:
    required = list(DEMO_PLAN_SOURCE_IDS)
    for source_id in POSE_BY_SOURCE:
        if source_id not in required:
            required.append(source_id)

    exercises: list[Exercise] = []
    for source_id in required:
        exercise = _exercise_by_source(db, source_id)
        if exercise is not None:
            exercises.append(exercise)
    if not exercises:
        return None

    plan = (
        db.query(RehabilitationPlan)
        .filter(
            RehabilitationPlan.patient_id == patient.id,
            RehabilitationPlan.therapist_id == therapist.id,
            RehabilitationPlan.title == DEMO_PLAN_TITLE,
        )
        .first()
    )
    if plan is None:
        plan = RehabilitationPlan(
            patient_id=patient.id,
            therapist_id=therapist.id,
            title=DEMO_PLAN_TITLE,
            start_date=date.today() - timedelta(days=3),
            duration_weeks=4,
            goal="Restore sit-to-stand confidence and knee mobility.",
            status=PlanStatus.active,
        )
        db.add(plan)
        db.flush()

    existing_ids = {item.exercise_id for item in plan.items}
    next_order = max((item.sort_order for item in plan.items), default=-1) + 1
    for exercise in exercises:
        if exercise.id in existing_ids:
            continue
        db.add(
            PlanExercise(
                plan_id=plan.id,
                exercise_id=exercise.id,
                target_sets=exercise.default_sets or 2,
                target_repetitions=exercise.default_repetitions or 8,
                week_number=1,
                day_of_week=None,
                session_type=SessionType.home.value,
                sort_order=next_order,
                frequency_note="Daily",
            )
        )
        next_order += 1
        existing_ids.add(exercise.id)
    db.flush()
    db.refresh(plan)
    return plan


def _seed_appointment(db: Session, *, patient: User, therapist: User, plan: RehabilitationPlan) -> Appointment:
    upcoming = (
        db.query(Appointment)
        .filter(
            Appointment.patient_id == patient.id,
            Appointment.therapist_id == therapist.id,
            Appointment.reason == DEMO_APPOINTMENT_REASON,
            Appointment.status == AppointmentStatus.scheduled,
        )
        .first()
    )
    when = datetime.now(timezone.utc) + timedelta(days=2)
    if upcoming is None:
        upcoming = Appointment(
            patient_id=patient.id,
            therapist_id=therapist.id,
            plan_id=plan.id,
            week_number=1,
            scheduled_at=when,
            reason=DEMO_APPOINTMENT_REASON,
            status=AppointmentStatus.scheduled,
        )
        db.add(upcoming)
        db.flush()
        return upcoming
    if _as_utc(upcoming.scheduled_at) <= datetime.now(timezone.utc):
        upcoming.scheduled_at = when
    upcoming.plan_id = plan.id
    upcoming.week_number = 1
    db.flush()
    return upcoming


def _seed_consent(db: Session, *, patient: User) -> None:
    existing = (
        db.query(ConsentRecord)
        .filter(
            ConsentRecord.patient_id == patient.id,
            ConsentRecord.purpose == DEMO_CONSENT_PURPOSE,
        )
        .first()
    )
    if existing is None:
        db.add(
            ConsentRecord(
                patient_id=patient.id,
                purpose=DEMO_CONSENT_PURPOSE,
                status=ConsentStatus.granted,
            )
        )
        db.flush()
        return
    existing.status = ConsentStatus.granted
    existing.revoked_at = None
    db.flush()


def _seed_history(db: Session, *, plan: RehabilitationPlan) -> None:
    """Completed sessions + movement observations. Progress is derived from these rows."""
    by_source = {item.exercise.source_id: item for item in plan.items if item.exercise.source_id}
    history = (
        {
            "source_id": "ex-sit-to-stand",
            "days_ago": 7,
            "reps": 5,
            "notes": "First home sit-to-stand set after clinic visit.",
            "metric": "repetitions",
            "value": 5.0,
            "confidence": 0.79,
            "review_status": ReviewStatus.approved,
            "therapist_comment": "Solid start. Aim for steady tempo next session.",
        },
        {
            "source_id": "ex-sit-to-stand",
            "days_ago": 3,
            "reps": 7,
            "notes": "Felt steady. Last two stands were slower.",
            "metric": "repetitions",
            "value": 7.0,
            "confidence": 0.82,
            "review_status": ReviewStatus.approved,
            "therapist_comment": "Good control through the stand. Keep the same daily pace.",
        },
        {
            "source_id": "ex-heel-slides",
            "days_ago": 1,
            "reps": 10,
            "notes": "Slide felt smoother than the first day.",
            "metric": "repetitions",
            "value": 10.0,
            "confidence": 0.74,
            "review_status": ReviewStatus.pending,
            "therapist_comment": None,
        },
    )
    for row in history:
        item = by_source.get(row["source_id"])
        if item is None:
            continue
        existing = (
            db.query(ExerciseSession)
            .filter(
                ExerciseSession.plan_exercise_id == item.id,
                ExerciseSession.patient_notes == row["notes"],
            )
            .first()
        )
        ended = datetime.now(timezone.utc) - timedelta(days=row["days_ago"])
        started = ended - timedelta(minutes=8)
        if existing is None:
            existing = ExerciseSession(
                plan_exercise_id=item.id,
                started_at=started,
                ended_at=ended,
                status=SessionStatus.completed,
                reported_repetitions=row["reps"],
                patient_notes=row["notes"],
            )
            db.add(existing)
            db.flush()
        else:
            existing.started_at = started
            existing.ended_at = ended
            existing.status = SessionStatus.completed
            existing.reported_repetitions = row["reps"]
        observation = (
            db.query(MovementObservation)
            .filter(
                MovementObservation.session_id == existing.id,
                MovementObservation.metric == row["metric"],
            )
            .first()
        )
        if observation is None:
            db.add(
                MovementObservation(
                    session_id=existing.id,
                    metric=row["metric"],
                    value=row["value"],
                    confidence=row["confidence"],
                    review_status=row["review_status"],
                    therapist_comment=row["therapist_comment"],
                )
            )
        else:
            observation.value = row["value"]
            observation.confidence = row["confidence"]
            observation.review_status = row["review_status"]
            observation.therapist_comment = row["therapist_comment"]
    db.flush()


def seed_demo(db: Session) -> None:
    """Idempotent demo clinic: accounts, Open Rehab plan, appointment, history."""
    ensure_system_exercises(db)
    _admin, therapist, patient = _seed_accounts(db)
    plan = _seed_plan(db, patient=patient, therapist=therapist)
    if plan is not None:
        _seed_appointment(db, patient=patient, therapist=therapist, plan=plan)
        _seed_history(db, plan=plan)
    _seed_consent(db, patient=patient)
    db.commit()


def seed_if_empty(db: Session) -> None:
    """Startup helper. Demo seed is idempotent and will not create duplicates."""
    seed_demo(db)


def default_sqlite_path() -> Path:
    from app.config import ROOT

    return (ROOT / "stride.db").resolve()


def sqlite_path_from_url(database_url: str) -> Path | None:
    if not database_url.startswith("sqlite"):
        return None
    rest = database_url.removeprefix("sqlite:///")
    if rest.startswith(":memory:"):
        return None
    return Path(rest)


def demo_database_url() -> str:
    """CLI always targets local SQLite so a Postgres .env cannot be wiped or seeded by accident."""
    from app.config import DATABASE_URL

    if DATABASE_URL.startswith("sqlite"):
        return DATABASE_URL
    return f"sqlite:///{default_sqlite_path().as_posix()}"


def reset_sqlite(database_url: str) -> Path:
    from app.db import configure_engine

    path = sqlite_path_from_url(database_url)
    if path is None:
        raise SystemExit(
            f"Refusing to reset a non-SQLite database ({database_url}). "
            "Use a fresh SQLite file for the local demo."
        )
    configure_engine(database_url)
    from app.db import engine

    if engine is not None:
        engine.dispose()
    if path.exists():
        try:
            path.unlink()
        except OSError as exc:
            raise SystemExit(
                f"Could not delete {path}. Stop the API server and retry. ({exc})"
            ) from exc
    return path


def _print_summary(db: Session) -> None:
    admin = db.query(User).filter(User.email == DEMO_ADMIN_EMAIL).one()
    therapist = db.query(User).filter(User.email == DEMO_THERAPIST_EMAIL).one()
    patient = db.query(User).filter(User.email == DEMO_PATIENT_EMAIL).one()
    plan = (
        db.query(RehabilitationPlan)
        .filter(
            RehabilitationPlan.patient_id == patient.id,
            RehabilitationPlan.title == DEMO_PLAN_TITLE,
        )
        .first()
    )
    appointment = (
        db.query(Appointment)
        .filter(
            Appointment.patient_id == patient.id,
            Appointment.status == AppointmentStatus.scheduled,
        )
        .first()
    )
    sessions = 0
    observations = 0
    completed_items = 0
    item_count = 0
    if plan is not None:
        item_ids = [item.id for item in plan.items]
        item_count = len(item_ids)
        if item_ids:
            session_rows = (
                db.query(ExerciseSession).filter(ExerciseSession.plan_exercise_id.in_(item_ids)).all()
            )
            sessions = len(session_rows)
            done = {row.plan_exercise_id for row in session_rows if row.status == SessionStatus.completed}
            completed_items = len(done)
            observations = (
                db.query(MovementObservation)
                .join(ExerciseSession, MovementObservation.session_id == ExerciseSession.id)
                .filter(ExerciseSession.plan_exercise_id.in_(item_ids))
                .count()
            )
    progress = round((completed_items / item_count) * 100) if item_count else 0
    catalog = db.query(Exercise).filter(Exercise.source == OPEN_REHAB_SOURCE).count()

    print()
    print("Stride demo seed complete (idempotent).")
    print()
    print("DEVELOPMENT / DEMO CREDENTIALS — not for production")
    print(f"  Administrator   {DEMO_ADMIN_EMAIL}     /  {DEMO_PASSWORD}  [{admin.status.value}]")
    print(
        f"  Physiotherapist {DEMO_THERAPIST_EMAIL} /  {DEMO_PASSWORD}  "
        f"[{therapist.status.value}, invite {therapist.invite_code}]"
    )
    print(
        f"  Patient         {DEMO_PATIENT_EMAIL}     /  {DEMO_PASSWORD}  "
        f"[{patient.status.value}, therapist_id={patient.therapist_id}]"
    )
    print()
    print(f"  Open Rehab catalog : {catalog} exercises")
    if plan is not None:
        print(f"  Plan               : {plan.title} ({item_count} exercises, {plan.status.value})")
    if appointment is not None:
        print(f"  Appointment        : {appointment.scheduled_at} ({appointment.status.value})")
    print(f"  Sessions           : {sessions}")
    print(f"  Observations       : {observations}")
    print(f"  Derived progress   : {progress}%  ({completed_items}/{item_count} plan exercises completed)")
    print()
    print("Reset + seed:  python -m app.seed --reset")
    print("Re-run seed:   python -m app.seed")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Seed the Stride development/demo SQLite database (idempotent)."
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete the local SQLite file, recreate schema, then seed. Never runs against Postgres.",
    )
    args = parser.parse_args(argv)

    database_url = demo_database_url()
    from app.config import DATABASE_URL
    from app.db import Base, configure_engine
    from app.schema_migrate import ensure_schema

    if not DATABASE_URL.startswith("sqlite"):
        print("STRIDE_DATABASE_URL is not SQLite; seeding local file instead.")
        print(f"  {database_url}")

    if args.reset:
        path = reset_sqlite(database_url)
        print(f"Deleted SQLite database: {path}")

    engine = configure_engine(database_url)
    Base.metadata.create_all(bind=engine)
    ensure_schema(engine)
    from app.db import SessionLocal

    if SessionLocal is None:
        raise SystemExit("Database engine is not configured.")
    db = SessionLocal()
    try:
        seed_demo(db)
        print(f"Database: {database_url}")
        _print_summary(db)
    finally:
        db.close()


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as exc:  # pragma: no cover
        print(f"Seed failed: {exc}", file=sys.stderr)
        raise
