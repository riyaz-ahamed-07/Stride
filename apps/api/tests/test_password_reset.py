import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.db import SessionLocal
from app.main import app
from app.models import AccountStatus, PasswordResetToken, User, UserRole
from app.security import hash_password

GENERIC_FORGOT = "If that email exists, reset instructions were sent."
OLD_PASSWORD = "OldPass1!"
NEW_PASSWORD = "NewPass9#"
WEAK_PASSWORD = "NoSymbol1"


def _create_user(*, status: AccountStatus = AccountStatus.active) -> tuple[str, str]:
    email = f"reset-{uuid.uuid4().hex[:12]}@test.stride"
    db = SessionLocal()
    try:
        user = User(
            email=email,
            full_name="Reset Tester",
            password_hash=hash_password(OLD_PASSWORD),
            role=UserRole.patient,
            status=status,
            email_verified=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user.id, email
    finally:
        db.close()


def _login(client: TestClient, email: str, password: str):
    return client.post("/auth/token", data={"username": email, "password": password})


def test_forgot_password_unknown_email_is_generic():
    with TestClient(app) as client:
        response = client.post(
            "/auth/forgot-password",
            json={"email": f"missing-{uuid.uuid4().hex}@test.stride"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["detail"] == GENERIC_FORGOT
        assert not body.get("dev_reset_token")


def test_forgot_password_known_email_dev_returns_token():
    with TestClient(app) as client:
        _, email = _create_user()
        response = client.post("/auth/forgot-password", json={"email": email})
        assert response.status_code == 200
        body = response.json()
        assert body["detail"] == GENERIC_FORGOT
        assert body.get("dev_reset_token")
        assert len(body["dev_reset_token"]) > 20


def test_valid_reset_then_login_with_new_password():
    with TestClient(app) as client:
        _, email = _create_user()
        token = client.post("/auth/forgot-password", json={"email": email}).json()["dev_reset_token"]
        reset = client.post("/auth/reset-password", json={"token": token, "password": NEW_PASSWORD})
        assert reset.status_code == 200
        assert "access_token" not in reset.json()
        assert "Sign in" in reset.json()["detail"]

        old = _login(client, email, OLD_PASSWORD)
        assert old.status_code == 401
        fresh = _login(client, email, NEW_PASSWORD)
        assert fresh.status_code == 200
        assert fresh.json()["access_token"]


def test_reset_token_cannot_be_reused():
    with TestClient(app) as client:
        _, email = _create_user()
        token = client.post("/auth/forgot-password", json={"email": email}).json()["dev_reset_token"]
        first = client.post("/auth/reset-password", json={"token": token, "password": NEW_PASSWORD})
        assert first.status_code == 200
        reused = client.post("/auth/reset-password", json={"token": token, "password": "OtherPass1!"})
        assert reused.status_code == 400
        assert reused.json()["detail"]["code"] == "already_used"


def test_invalid_reset_token():
    with TestClient(app) as client:
        response = client.post(
            "/auth/reset-password",
            json={"token": "not-a-real-reset-token", "password": NEW_PASSWORD},
        )
        assert response.status_code == 400
        assert response.json()["detail"]["code"] == "invalid"


def test_expired_reset_token():
    with TestClient(app) as client:
        user_id, email = _create_user()
        token = client.post("/auth/forgot-password", json={"email": email}).json()["dev_reset_token"]
        db = SessionLocal()
        try:
            row = (
                db.query(PasswordResetToken)
                .filter(PasswordResetToken.user_id == user_id)
                .order_by(PasswordResetToken.created_at.desc())
                .first()
            )
            assert row is not None
            row.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
            db.commit()
        finally:
            db.close()
        response = client.post("/auth/reset-password", json={"token": token, "password": NEW_PASSWORD})
        assert response.status_code == 400
        assert response.json()["detail"]["code"] == "expired"
        still_old = _login(client, email, OLD_PASSWORD)
        assert still_old.status_code == 200


def test_weak_password_on_reset_rejected():
    with TestClient(app) as client:
        _, email = _create_user()
        token = client.post("/auth/forgot-password", json={"email": email}).json()["dev_reset_token"]
        response = client.post("/auth/reset-password", json={"token": token, "password": WEAK_PASSWORD})
        assert response.status_code == 400
        assert "password" in response.json()["detail"]
        still_old = _login(client, email, OLD_PASSWORD)
        assert still_old.status_code == 200


def test_inactive_user_can_reset_but_cannot_log_in():
    with TestClient(app) as client:
        user_id, email = _create_user(status=AccountStatus.inactive)
        token = client.post("/auth/forgot-password", json={"email": email}).json()["dev_reset_token"]
        reset = client.post("/auth/reset-password", json={"token": token, "password": NEW_PASSWORD})
        assert reset.status_code == 200
        db = SessionLocal()
        try:
            user = db.get(User, user_id)
            assert user is not None
            assert user.status == AccountStatus.inactive
        finally:
            db.close()
        denied = _login(client, email, NEW_PASSWORD)
        assert denied.status_code == 403


def test_forgot_password_omits_token_when_smtp_configured(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr("app.email_service.SMTP_CONFIGURED", True)
    monkeypatch.setattr("app.email_service.expose_dev_reset_token", lambda: False)
    monkeypatch.setattr("app.routers.auth.expose_dev_reset_token", lambda: False)
    monkeypatch.setattr("app.email_service._deliver_smtp", lambda *args, **kwargs: None)
    with TestClient(app) as client:
        _, email = _create_user()
        response = client.post("/auth/forgot-password", json={"email": email})
        assert response.status_code == 200
        body = response.json()
        assert body["detail"] == GENERIC_FORGOT
        assert not body.get("dev_reset_token")
