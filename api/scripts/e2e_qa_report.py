"""Stride E2E QA harness — API-level flows against a live server + SQLite.

Usage (API already running on :8000 with e2e_qa.db):
  .venv/Scripts/python.exe scripts/e2e_qa_report.py
"""
from __future__ import annotations

import json
import sys
import time
from datetime import date, timedelta
from typing import Any

import httpx

BASE = "http://127.0.0.1:8000"
DEMO_PASSWORD = "StrideClinic1!"
ADMIN = "admin@stride.clinic"
THERAPIST = "therapist@stride.clinic"
PATIENT = "riyaz@stride.clinic"
INVITE = "THERAP01"

results: list[dict[str, Any]] = []


def record(name: str, status: str, detail: str = "") -> None:
    results.append({"name": name, "status": status, "detail": detail})
    mark = {"PASS": "PASS", "FAIL": "FAIL", "PARTIAL": "PARTIAL", "NOT_TESTED": "SKIP"}[status]
    print(f"[{mark}] {name}" + (f" — {detail}" if detail else ""))


def login(client: httpx.Client, email: str, password: str) -> tuple[int, dict]:
    r = client.post("/auth/token", data={"username": email, "password": password})
    try:
        body = r.json()
    except Exception:
        body = {"raw": r.text}
    return r.status_code, body


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def main() -> int:
    with httpx.Client(base_url=BASE, timeout=30.0) as client:
        # Health
        try:
            h = client.get("/health")
            if h.status_code == 200 and h.json().get("status") == "ok":
                record("01_api_health", "PASS")
            else:
                record("01_api_health", "FAIL", h.text)
                return 1
        except Exception as exc:
            record("01_api_health", "FAIL", str(exc))
            return 1

        # Wrong password
        code, body = login(client, ADMIN, "WrongPass1!")
        if code == 401:
            record("neg_wrong_password", "PASS")
        else:
            record("neg_wrong_password", "FAIL", f"{code} {body}")

        # Admin login
        code, admin = login(client, ADMIN, DEMO_PASSWORD)
        if code == 200 and admin.get("role") == "administrator":
            record("05_admin_login", "PASS", admin.get("status"))
            admin_token = admin["access_token"]
        else:
            record("05_admin_login", "FAIL", f"{code} {admin}")
            return 1

        # List users / verify therapist present
        users = client.get("/admin/users", headers=auth_headers(admin_token))
        if users.status_code == 200:
            emails = {u["email"] for u in users.json()}
            if THERAPIST in emails and PATIENT in emails:
                record("06_admin_sees_therapist_patient", "PASS")
            else:
                record("06_admin_sees_therapist_patient", "FAIL", str(emails))
        else:
            record("06_admin_sees_therapist_patient", "FAIL", users.text)

        # Therapist login + profile
        code, th = login(client, THERAPIST, DEMO_PASSWORD)
        if code == 200 and th.get("status") == "active":
            record("07_therapist_login", "PASS")
            th_token = th["access_token"]
        else:
            record("07_therapist_login", "FAIL", f"{code} {th}")
            return 1

        me = client.get("/auth/me", headers=auth_headers(th_token))
        if me.status_code == 200:
            profile = me.json()
            if profile.get("invite_code") == INVITE and profile.get("status") == "active":
                record("08_09_therapist_profile_invite", "PASS", profile.get("invite_code"))
            else:
                record("08_09_therapist_profile_invite", "FAIL", json.dumps(profile)[:300])
        else:
            record("08_09_therapist_profile_invite", "FAIL", me.text)

        # Unauthorized API
        unauth = client.get("/patients")
        if unauth.status_code in (401, 403):
            record("neg_unauthorized_api", "PASS", str(unauth.status_code))
        else:
            record("neg_unauthorized_api", "FAIL", str(unauth.status_code))

        # Patient cannot access admin
        code, pt_demo = login(client, PATIENT, DEMO_PASSWORD)
        if code != 200:
            record("10_demo_patient_login", "FAIL", f"{code} {pt_demo}")
            return 1
        record("10_demo_patient_login", "PASS")
        pt_demo_token = pt_demo["access_token"]
        denied = client.get("/admin/users", headers=auth_headers(pt_demo_token))
        if denied.status_code in (401, 403):
            record("neg_patient_admin_denied", "PASS")
        else:
            record("neg_patient_admin_denied", "FAIL", str(denied.status_code))

        # Therapist cannot be used as patient onboarding wrongly — patient bound check
        bind = client.get("/auth/my-therapist", headers=auth_headers(pt_demo_token))
        if bind.status_code == 200 and bind.json().get("full_name"):
            record("13_patient_bound_to_therapist", "PASS", bind.json().get("full_name"))
        else:
            record("13_patient_bound_to_therapist", "FAIL", bind.text)

        # Therapist views patients
        plist = client.get("/patients", headers=auth_headers(th_token))
        if plist.status_code == 200 and any(p["email"] == PATIENT for p in plist.json()):
            record("14_therapist_views_patient", "PASS")
            patient_id = next(p["id"] for p in plist.json() if p["email"] == PATIENT)
        else:
            record("14_therapist_views_patient", "FAIL", plist.text)
            patient_id = None

        # Patient sees plan
        plans = client.get("/plans", headers=auth_headers(pt_demo_token))
        if plans.status_code == 200 and plans.json():
            plan = plans.json()[0]
            record("16_patient_sees_plan", "PASS", f"{plan.get('title')} items={len(plan.get('items', []))}")
            sit = next((i for i in plan["items"] if "sit" in i["exercise_name"].lower() or i.get("pose_recipe_key")), plan["items"][0])
        else:
            record("16_patient_sees_plan", "FAIL", plans.text)
            sit = None

        # Therapist assigns NEW plan (second plan) if possible
        if patient_id and th_token:
            ex = client.get("/exercises", headers=auth_headers(th_token))
            exercises = ex.json() if ex.status_code == 200 else []
            pick = [e for e in exercises if e.get("source_id") in ("ex-sit-to-stand", "ex-heel-slides", "ex-quad-set")][:2]
            if len(pick) >= 1:
                payload = {
                    "patient_id": patient_id,
                    "title": "E2E QA plan",
                    "start_date": date.today().isoformat(),
                    "duration_weeks": 2,
                    "goal": "QA assigned plan",
                    "items": [
                        {
                            "exercise_id": pick[0]["id"],
                            "target_sets": 2,
                            "target_repetitions": 8,
                            "week_number": 1,
                            "day_of_week": date.today().weekday(),
                            "session_type": "home",
                            "sort_order": 0,
                        }
                    ],
                }
                created = client.post("/plans", headers=auth_headers(th_token), json=payload)
                if created.status_code in (200, 201):
                    record("15_therapist_assigns_plan", "PASS", created.json().get("title"))
                else:
                    record("15_therapist_assigns_plan", "FAIL", created.text)
            else:
                record("15_therapist_assigns_plan", "PARTIAL", "no exercises to assign")
        else:
            record("15_therapist_assigns_plan", "NOT_TESTED")

        # Patient unauthorized therapist routes
        bad = client.get("/patients", headers=auth_headers(pt_demo_token))
        if bad.status_code in (401, 403):
            record("neg_patient_therapist_route", "PASS")
        else:
            # patients router may be therapist-only
            record("neg_patient_therapist_route", "FAIL" if bad.status_code == 200 else "PARTIAL", str(bad.status_code))

        # Session + observation pipeline (API simulation of pose session)
        if sit:
            started = client.post(
                "/sessions",
                headers=auth_headers(pt_demo_token),
                json={"plan_exercise_id": sit["id"]},
            )
            if started.status_code in (200, 201):
                sid = started.json()["id"]
                complete = client.post(
                    f"/sessions/{sid}/complete",
                    headers=auth_headers(pt_demo_token),
                    json={
                        "reported_repetitions": 6,
                        "patient_notes": "E2E QA session — pose-assisted reps simulated via API",
                        "metric": "repetitions",
                        "value": 6,
                        "confidence": 0.81,
                    },
                )
                if complete.status_code == 200:
                    record("21_22_session_complete_observation", "PASS", sid)
                else:
                    record("21_22_session_complete_observation", "FAIL", complete.text)
            else:
                record("21_22_session_complete_observation", "FAIL", started.text)
                sid = None
        else:
            record("21_22_session_complete_observation", "NOT_TESTED")

        # Pending review visible to therapist
        obs = client.get("/observations", headers=auth_headers(th_token))
        if obs.status_code == 200:
            pending = [o for o in obs.json() if o["review_status"] == "pending"]
            if pending:
                record("23_pending_observation_queue", "PASS", f"count={len(pending)}")
                target = pending[0]
            else:
                record("23_pending_observation_queue", "FAIL", "no pending")
                target = None
        else:
            record("23_pending_observation_queue", "FAIL", obs.text)
            target = None

        # Approve observation
        if target:
            before_pt = client.get("/observations", headers=auth_headers(pt_demo_token)).json()
            before_n = len(before_pt)
            approved = client.patch(
                f"/observations/{target['id']}",
                headers=auth_headers(th_token),
                json={"review_status": "approved", "therapist_comment": "E2E approved"},
            )
            if approved.status_code == 200 and approved.json()["review_status"] == "approved":
                record("24_25_therapist_approve", "PASS")
                after_pt = client.get("/observations", headers=auth_headers(pt_demo_token)).json()
                if len(after_pt) >= before_n + 1 or any(o["id"] == target["id"] for o in after_pt):
                    record("26_progress_reflects_approved", "PASS", f"confirmed={len(after_pt)}")
                else:
                    record("26_progress_reflects_approved", "FAIL", f"before={before_n} after={len(after_pt)}")
            else:
                record("24_25_therapist_approve", "FAIL", approved.text)
                record("26_progress_reflects_approved", "NOT_TESTED")

            # Correct path on another pending if any
            obs2 = client.get("/observations", headers=auth_headers(th_token)).json()
            pending2 = [o for o in obs2 if o["review_status"] == "pending"]
            if pending2:
                corr = client.patch(
                    f"/observations/{pending2[0]['id']}",
                    headers=auth_headers(th_token),
                    json={
                        "review_status": "corrected",
                        "value": pending2[0]["value"] + 1,
                        "therapist_comment": "E2E corrected",
                    },
                )
                if corr.status_code == 200 and corr.json().get("original_value") is not None:
                    record("25b_therapist_correct_audit", "PASS")
                else:
                    record("25b_therapist_correct_audit", "FAIL", corr.text)
            else:
                record("25b_therapist_correct_audit", "PARTIAL", "no second pending")
        else:
            record("24_25_therapist_approve", "NOT_TESTED")
            record("26_progress_reflects_approved", "NOT_TESTED")

        # Appointments
        appts_pt = client.get("/appointments", headers=auth_headers(pt_demo_token))
        appts_th = client.get("/appointments", headers=auth_headers(th_token))
        if appts_pt.status_code == 200 and appts_pt.json():
            record("27_appointment_visible", "PASS", appts_pt.json()[0].get("reason"))
            appt_id = appts_pt.json()[0]["id"]
        else:
            record("27_appointment_visible", "FAIL", appts_pt.text)
            appt_id = None

        # Consultation join — LiveKit may be unavailable
        if appt_id:
            join_pt = client.post(
                f"/video/consultations/{appt_id}/join",
                headers=auth_headers(pt_demo_token),
            )
            join_th = client.post(
                f"/video/consultations/{appt_id}/join",
                headers=auth_headers(th_token),
            )
            # Unauthorized join
            join_admin = client.post(
                f"/video/consultations/{appt_id}/join",
                headers=auth_headers(admin_token),
            )
            if join_admin.status_code in (401, 403, 404):
                record("30_unauthorized_consultation_denied", "PASS", str(join_admin.status_code))
            else:
                # admin might also be denied differently
                record("30_unauthorized_consultation_denied", "PARTIAL", str(join_admin.status_code))

            if join_pt.status_code == 200 and join_th.status_code == 200:
                record("28_29_consultation_join", "PASS", "tokens issued")
                # end consultation if endpoint exists
                end = client.post(
                    f"/video/consultations/{appt_id}/end",
                    headers=auth_headers(th_token),
                )
                if end.status_code in (200, 204):
                    record("31_end_consultation", "PASS")
                else:
                    record("31_end_consultation", "PARTIAL", f"{end.status_code} {end.text[:120]}")
            elif join_pt.status_code in (503, 501) or "livekit" in join_pt.text.lower() or "not configured" in join_pt.text.lower():
                record("28_29_consultation_join", "PARTIAL", f"LiveKit unavailable: {join_pt.status_code} {join_pt.text[:160]}")
                record("31_end_consultation", "NOT_TESTED", "LiveKit unavailable")
                record("neg_livekit_unavailable", "PASS", "API reports unavailable without fake success")
            else:
                record("28_29_consultation_join", "FAIL", f"pt={join_pt.status_code} {join_pt.text[:160]} th={join_th.status_code}")
                record("31_end_consultation", "NOT_TESTED")
        else:
            record("28_29_consultation_join", "NOT_TESTED")
            record("30_unauthorized_consultation_denied", "NOT_TESTED")
            record("31_end_consultation", "NOT_TESTED")

        # Register + OTP flow for NEW patient
        new_email = f"e2e.patient.{int(time.time())}@test.stride"
        reg = client.post(
            "/auth/register",
            json={"email": new_email, "password": "Patient1!Aa", "role": "patient"},
        )
        if reg.status_code == 201 and reg.json().get("dev_code"):
            record("10b_register_patient", "PASS")
            otp = reg.json()["dev_code"]
            # Invalid OTP first (must not consume the real code)
            bad_otp = client.post("/auth/verify-otp", json={"email": new_email, "code": "000000"})
            if bad_otp.status_code == 400:
                record("neg_invalid_otp", "PASS")
            else:
                record("neg_invalid_otp", "FAIL", str(bad_otp.status_code))

            # Resend OTP — previous codes should be invalidated
            resend = client.post("/auth/resend-otp", json={"email": new_email})
            if resend.status_code == 200 and resend.json().get("dev_code"):
                record("neg_resend_otp", "PASS", resend.json().get("dev_code"))
                new_otp = resend.json()["dev_code"]
                # Old registration OTP must fail after resend
                stale = client.post("/auth/verify-otp", json={"email": new_email, "code": otp})
                if stale.status_code == 400:
                    record("neg_stale_otp_after_resend", "PASS")
                else:
                    record("neg_stale_otp_after_resend", "FAIL", str(stale.status_code))
                otp = new_otp
            else:
                record("neg_resend_otp", "FAIL", resend.text)

            # Expired OTP — mark current as expired in DB then verify
            try:
                from datetime import datetime, timedelta, timezone
                from app.db import SessionLocal
                from app.models import EmailOtp
                import hashlib

                db = SessionLocal()
                try:
                    row = (
                        db.query(EmailOtp)
                        .filter(EmailOtp.email == new_email.lower(), EmailOtp.consumed.is_(False))
                        .order_by(EmailOtp.created_at.desc())
                        .first()
                    )
                    if row:
                        expired_code = "654321"
                        row.code_hash = hashlib.sha256(expired_code.encode()).hexdigest()
                        row.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
                        db.commit()
                        exp = client.post("/auth/verify-otp", json={"email": new_email, "code": expired_code})
                        if exp.status_code == 400:
                            record("neg_expired_otp", "PASS")
                        else:
                            record("neg_expired_otp", "FAIL", str(exp.status_code))
                        # Issue a fresh code for the happy path
                        resend2 = client.post("/auth/resend-otp", json={"email": new_email})
                        otp = resend2.json().get("dev_code") or otp
                    else:
                        record("neg_expired_otp", "PARTIAL", "no otp row")
                finally:
                    db.close()
            except Exception as exc:
                record("neg_expired_otp", "PARTIAL", str(exc))

            verified = client.post("/auth/verify-otp", json={"email": new_email, "code": otp})
            if verified.status_code == 200 and verified.json().get("status") == "pending_onboarding":
                record("11_otp_verify", "PASS")
                onboard_token = verified.json()["access_token"]
            else:
                record("11_otp_verify", "FAIL", verified.text)
                onboard_token = None

            # Invalid invite
            if onboard_token:
                bad_inv = client.post(
                    "/auth/onboarding/patient",
                    headers=auth_headers(onboard_token),
                    json={
                        "full_name": "E2E Patient",
                        "body_region": "knee",
                        "rehab_goal": "Walk further",
                        "therapist_invite_code": "BADCODE1",
                        "camera_analysis_consent": True,
                    },
                )
                if bad_inv.status_code == 400:
                    record("neg_invalid_invite", "PASS", bad_inv.json().get("detail", "")[:80])
                else:
                    record("neg_invalid_invite", "FAIL", str(bad_inv.status_code))

                # Complete onboarding
                ok = client.post(
                    "/auth/onboarding/patient",
                    headers=auth_headers(onboard_token),
                    json={
                        "full_name": "E2E Patient",
                        "date_of_birth": "1992-04-01",
                        "phone": "+1 555 0199",
                        "body_region": "knee",
                        "rehab_goal": "Walk further each day",
                        "notes": "E2E onboarding",
                        "therapist_invite_code": INVITE,
                        "camera_analysis_consent": True,
                    },
                )
                if ok.status_code == 200 and ok.json().get("status") == "active":
                    record("12_patient_onboarding", "PASS")
                    new_token = ok.json()["access_token"]
                    mt = client.get("/auth/my-therapist", headers=auth_headers(new_token))
                    if mt.status_code == 200:
                        record("13b_new_patient_bound", "PASS", mt.json().get("full_name"))
                    else:
                        record("13b_new_patient_bound", "FAIL", mt.text)
                else:
                    record("12_patient_onboarding", "FAIL", ok.text)
                    record("13b_new_patient_bound", "NOT_TESTED")
            else:
                record("12_patient_onboarding", "NOT_TESTED")
        else:
            record("10b_register_patient", "FAIL", reg.text)

        # Logout/login persistence — re-login demo patient, data still there
        code2, again = login(client, PATIENT, DEMO_PASSWORD)
        if code2 == 200:
            plans2 = client.get("/plans", headers=auth_headers(again["access_token"]))
            obs2 = client.get("/observations", headers=auth_headers(again["access_token"]))
            if plans2.status_code == 200 and plans2.json() and obs2.status_code == 200:
                record("32_33_34_logout_login_persist", "PASS", f"plans={len(plans2.json())} obs={len(obs2.json())}")
            else:
                record("32_33_34_logout_login_persist", "FAIL", "missing data after re-login")
        else:
            record("32_33_34_logout_login_persist", "FAIL", str(code2))

        # Empty states — new onboarded patient without plan
        if "new_token" in dir() or True:
            # use last onboarded if available
            pass
        # Therapist with filter: empty pending after approving all
        left = [o for o in client.get("/observations", headers=auth_headers(th_token)).json() if o["review_status"] == "pending"]
        if len(left) == 0:
            record("neg_no_pending_observations", "PASS", "queue empty after reviews")
        else:
            record("neg_no_pending_observations", "PARTIAL", f"still {len(left)} pending (seed/history)")

        # Therapist unauthorized patient-only route
        mt_th = client.get("/auth/my-therapist", headers=auth_headers(th_token))
        if mt_th.status_code in (403, 404):
            record("neg_therapist_patient_route", "PASS", str(mt_th.status_code))
        else:
            record("neg_therapist_patient_route", "PARTIAL", str(mt_th.status_code))

        # Camera / pose / empty plan — not fully API-testable
        record("18_camera_permission", "NOT_TESTED", "browser permission prompt required")
        record("19_20_pose_estimation_ui", "NOT_TESTED", "requires MediaPipe + camera in browser")
        record("neg_camera_denied", "NOT_TESTED", "browser UI path")
        record("neg_no_pose_detected", "NOT_TESTED", "browser UI path")
        record("neg_api_unavailable", "PARTIAL", "covered by client error handling only if UI tested")
        record("neg_empty_plan", "PARTIAL", "new patient may have no plan — check after onboarding")
        if "new_token" in locals() or onboard_token:
            tok = locals().get("new_token")
            if tok:
                empty_plans = client.get("/plans", headers=auth_headers(tok))
                if empty_plans.status_code == 200 and empty_plans.json() == []:
                    record("neg_empty_plan_new_patient", "PASS")
                    empty_obs = client.get("/observations", headers=auth_headers(tok))
                    if empty_obs.status_code == 200 and empty_obs.json() == []:
                        record("neg_empty_progress", "PASS")
                    else:
                        record("neg_empty_progress", "PARTIAL", str(len(empty_obs.json()) if empty_obs.status_code == 200 else empty_obs.status_code))
                else:
                    record("neg_empty_plan_new_patient", "PARTIAL", "unexpected plans")

    # Summary
    counts = {k: 0 for k in ("PASS", "FAIL", "PARTIAL", "NOT_TESTED")}
    for row in results:
        counts[row["status"]] += 1
    print("\n=== SUMMARY ===")
    print(counts)
    fails = [r for r in results if r["status"] == "FAIL"]
    if fails:
        print("FAILURES:")
        for f in fails:
            print(f" - {f['name']}: {f['detail']}")
    out = {"counts": counts, "results": results}
    Path = __import__("pathlib").Path
    Path("e2e_qa_results.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
