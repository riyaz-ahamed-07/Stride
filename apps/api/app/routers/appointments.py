from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import joinedload

from app.deps import CurrentUser, Db, PhysioUser
from app.models import AccountStatus, Appointment, AppointmentStatus, User, UserRole
from app.schemas import AppointmentCreate, AppointmentOut, AppointmentStatusUpdate

router = APIRouter(prefix="/appointments", tags=["Appointments"])


def _aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _out(item: Appointment) -> AppointmentOut:
    return AppointmentOut(
        id=item.id,
        patient_id=item.patient_id,
        therapist_id=item.therapist_id,
        scheduled_at=item.scheduled_at,
        status=item.status.value,
        reason=item.reason,
        patient_name=item.patient.full_name if item.patient else None,
        therapist_name=item.therapist.full_name if item.therapist else None,
        plan_id=item.plan_id,
        week_number=item.week_number,
    )


def _base_query(db):
    return db.query(Appointment).options(
        joinedload(Appointment.patient),
        joinedload(Appointment.therapist),
    )


def _visible_to(user: User, item: Appointment) -> bool:
    if user.role == UserRole.administrator:
        return True
    if user.role == UserRole.physiotherapist:
        return item.therapist_id == user.id
    if user.role == UserRole.patient:
        return item.patient_id == user.id
    return False


def _scoped_query(db, user: User):
    query = _base_query(db)
    if user.role == UserRole.physiotherapist:
        return query.filter(Appointment.therapist_id == user.id)
    if user.role == UserRole.patient:
        return query.filter(Appointment.patient_id == user.id)
    return query


@router.get("", response_model=list[AppointmentOut])
def list_appointments(db: Db, user: CurrentUser) -> list[AppointmentOut]:
    rows = _scoped_query(db, user).order_by(Appointment.scheduled_at.asc()).all()
    return [_out(item) for item in rows]


@router.get("/{appointment_id}", response_model=AppointmentOut)
def get_appointment(appointment_id: str, db: Db, user: CurrentUser) -> AppointmentOut:
    item = _base_query(db).filter(Appointment.id == appointment_id).first()
    if item is None or not _visible_to(user, item):
        raise HTTPException(status_code=404, detail="Appointment not found.")
    return _out(item)


@router.post("", response_model=AppointmentOut, status_code=201)
def create_appointment(payload: AppointmentCreate, db: Db, user: PhysioUser) -> AppointmentOut:
    patient = db.get(User, payload.patient_id)
    if (
        patient is None
        or patient.role != UserRole.patient
        or patient.therapist_id != user.id
        or patient.status != AccountStatus.active
    ):
        raise HTTPException(status_code=400, detail="Choose an active patient from your list.")

    scheduled_at = _aware_utc(payload.scheduled_at)
    now = datetime.now(timezone.utc)
    if scheduled_at < now - timedelta(minutes=30):
        raise HTTPException(status_code=400, detail="Choose a future appointment time.")

    window_start = scheduled_at - timedelta(minutes=1)
    window_end = scheduled_at + timedelta(minutes=1)
    duplicate = (
        db.query(Appointment)
        .filter(
            Appointment.patient_id == patient.id,
            Appointment.therapist_id == user.id,
            Appointment.status == AppointmentStatus.scheduled,
            Appointment.scheduled_at >= window_start,
            Appointment.scheduled_at <= window_end,
        )
        .first()
    )
    if duplicate is not None:
        raise HTTPException(
            status_code=400,
            detail="An appointment already exists for this patient at that time.",
        )

    item = Appointment(
        patient_id=patient.id,
        therapist_id=user.id,
        scheduled_at=scheduled_at,
        reason=(payload.reason or "").strip() or None,
        plan_id=payload.plan_id,
        week_number=payload.week_number,
        status=AppointmentStatus.scheduled,
    )
    db.add(item)
    db.commit()
    item = _base_query(db).filter(Appointment.id == item.id).first()
    return _out(item)


@router.patch("/{appointment_id}", response_model=AppointmentOut)
def update_appointment_status(
    appointment_id: str,
    payload: AppointmentStatusUpdate,
    db: Db,
    user: PhysioUser,
) -> AppointmentOut:
    item = _base_query(db).filter(Appointment.id == appointment_id).first()
    if item is None or item.therapist_id != user.id:
        raise HTTPException(status_code=404, detail="Appointment not found.")
    if item.status != AppointmentStatus.scheduled:
        raise HTTPException(status_code=400, detail="Only scheduled appointments can be updated.")

    next_status = AppointmentStatus(payload.status)
    if next_status not in (AppointmentStatus.completed, AppointmentStatus.cancelled):
        raise HTTPException(status_code=400, detail="Status must be completed or cancelled.")

    item.status = next_status
    db.commit()
    item = _base_query(db).filter(Appointment.id == appointment_id).first()
    return _out(item)
