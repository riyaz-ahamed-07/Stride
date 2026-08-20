from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import (
    AccountStatus,
    Appointment,
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
    User,
    UserRole,
)
from app.security import hash_password

DEMO_PASSWORD = "StrideClinic1!"


def seed_if_empty(db: Session) -> None:
    if db.query(User).first():
        return

    admin = User(
        email="admin@stride.clinic",
        full_name="Clinic administrator",
        password_hash=hash_password(DEMO_PASSWORD),
        role=UserRole.administrator,
        status=AccountStatus.active,
    )
    therapist = User(
        email="therapist@stride.clinic",
        full_name="Arun Krishnan, PT",
        password_hash=hash_password(DEMO_PASSWORD),
        role=UserRole.physiotherapist,
        status=AccountStatus.active,
        notes="Supervising physiotherapist for the academic clinic prototype.",
    )
    db.add_all([admin, therapist])
    db.flush()

    patient = User(
        email="kamala@stride.clinic",
        full_name="Kamala Devi",
        password_hash=hash_password(DEMO_PASSWORD),
        role=UserRole.patient,
        status=AccountStatus.active,
        date_of_birth=date(1957, 3, 12),
        therapist_id=therapist.id,
        notes="Knee rehabilitation after supervised clinic assessment. Prefers large text and spoken-style instructions.",
    )
    db.add(patient)
    db.flush()

    sit = Exercise(
        name="Sit to stand",
        instructions="Sit on a firm chair. Place both feet on the floor. Stand up slowly, then sit down slowly. That is one repetition.",
        safety_notes="Stop if you feel pain, dizziness, or unsteadiness. Keep a table nearby for support.",
    )
    heel = Exercise(
        name="Seated heel slides",
        instructions="Sit tall. Slide one heel forward along the floor, then bring it back. Switch legs after the set.",
        safety_notes="Do not force the knee. Stop if swelling or sharp pain increases.",
    )
    db.add_all([sit, heel])
    db.flush()

    plan = RehabilitationPlan(
        patient_id=patient.id,
        therapist_id=therapist.id,
        title="Week 1 — knee strength",
        start_date=date.today(),
        status=PlanStatus.active,
    )
    db.add(plan)
    db.flush()

    item = PlanExercise(plan_id=plan.id, exercise_id=sit.id, target_sets=2, target_repetitions=8)
    item2 = PlanExercise(plan_id=plan.id, exercise_id=heel.id, target_sets=2, target_repetitions=10)
    db.add_all([item, item2])
    db.flush()

    db.add(
        Appointment(
            patient_id=patient.id,
            therapist_id=therapist.id,
            scheduled_at=datetime.now(timezone.utc) + timedelta(days=2),
            reason="Review home exercises and knee comfort",
        )
    )
    db.add(
        ConsentRecord(
            patient_id=patient.id,
            purpose="camera_analysis",
            status=ConsentStatus.granted,
        )
    )

    session = ExerciseSession(
        plan_exercise_id=item.id,
        status=SessionStatus.completed,
        ended_at=datetime.now(timezone.utc),
        reported_repetitions=7,
        patient_notes="Felt steady. Last two stands were slower.",
    )
    db.add(session)
    db.flush()
    db.add(
        MovementObservation(
            session_id=session.id,
            metric="repetitions",
            value=7,
            confidence=0.82,
            review_status=ReviewStatus.pending,
        )
    )
    db.commit()
