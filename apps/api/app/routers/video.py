from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.consultation import (
    authorize_consultation,
    close_livekit_room,
    consultation_context,
    join_consultation,
    room_name_for,
)
from app.deps import CurrentUser, Db, PhysioUser
from app.models import AppointmentStatus
from app.schemas import ConsultationContext, ConsultationEndOut, ConsultationJoinOut

router = APIRouter(prefix="/video", tags=["Consultations"])


@router.get("/consultations/{appointment_id}", response_model=ConsultationContext)
def get_consultation(appointment_id: str, db: Db, user: CurrentUser) -> ConsultationContext:
    appointment = authorize_consultation(db, user, appointment_id, for_join=False)
    return consultation_context(db, appointment)


@router.post("/consultations/{appointment_id}/join", response_model=ConsultationJoinOut)
def join_video_consultation(appointment_id: str, db: Db, user: CurrentUser) -> ConsultationJoinOut:
    return join_consultation(db, user, appointment_id)


@router.post("/consultations/{appointment_id}/end", response_model=ConsultationEndOut)
async def end_video_consultation(
    appointment_id: str, db: Db, user: PhysioUser
) -> ConsultationEndOut:
    appointment = authorize_consultation(db, user, appointment_id, for_join=False)
    if appointment.therapist_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the prescribing physiotherapist can end this consultation.",
        )
    room_closed = await close_livekit_room(room_name_for(appointment.id))
    if appointment.status == AppointmentStatus.scheduled:
        appointment.status = AppointmentStatus.completed
        db.commit()
        db.refresh(appointment)
    return ConsultationEndOut(
        appointment_id=appointment.id,
        status=appointment.status.value,  # type: ignore[arg-type]
        room_closed=room_closed,
    )
