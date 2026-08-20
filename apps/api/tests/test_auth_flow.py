from fastapi.testclient import TestClient

from app.main import app


def test_health_and_login_and_patient_flow():
    with TestClient(app) as client:
        assert client.get("/health").json()["status"] == "ok"
        token = client.post(
            "/auth/token",
            data={"username": "kamala@stride.clinic", "password": "StrideClinic1!"},
        )
        assert token.status_code == 200
        access = token.json()["access_token"]
        me = client.get("/auth/me", headers={"Authorization": f"Bearer {access}"})
        assert me.status_code == 200
        assert me.json()["role"] == "patient"
        plans = client.get("/plans", headers={"Authorization": f"Bearer {access}"})
        assert plans.status_code == 200
        assert plans.json()


def test_therapist_cannot_be_skipped():
    with TestClient(app) as client:
        denied = client.get("/patients")
        assert denied.status_code == 401
        token = client.post(
            "/auth/token",
            data={"username": "therapist@stride.clinic", "password": "StrideClinic1!"},
        ).json()["access_token"]
        patients = client.get("/patients", headers={"Authorization": f"Bearer {token}"})
        assert patients.status_code == 200
        assert any(row["email"] == "kamala@stride.clinic" for row in patients.json())
