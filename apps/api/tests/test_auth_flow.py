import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi.testclient import TestClient

from app.main import app
from app.models import AccountStatus, User, UserRole
from app.security import hash_password


def _bootstrap_admin(client: TestClient) -> str:
    from app.db import SessionLocal

    # Prefer demo seed admin when present (seed_if_empty runs on startup).
    demo = client.post(
        "/auth/token",
        data={"username": "admin@stride.clinic", "password": "StrideClinic1!"},
    )
    if demo.status_code == 200:
        return demo.json()["access_token"]

    db = SessionLocal()
    try:
        if not db.query(User).filter(User.email == "admin@test.stride").first():
            db.add(
                User(
                    email="admin@test.stride",
                    full_name="Test Admin",
                    password_hash=hash_password("TestAdmin1!"),
                    role=UserRole.administrator,
                    status=AccountStatus.active,
                    email_verified=True,
                )
            )
            db.commit()
    finally:
        db.close()
    token = client.post(
        "/auth/token",
        data={"username": "admin@test.stride", "password": "TestAdmin1!"},
    )
    assert token.status_code == 200
    return token.json()["access_token"]


def test_health_and_register_flow():
    with TestClient(app) as client:
        assert client.get("/health").json()["status"] == "ok"
        reg = client.post(
            "/auth/register",
            json={"email": "patient@test.stride", "password": "Patient1!Aa", "role": "patient"},
        )
        assert reg.status_code == 201
        body = reg.json()
        assert body["status"] == "pending_email"
        assert body.get("dev_code") and len(body["dev_code"]) == 6


def test_login_requires_active_account():
    with TestClient(app) as client:
        denied = client.get("/patients")
        assert denied.status_code == 401
        token = _bootstrap_admin(client)
        users = client.get("/admin/users", headers={"Authorization": f"Bearer {token}"})
        assert users.status_code == 200


def test_approve_therapist_returns_invite_code():
    with TestClient(app) as client:
        admin_token = _bootstrap_admin(client)
        reg = client.post(
            "/auth/register",
            json={"email": "pt@test.stride", "password": "Therapist1!", "role": "physiotherapist"},
        )
        assert reg.status_code == 201
        otp = reg.json()["dev_code"]
        verified = client.post("/auth/verify-otp", json={"email": "pt@test.stride", "code": otp})
        assert verified.status_code == 200
        pt_token = verified.json()["access_token"]
        onboard = client.post(
            "/auth/onboarding/therapist",
            headers={"Authorization": f"Bearer {pt_token}"},
            json={
                "full_name": "Test PT",
                "license_number": "PT-1",
                "clinic_name": "Clinic",
                "specialty": "MSK",
            },
        )
        assert onboard.status_code == 200
        assert onboard.json()["status"] == "pending_approval"
        user_id = onboard.json()["user_id"]
        pending_token = onboard.json()["access_token"]

        denied = client.get("/patients", headers={"Authorization": f"Bearer {pending_token}"})
        assert denied.status_code == 403

        unauth = client.post(f"/admin/users/{user_id}/approve", headers={"Authorization": f"Bearer {pending_token}"})
        assert unauth.status_code == 403

        pending = client.get("/admin/users/pending", headers={"Authorization": f"Bearer {admin_token}"})
        assert pending.status_code == 200
        match = next((u for u in pending.json() if u["id"] == user_id), None)
        assert match is not None
        assert match["full_name"] == "Test PT"
        assert match["license_number"] == "PT-1"
        assert match["clinic_name"] == "Clinic"
        assert match["specialty"] == "MSK"

        approved = client.post(
            f"/admin/users/{user_id}/approve",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert approved.status_code == 200
        body = approved.json()
        assert body["status"] == "active"
        assert body.get("invite_code")

        login = client.post(
            "/auth/token",
            data={"username": "pt@test.stride", "password": "Therapist1!"},
        )
        assert login.status_code == 200
        assert login.json()["status"] == "active"
        me = client.get("/auth/me", headers={"Authorization": f"Bearer {login.json()['access_token']}"})
        assert me.status_code == 200
        assert me.json()["invite_code"] == body["invite_code"]
        assert me.json()["status"] == "active"

        patients = client.get("/patients", headers={"Authorization": f"Bearer {login.json()['access_token']}"})
        assert patients.status_code == 200


def test_reject_therapist_blocks_login():
    with TestClient(app) as client:
        admin_token = _bootstrap_admin(client)
        email = "pt-reject@test.stride"
        reg = client.post(
            "/auth/register",
            json={"email": email, "password": "Therapist1!", "role": "physiotherapist"},
        )
        assert reg.status_code == 201
        otp = reg.json()["dev_code"]
        verified = client.post("/auth/verify-otp", json={"email": email, "code": otp})
        pt_token = verified.json()["access_token"]
        onboard = client.post(
            "/auth/onboarding/therapist",
            headers={"Authorization": f"Bearer {pt_token}"},
            json={
                "full_name": "Rejected PT",
                "license_number": "PT-R",
                "clinic_name": "Clinic",
            },
        )
        assert onboard.status_code == 200
        user_id = onboard.json()["user_id"]
        rejected = client.post(
            f"/admin/users/{user_id}/reject",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert rejected.status_code == 200
        assert rejected.json()["status"] == "inactive"
        login = client.post("/auth/token", data={"username": email, "password": "Therapist1!"})
        assert login.status_code == 403
        assert "inactive" in login.json()["detail"].lower()


def test_forgot_password_returns_dev_token():
    with TestClient(app) as client:
        reg = client.post(
            "/auth/register",
            json={"email": "reset@test.stride", "password": "ResetMe1!", "role": "patient"},
        )
        assert reg.status_code == 201
        forgot = client.post("/auth/forgot-password", json={"email": "reset@test.stride"})
        assert forgot.status_code == 200
        assert forgot.json().get("dev_reset_token")


def test_google_auth_disabled():
    with TestClient(app) as client:
        response = client.post(
            "/auth/google",
            json={
                "email": "evil@example.com",
                "full_name": "Nope",
                "role": "patient",
                "provider_id": "x",
            },
        )
        assert response.status_code == 501


def _register_verify_patient(client: TestClient, email: str) -> str:
    reg = client.post(
        "/auth/register",
        json={"email": email, "password": "Patient1!Aa", "role": "patient"},
    )
    assert reg.status_code == 201
    otp = reg.json()["dev_code"]
    verified = client.post("/auth/verify-otp", json={"email": email, "code": otp})
    assert verified.status_code == 200
    assert verified.json()["status"] == "pending_onboarding"
    return verified.json()["access_token"]


def _demo_invite(client: TestClient) -> str:
    """Seed creates an active therapist with invite THERAP01."""
    _bootstrap_admin(client)
    return "THERAP01"


def test_patient_onboarding_happy_path():
    with TestClient(app) as client:
        invite = _demo_invite(client)
        token = _register_verify_patient(client, "onboard-ok@test.stride")
        response = client.post(
            "/auth/onboarding/patient",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "full_name": "Alex Patient",
                "date_of_birth": "1990-05-01",
                "phone": "+1 555 0100",
                "body_region": "knee",
                "rehab_goal": "Walk without pain",
                "notes": "Post clinic assessment",
                "therapist_invite_code": invite,
                "camera_analysis_consent": True,
            },
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["status"] == "active"
        assert body["full_name"] == "Alex Patient"
        me = client.get("/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
        assert me.status_code == 200
        profile = me.json()
        assert profile["body_region"] == "knee"
        assert profile["rehab_goal"] == "Walk without pain"
        assert profile["therapist_id"]
        consents = client.get("/consent", headers={"Authorization": f"Bearer {body['access_token']}"})
        assert consents.status_code == 200
        assert any(c["purpose"] == "camera_analysis" and c["status"] == "granted" for c in consents.json())


def test_patient_onboarding_rejects_invalid_invite():
    with TestClient(app) as client:
        token = _register_verify_patient(client, "onboard-bad-invite@test.stride")
        response = client.post(
            "/auth/onboarding/patient",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "full_name": "Alex Patient",
                "body_region": "hip",
                "rehab_goal": "Return to stairs",
                "therapist_invite_code": "NOPECODE",
                "camera_analysis_consent": True,
            },
        )
        assert response.status_code == 400
        assert "not found" in response.json()["detail"].lower()


def test_patient_onboarding_rejects_missing_consent():
    with TestClient(app) as client:
        invite = _demo_invite(client)
        token = _register_verify_patient(client, "onboard-noconsent@test.stride")
        response = client.post(
            "/auth/onboarding/patient",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "full_name": "Alex Patient",
                "body_region": "shoulder",
                "rehab_goal": "Lift arm overhead",
                "therapist_invite_code": invite,
                "camera_analysis_consent": False,
            },
        )
        assert response.status_code == 422


def test_patient_onboarding_rejects_missing_required_fields():
    with TestClient(app) as client:
        token = _register_verify_patient(client, "onboard-incomplete@test.stride")
        response = client.post(
            "/auth/onboarding/patient",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "full_name": "Alex Patient",
                "therapist_invite_code": "THERAP01",
                "camera_analysis_consent": True,
            },
        )
        assert response.status_code == 422


def test_patient_onboarding_idempotent_when_already_active():
    with TestClient(app) as client:
        invite = _demo_invite(client)
        token = _register_verify_patient(client, "onboard-idem@test.stride")
        payload = {
            "full_name": "Alex Patient",
            "body_region": "ankle",
            "rehab_goal": "Walk further each day",
            "therapist_invite_code": invite,
            "camera_analysis_consent": True,
        }
        first = client.post(
            "/auth/onboarding/patient",
            headers={"Authorization": f"Bearer {token}"},
            json=payload,
        )
        assert first.status_code == 200
        active_token = first.json()["access_token"]
        second = client.post(
            "/auth/onboarding/patient",
            headers={"Authorization": f"Bearer {active_token}"},
            json={
                **payload,
                "full_name": "Should Not Overwrite",
                "rehab_goal": "Changed goal",
            },
        )
        assert second.status_code == 200
        me = client.get("/auth/me", headers={"Authorization": f"Bearer {active_token}"})
        assert me.json()["full_name"] == "Alex Patient"
        assert me.json()["rehab_goal"] == "Walk further each day"