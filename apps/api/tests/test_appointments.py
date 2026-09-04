import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi.testclient import TestClient

from app.main import app


def _login(client: TestClient, email: str, password: str = "StrideClinic1!") -> str:
    res = client.post("/auth/token", data={"username": email, "password": password})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_appointment_lifecycle_scoping_and_complete():
    with TestClient(app) as client:
        therapist = _login(client, "therapist@stride.clinic")
        patient = _login(client, "riyaz@stride.clinic")

        patients = client.get("/patients", headers=_auth(therapist))
        assert patients.status_code == 200
        patient_id = next(p["id"] for p in patients.json() if p["email"] == "riyaz@stride.clinic")

        when = (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat()
        created = client.post(
            "/appointments",
            headers=_auth(therapist),
            json={"patient_id": patient_id, "scheduled_at": when, "reason": "Progress check"},
        )
        assert created.status_code == 201, created.text
        appt = created.json()
        assert appt["status"] == "scheduled"
        assert appt["patient_name"]
        assert appt["therapist_name"]
        appt_id = appt["id"]

        dup = client.post(
            "/appointments",
            headers=_auth(therapist),
            json={"patient_id": patient_id, "scheduled_at": when, "reason": "Duplicate"},
        )
        assert dup.status_code == 400

        past = client.post(
            "/appointments",
            headers=_auth(therapist),
            json={
                "patient_id": patient_id,
                "scheduled_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
                "reason": "Too old",
            },
        )
        assert past.status_code == 400

        patient_list = client.get("/appointments", headers=_auth(patient))
        assert patient_list.status_code == 200
        assert any(row["id"] == appt_id for row in patient_list.json())

        got = client.get(f"/appointments/{appt_id}", headers=_auth(patient))
        assert got.status_code == 200
        assert got.json()["id"] == appt_id

        # Patient cannot mark complete
        denied = client.patch(
            f"/appointments/{appt_id}",
            headers=_auth(patient),
            json={"status": "completed"},
        )
        assert denied.status_code == 403

        done = client.patch(
            f"/appointments/{appt_id}",
            headers=_auth(therapist),
            json={"status": "completed"},
        )
        assert done.status_code == 200
        assert done.json()["status"] == "completed"

        again = client.patch(
            f"/appointments/{appt_id}",
            headers=_auth(therapist),
            json={"status": "cancelled"},
        )
        assert again.status_code == 400


def test_patient_cannot_see_other_appointments():
    with TestClient(app) as client:
        therapist = _login(client, "therapist@stride.clinic")
        patient = _login(client, "riyaz@stride.clinic")

        patients = client.get("/patients", headers=_auth(therapist))
        assert patients.status_code == 200
        other = next(
            (p for p in patients.json() if p["email"] == "other.patient@stride.clinic"),
            None,
        )
        if other is None:
            created_patient = client.post(
                "/patients",
                headers=_auth(therapist),
                json={
                    "full_name": "Other Patient",
                    "email": "other.patient@stride.clinic",
                    "password": "StrideClinic1!",
                },
            )
            assert created_patient.status_code == 201, created_patient.text
            other_id = created_patient.json()["id"]
        else:
            other_id = other["id"]

        when = (datetime.now(timezone.utc) + timedelta(hours=5)).isoformat()
        created = client.post(
            "/appointments",
            headers=_auth(therapist),
            json={
                "patient_id": other_id,
                "scheduled_at": when,
                "reason": "Private visit",
            },
        )
        assert created.status_code == 201, created.text
        foreign_id = created.json()["id"]

        mine = client.get("/appointments", headers=_auth(patient)).json()
        assert all(row["id"] != foreign_id for row in mine)
        for row in mine:
            assert row["patient_id"]
            detail = client.get(f"/appointments/{row['id']}", headers=_auth(patient))
            assert detail.status_code == 200

        blocked = client.get(f"/appointments/{foreign_id}", headers=_auth(patient))
        assert blocked.status_code == 404
