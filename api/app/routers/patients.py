from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import Db, TherapistUser
from app.models import AccountStatus, User, UserRole
from app.schemas import PatientCreate, PatientUpdate, UserOut
from app.security import hash_password

router = APIRouter(prefix="/patients", tags=["Patients"])


def _visible_patients(db: Db, user: User) -> list[User]:
    query = select(User).where(
        User.role == UserRole.patient,
        User.status != AccountStatus.inactive,
    )
    if user.role == UserRole.physiotherapist:
        query = query.where(User.therapist_id == user.id)
    return list(db.scalars(query.order_by(User.full_name)))


@router.get("", response_model=list[UserOut])
def list_patients(db: Db, user: TherapistUser) -> list[User]:
    return _visible_patients(db, user)


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_patient(payload: PatientCreate, db: Db, user: TherapistUser) -> User:
    existing = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists.")
    therapist_id = user.id if user.role == UserRole.physiotherapist else None
    patient = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role=UserRole.patient,
        status=AccountStatus.active,
        date_of_birth=payload.date_of_birth,
        therapist_id=therapist_id,
        notes=payload.notes,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router.get("/{patient_id}", response_model=UserOut)
def get_patient(patient_id: str, db: Db, user: TherapistUser) -> User:
    patient = db.get(User, patient_id)
    if patient is None or patient.role != UserRole.patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
    if user.role == UserRole.physiotherapist and patient.therapist_id != user.id:
        raise HTTPException(status_code=403, detail="This patient is not on your list.")
    return patient


@router.patch("/{patient_id}", response_model=UserOut)
def update_patient(patient_id: str, payload: PatientUpdate, db: Db, user: TherapistUser) -> User:
    patient = get_patient(patient_id, db, user)
    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"]:
        patient.status = AccountStatus(data.pop("status"))
    for key, value in data.items():
        setattr(patient, key, value)
    db.commit()
    db.refresh(patient)
    return patient


@router.delete("/{patient_id}", response_model=UserOut)
def archive_patient(patient_id: str, db: Db, user: TherapistUser) -> User:
    patient = get_patient(patient_id, db, user)
    patient.status = AccountStatus.inactive
    db.commit()
    db.refresh(patient)
    return patient
