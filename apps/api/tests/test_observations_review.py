import os
import sys
import tempfile
from pathlib import Path

_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp.close()
os.environ["STRIDE_DATABASE_URL"] = f"sqlite:///{Path(_tmp.name).as_posix()}"
os.environ["STRIDE_ENV"] = "dev"

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi.testclient import TestClient

from app.main import app
from app.seed import DEMO_PASSWORD, DEMO_PATIENT_EMAIL, DEMO_THERAPIST_EMAIL


def _login(client: TestClient, email: str) -> str:
    response = client.post("/auth/token", data={"username": email, "password": DEMO_PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def test_patient_sees_only_confirmed_observations():
    with TestClient(app) as client:
        token = _login(client, DEMO_PATIENT_EMAIL)
        rows = client.get("/observations", headers={"Authorization": f"Bearer {token}"})
        assert rows.status_code == 200
        body = rows.json()
        assert body
        assert all(row["review_status"] in ("approved", "corrected") for row in body)
        assert all(row.get("exercise_name") for row in body)


def test_therapist_can_approve_correct_reject_with_audit():
    with TestClient(app) as client:
        token = _login(client, DEMO_THERAPIST_EMAIL)
        headers = {"Authorization": f"Bearer {token}"}
        rows = client.get("/observations", headers=headers)
        assert rows.status_code == 200
        pending = [row for row in rows.json() if row["review_status"] == "pending"]
        assert pending
        target = pending[0]
        assert target.get("target_repetitions") is not None
        assert target.get("started_at")

        approved = client.patch(
            f"/observations/{target['id']}",
            headers=headers,
            json={"review_status": "approved", "therapist_comment": "Confirmed for record."},
        )
        assert approved.status_code == 200
        assert approved.json()["review_status"] == "approved"

        # Idempotent duplicate approval
        again = client.patch(
            f"/observations/{target['id']}",
            headers=headers,
            json={"review_status": "approved", "therapist_comment": "Confirmed for record."},
        )
        assert again.status_code == 200
        assert again.json()["review_status"] == "approved"

        corrected = client.patch(
            f"/observations/{target['id']}",
            headers=headers,
            json={
                "review_status": "corrected",
                "value": target["value"] + 1,
                "therapist_comment": "Adjusted counted reps after video check.",
            },
        )
        assert corrected.status_code == 200
        body = corrected.json()
        assert body["review_status"] == "corrected"
        assert body["original_value"] == target["value"]
        assert body["value"] == target["value"] + 1

        rejected = client.patch(
            f"/observations/{target['id']}",
            headers=headers,
            json={"review_status": "rejected", "therapist_comment": "Repeat with clinic guidance."},
        )
        assert rejected.status_code == 200
        assert rejected.json()["review_status"] == "rejected"

        patient_token = _login(client, DEMO_PATIENT_EMAIL)
        patient_rows = client.get(
            "/observations",
            headers={"Authorization": f"Bearer {patient_token}"},
        )
        assert all(row["id"] != target["id"] for row in patient_rows.json())


def test_reject_requires_comment():
    with TestClient(app) as client:
        token = _login(client, DEMO_THERAPIST_EMAIL)
        headers = {"Authorization": f"Bearer {token}"}
        # Create a fresh pending observation via completing a session is heavy;
        # reuse any observation and move to pending first if needed.
        rows = client.get("/observations", headers=headers).json()
        assert rows
        obs = rows[0]
        response = client.patch(
            f"/observations/{obs['id']}",
            headers=headers,
            json={"review_status": "rejected", "therapist_comment": ""},
        )
        assert response.status_code == 400
