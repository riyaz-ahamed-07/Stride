from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from livekit import api
from sqlalchemy.orm import Session, joinedload

from app.config import LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL, VIDEO_TOKEN_TTL_MINUTES
from app.models import Appointment, AppointmentStatus, PlanExercise, RehabilitationPlan, User, UserRole
from app.schemas import (
    ConsultationContext,
    ConsultationExercise,
    ConsultationJoinOut,
    ConsultationParticipant,
    ConsultationPlan,
)


def room_name_for(appointment_id: str) -> str:
    return f"stride-consult-{appointment_id}"


def livekit_configured() -> bool:
    return bool(LIVEKIT_URL and LIVEKIT_API_KEY and LIVEKIT_API_SECRET)


def require_livekit() -> None:
    if not livekit_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Video consultation is not configured on this server.",
        )


def is_consultation_participant(user: User, appointment: Appointment) -> bool:
    if user.role == UserRole.patient:
        return appointment.patient_id == user.id
    if user.role == UserRole.physiotherapist:
        return appointment.therapist_id == user.id
    return False


def load_appointment(db: Session, appointment_id: str) -> Appointment | None:
    return (
        db.query(Appointment)
        .options(joinedload(Appointment.patient), joinedload(Appointment.therapist))
        .filter(Appointment.id == appointment_id)
        .first()
    )


def authorize_consultation(
    db: Session,
    user: User,
    appointment_id: str,
    *,
    for_join: bool,
) -> Appointment:
    appointment = load_appointment(db, appointment_id)
    if appointment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consultation not found.")
    if not is_consultation_participant(user, appointment):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to join this consultation.",
        )
    if for_join and appointment.status != AppointmentStatus.scheduled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This consultation is no longer available.",
        )
    return appointment


def _participant(user: User) -> ConsultationParticipant:
    return ConsultationParticipant(
        id=user.id,
        full_name=user.full_name,
        role=user.role.value,  # type: ignore[arg-type]
        clinic_name=user.clinic_name,
        specialty=user.specialty,
    )


def consultation_context(db: Session, appointment: Appointment) -> ConsultationContext:
    plan_out: ConsultationPlan | None = None
    if appointment.plan_id:
        plan = (
            db.query(RehabilitationPlan)
            .options(joinedload(RehabilitationPlan.items).joinedload(PlanExercise.exercise))
            .filter(RehabilitationPlan.id == appointment.plan_id)
            .first()
        )
        if plan is not None:
            items = []
            for item in sorted(plan.items, key=lambda row: (row.week_number, row.sort_order)):
                if appointment.week_number is not None and item.week_number != appointment.week_number:
                    continue
                exercise_name = item.exercise.name if item.exercise else "Exercise"
                items.append(
                    ConsultationExercise(
                        name=exercise_name,
                        target_sets=item.target_sets,
                        target_repetitions=item.target_repetitions,
                        frequency_note=item.frequency_note or "",
                        week_number=item.week_number,
                    )
                )
            plan_out = ConsultationPlan(id=plan.id, title=plan.title, goal=plan.goal or "", items=items)
    return ConsultationContext(
        appointment_id=appointment.id,
        scheduled_at=appointment.scheduled_at,
        status=appointment.status.value,  # type: ignore[arg-type]
        reason=appointment.reason,
        patient=_participant(appointment.patient),
        therapist=_participant(appointment.therapist),
        plan=plan_out,
        room_name=room_name_for(appointment.id),
    )


def mint_join_token(user: User, appointment: Appointment) -> tuple[str, datetime]:
    require_livekit()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=VIDEO_TOKEN_TTL_MINUTES)
    metadata = json.dumps(
        {
            "role": user.role.value,
            "appointment_id": appointment.id,
            "display_name": user.full_name,
        }
    )
    token = (
        api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        .with_identity(user.id)
        .with_name(user.full_name)
        .with_metadata(metadata)
        .with_ttl(timedelta(minutes=VIDEO_TOKEN_TTL_MINUTES))
        .with_grants(
            api.VideoGrants(
                room_join=True,
                room_create=True,
                room=room_name_for(appointment.id),
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True,
                can_publish_sources=["camera", "microphone"],
                can_update_own_metadata=False,
            )
        )
        .to_jwt()
    )
    return token, expires_at


def join_consultation(db: Session, user: User, appointment_id: str) -> ConsultationJoinOut:
    appointment = authorize_consultation(db, user, appointment_id, for_join=True)
    token, expires_at = mint_join_token(user, appointment)
    return ConsultationJoinOut(
        livekit_url=LIVEKIT_URL,
        token=token,
        token_expires_at=expires_at,
        identity=user.id,
        role=user.role.value,  # type: ignore[arg-type]
        display_name=user.full_name,
        consultation=consultation_context(db, appointment),
    )


def _livekit_http_url() -> str:
    url = LIVEKIT_URL.strip()
    if url.startswith("wss://"):
        return "https://" + url[len("wss://") :]
    if url.startswith("ws://"):
        return "http://" + url[len("ws://") :]
    return url


async def close_livekit_room(room_name: str) -> bool:
    if not livekit_configured():
        return False
    lk = api.LiveKitAPI(_livekit_http_url(), LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    try:
        await lk.room.delete_room(api.DeleteRoomRequest(room=room_name))
        return True
    except Exception:
        return False
    finally:
        await lk.aclose()
