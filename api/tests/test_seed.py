import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi.testclient import TestClient

from app.main import app
from app.models import (
    AccountStatus,
    Appointment,
    AppointmentStatus,
    Exercise,
    ExerciseSession,
    MovementObservation,
    RehabilitationPlan,
    ReviewStatus,
    SessionStatus,
    User,
    UserRole,
)
from app.seed import (
    DEMO_ADMIN_EMAIL,
    DEMO_APPOINTMENT_REASON,
    DEMO_INVITE_CODE,
    DEMO_PASSWORD,
    DEMO_PATIENT_EMAIL,
    DEMO_PLAN_SOURCE_IDS,
    DEMO_PLAN_TITLE,
    DEMO_THERAPIST_EMAIL,
    OPEN_REHAB_SOURCE,
    seed_demo,
)


def _login(client: TestClient, email: str) -> dict:
    response = client.post("/auth/token", data={"username": email, "password": DEMO_PASSWORD})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "active"
    assert body["email_verified"] is True
    return body


def test_seed_demo_is_idempotent_and_usable():
    with TestClient(app) as client:
        from app.db import SessionLocal

        assert SessionLocal is not None
        db = SessionLocal()
        try:
            seed_demo(db)
            seed_demo(db)

            admins = db.query(User).filter(User.email == DEMO_ADMIN_EMAIL).all()
            therapists = db.query(User).filter(User.email == DEMO_THERAPIST_EMAIL).all()
            patients = db.query(User).filter(User.email == DEMO_PATIENT_EMAIL).all()
            assert len(admins) == 1
            assert len(therapists) == 1
            assert len(patients) == 1

            admin, therapist, patient = admins[0], therapists[0], patients[0]
            assert admin.role == UserRole.administrator
            assert admin.status == AccountStatus.active
            assert therapist.role == UserRole.physiotherapist
            assert therapist.status == AccountStatus.active
            assert therapist.invite_code == DEMO_INVITE_CODE
            assert therapist.license_number
            assert therapist.clinic_name
            assert patient.role == UserRole.patient
            assert patient.status == AccountStatus.active
            assert patient.therapist_id == therapist.id

            catalog = db.query(Exercise).filter(Exercise.source == OPEN_REHAB_SOURCE).count()
            assert catalog >= len(DEMO_PLAN_SOURCE_IDS)

            plans = (
                db.query(RehabilitationPlan)
                .filter(
                    RehabilitationPlan.patient_id == patient.id,
                    RehabilitationPlan.therapist_id == therapist.id,
                    RehabilitationPlan.title == DEMO_PLAN_TITLE,
                )
                .all()
            )
            assert len(plans) == 1
            plan = plans[0]
            source_ids = {item.exercise.source_id for item in plan.items}
            assert set(DEMO_PLAN_SOURCE_IDS) <= source_ids

            appointments = (
                db.query(Appointment)
                .filter(
                    Appointment.patient_id == patient.id,
                    Appointment.therapist_id == therapist.id,
                    Appointment.reason == DEMO_APPOINTMENT_REASON,
                    Appointment.status == AppointmentStatus.scheduled,
                )
                .all()
            )
            assert len(appointments) == 1

            item_ids = [item.id for item in plan.items]
            sessions = db.query(ExerciseSession).filter(ExerciseSession.plan_exercise_id.in_(item_ids)).all()
            assert sessions
            assert all(row.status == SessionStatus.completed for row in sessions)
            observations = (
                db.query(MovementObservation)
                .join(ExerciseSession, MovementObservation.session_id == ExerciseSession.id)
                .filter(ExerciseSession.plan_exercise_id.in_(item_ids))
                .all()
            )
            assert observations
            assert any(row.review_status == ReviewStatus.approved for row in observations)
            assert any(row.review_status == ReviewStatus.pending for row in observations)

            done = {row.plan_exercise_id for row in sessions if row.status == SessionStatus.completed}
            progress = round(len(done) / len(plan.items) * 100)
            assert 0 < progress < 100
        finally:
            db.close()

        admin_login = _login(client, DEMO_ADMIN_EMAIL)
        assert admin_login["role"] == "administrator"

        therapist_login = _login(client, DEMO_THERAPIST_EMAIL)
        assert therapist_login["role"] == "physiotherapist"
        headers = {"Authorization": f"Bearer {therapist_login['access_token']}"}
        patients = client.get("/patients", headers=headers)
        assert patients.status_code == 200
        bound = [row for row in patients.json() if row["email"] == DEMO_PATIENT_EMAIL]
        assert len(bound) == 1
        assert bound[0]["therapist_id"] == therapist_login["user_id"]

        patient_login = _login(client, DEMO_PATIENT_EMAIL)
        assert patient_login["role"] == "patient"
        patient_headers = {"Authorization": f"Bearer {patient_login['access_token']}"}
        plans = client.get("/plans", headers=patient_headers)
        assert plans.status_code == 200
        assert plans.json()[0]["title"] == DEMO_PLAN_TITLE
        appts = client.get("/appointments", headers=patient_headers)
        assert appts.status_code == 200
        scheduled = [row for row in appts.json() if row["status"] == "scheduled"]
        assert scheduled, "seed should keep a scheduled consultation available"
        sessions = client.get("/sessions", headers=patient_headers)
        assert sessions.status_code == 200
        assert sessions.json()
        approved = client.get("/observations", headers=patient_headers)
        assert approved.status_code == 200
        assert approved.json()
        assert all(row["review_status"] in ("approved", "corrected") for row in approved.json())
