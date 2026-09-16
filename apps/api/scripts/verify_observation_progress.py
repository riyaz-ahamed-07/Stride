"""Verify approving an observation increases patient-visible confirmed progress."""
from __future__ import annotations

import os
from pathlib import Path

DB = Path(__file__).resolve().parents[1] / "verify_progress.db"
os.environ["STRIDE_DATABASE_URL"] = f"sqlite:///{DB.as_posix()}"
os.environ["STRIDE_ENV"] = "dev"

from fastapi.testclient import TestClient

from app.main import app
from app.seed import DEMO_PASSWORD, DEMO_PATIENT_EMAIL, DEMO_THERAPIST_EMAIL


def login(client: TestClient, email: str) -> str:
    response = client.post("/auth/token", data={"username": email, "password": DEMO_PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def main() -> None:
    with TestClient(app) as client:
        patient = login(client, DEMO_PATIENT_EMAIL)
        therapist = login(client, DEMO_THERAPIST_EMAIL)
        before = client.get("/observations", headers={"Authorization": f"Bearer {patient}"}).json()
        print("patient_confirmed_before", len(before))
        pending = [
            row
            for row in client.get("/observations", headers={"Authorization": f"Bearer {therapist}"}).json()
            if row["review_status"] == "pending"
        ]
        print("pending", len(pending))
        assert pending, "expected seeded pending observation"
        target = pending[0]
        approved = client.patch(
            f"/observations/{target['id']}",
            headers={"Authorization": f"Bearer {therapist}"},
            json={"review_status": "approved", "therapist_comment": "Verified in check."},
        )
        assert approved.status_code == 200, approved.text
        after = client.get("/observations", headers={"Authorization": f"Bearer {patient}"}).json()
        print("patient_confirmed_after", len(after))
        assert len(after) == len(before) + 1
        assert any(row["id"] == target["id"] for row in after)
        print("VERIFY_OK")


if __name__ == "__main__":
    main()
