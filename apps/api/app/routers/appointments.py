from fastapi import APIRouter, HTTPException

from app.deps import CurrentUser, Db, PhysioUser
from app.models import Appointment, User, UserRole
from app.schemas import AppointmentCreate, AppointmentOut

router = APIRouter(prefix="/appointments", tags=["Appointments"])


def _out(item: Appointment) -> AppointmentOut:
    return AppointmentOut(
        id=item.id,
        patient_id=item.patient_id,
        therapist_id=item.therapist_id,
        scheduled_at=item.scheduled_at,
        status=item.status.value,
        reason=item.reason,
        patient_name=item.patient.full_name if item.patient else None,
    )


@router.get("", response_model=list[AppointmentOut])
def list_appointments(db: Db, user: CurrentUser) -> list[AppointmentOut]:
    query = db.query(Appointment)
    if user.role == UserRole.physiotherapist:
        query = query.filter(Appointment.therapist_id == user.id)
    elif user.role == UserRole.patient:
        query = query.filter(Appointment.patient_id == user.id)
    return [_out(item) for item in query.order_by(Appointment.scheduled_at)]


@router.post("", response_model=AppointmentOut, status_code=201)
def create_appointment(payload: AppointmentCreate, db: Db, user: PhysioUser) -> AppointmentOut:
    patient = db.get(User, payload.patient_id)
    if patient is None or patient.therapist_id != user.id:
        raise HTTPException(status_code=400, detail="Choose a patient from your list.")
    item = Appointment(
        patient_id=payload.patient_id,
        therapist_id=user.id,
        scheduled_at=payload.scheduled_at,
        reason=payload.reason,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _out(item)
