from datetime import datetime, timedelta, timezone

import jwt
from fastapi.testclient import TestClient

from app.config import LIVEKIT_API_KEY, LIVEKIT_API_SECRET, VIDEO_TOKEN_TTL_MINUTES
from app.main import app
from app.seed import DEMO_ADMIN_EMAIL, DEMO_PASSWORD, DEMO_PATIENT_EMAIL, DEMO_THERAPIST_EMAIL


def _login(client: TestClient, email: str) -> dict:
    response = client.post("/auth/token", data={"username": email, "password": DEMO_PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _seeded_appointment(client: TestClient, token: str) -> dict:
    rows = client.get("/appointments", headers=_auth(token))
    assert rows.status_code == 200
    scheduled = [row for row in rows.json() if row["status"] == "scheduled"]
    assert scheduled, "seeded consultation appointment is missing"
    return scheduled[0]


def _new_appointment(client: TestClient, therapist_token: str, patient_id: str, days: int = 5) -> dict:
    when = (datetime.now(timezone.utc) + timedelta(days=days, minutes=17)).isoformat()
    created = client.post(
        "/appointments",
        headers=_auth(therapist_token),
        json={
            "patient_id": patient_id,
            "scheduled_at": when,
            "reason": f"Isolated consultation {when}",
        },
    )
    assert created.status_code == 201, created.text
    return created.json()


def _decode_livekit(token: str) -> dict:
    return jwt.decode(
        token,
        LIVEKIT_API_SECRET,
        algorithms=["HS256"],
        options={"verify_aud": False},
    )


def test_join_requires_authentication():
    with TestClient(app) as client:
        appointment = _seeded_appointment(client, _login(client, DEMO_PATIENT_EMAIL)["access_token"])
        denied = client.post(f"/video/consultations/{appointment['id']}/join")
        assert denied.status_code == 401


def test_patient_and_therapist_join_authorized_consultation():
    with TestClient(app) as client:
        patient = _login(client, DEMO_PATIENT_EMAIL)
        therapist = _login(client, DEMO_THERAPIST_EMAIL)
        appointment = _seeded_appointment(client, patient["access_token"])

        patient_join = client.post(
            f"/video/consultations/{appointment['id']}/join",
            headers=_auth(patient["access_token"]),
            json={"identity": "spoofed-admin", "name": "Hacker", "role": "administrator"},
        )
        assert patient_join.status_code == 200, patient_join.text
        body = patient_join.json()
        assert body["identity"] == patient["user_id"]
        assert body["role"] == "patient"
        assert body["display_name"] == patient["full_name"]
        assert body["consultation"]["appointment_id"] == appointment["id"]
        assert body["consultation"]["room_name"] == f"stride-consult-{appointment['id']}"
        assert body["consultation"]["patient"]["id"] == patient["user_id"]
        assert body["consultation"]["therapist"]["full_name"]
        assert "LIVEKIT_API_SECRET" not in str(body)
        assert LIVEKIT_API_SECRET not in str(body)
        assert LIVEKIT_API_KEY not in body["token"]
        assert body["consultation"]["plan"] is not None
        assert body["consultation"]["plan"]["items"]
        assert all(item["name"] for item in body["consultation"]["plan"]["items"])

        claims = _decode_livekit(body["token"])
        assert claims["sub"] == patient["user_id"]
        assert claims["name"] == patient["full_name"]
        assert claims["video"]["room"] == f"stride-consult-{appointment['id']}"
        assert claims["video"]["roomJoin"] is True
        exp = datetime.fromtimestamp(claims["exp"], tz=timezone.utc)
        remaining = exp - datetime.now(timezone.utc)
        assert remaining <= timedelta(minutes=VIDEO_TOKEN_TTL_MINUTES + 1)
        assert remaining >= timedelta(minutes=VIDEO_TOKEN_TTL_MINUTES - 2)

        therapist_join = client.post(
            f"/video/consultations/{appointment['id']}/join",
            headers=_auth(therapist["access_token"]),
        )
        assert therapist_join.status_code == 200, therapist_join.text
        tbody = therapist_join.json()
        assert tbody["identity"] == therapist["user_id"]
        assert tbody["role"] == "physiotherapist"
        assert _decode_livekit(tbody["token"])["sub"] == therapist["user_id"]


def test_unauthorized_user_cannot_join_or_end():
    with TestClient(app) as client:
        patient = _login(client, DEMO_PATIENT_EMAIL)
        admin = _login(client, DEMO_ADMIN_EMAIL)
        appointment = _seeded_appointment(client, patient["access_token"])

        denied = client.post(
            f"/video/consultations/{appointment['id']}/join",
            headers=_auth(admin["access_token"]),
        )
        assert denied.status_code == 403

        missing = client.post(
            "/video/consultations/00000000-0000-0000-0000-000000000000/join",
            headers=_auth(patient["access_token"]),
        )
        assert missing.status_code == 404

        end_denied = client.post(
            f"/video/consultations/{appointment['id']}/end",
            headers=_auth(patient["access_token"]),
        )
        assert end_denied.status_code == 403


def test_public_demo_room_is_removed():
    with TestClient(app) as client:
        html = client.get("/video/room/demo")
        assert html.status_code == 404
        debug = client.get("/video/debug")
        assert debug.status_code == 404


def test_cancelled_consultation_cannot_be_joined():
    with TestClient(app) as client:
        therapist = _login(client, DEMO_THERAPIST_EMAIL)
        patient = _login(client, DEMO_PATIENT_EMAIL)
        appointment = _new_appointment(client, therapist["access_token"], patient["user_id"], days=5)
        cancelled = client.patch(
            f"/appointments/{appointment['id']}",
            headers=_auth(therapist["access_token"]),
            json={"status": "cancelled"},
        )
        assert cancelled.status_code == 200
        denied = client.post(
            f"/video/consultations/{appointment['id']}/join",
            headers=_auth(patient["access_token"]),
        )
        assert denied.status_code == 403


def test_therapist_end_marks_consultation_completed():
    with TestClient(app) as client:
        therapist = _login(client, DEMO_THERAPIST_EMAIL)
        patient = _login(client, DEMO_PATIENT_EMAIL)
        appointment = _new_appointment(client, therapist["access_token"], patient["user_id"], days=6)
        ended = client.post(
            f"/video/consultations/{appointment['id']}/end",
            headers=_auth(therapist["access_token"]),
        )
        assert ended.status_code == 200, ended.text
        assert ended.json()["status"] == "completed"
        denied = client.post(
            f"/video/consultations/{appointment['id']}/join",
            headers=_auth(patient["access_token"]),
        )
        assert denied.status_code == 403
