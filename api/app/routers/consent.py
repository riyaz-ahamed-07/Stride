from datetime import datetime, timezone

from fastapi import APIRouter

from app.deps import CurrentUser, Db
from app.models import ConsentRecord, ConsentStatus, UserRole
from app.schemas import ConsentIn, ConsentOut

router = APIRouter(prefix="/consent", tags=["Consent"])


@router.get("", response_model=list[ConsentOut])
def list_consent(db: Db, user: CurrentUser) -> list[ConsentRecord]:
    query = db.query(ConsentRecord)
    if user.role == UserRole.patient:
        query = query.filter(ConsentRecord.patient_id == user.id)
    return list(query.order_by(ConsentRecord.granted_at.desc()))


@router.post("", response_model=ConsentOut, status_code=201)
def set_consent(payload: ConsentIn, db: Db, user: CurrentUser) -> ConsentRecord:
    record = ConsentRecord(
        patient_id=user.id if user.role == UserRole.patient else user.id,
        purpose=payload.purpose,
        status=ConsentStatus.granted if payload.granted else ConsentStatus.revoked,
        revoked_at=None if payload.granted else datetime.now(timezone.utc),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
