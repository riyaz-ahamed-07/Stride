import secrets
import string

from fastapi import APIRouter, HTTPException

from app.deps import AdminUser, Db
from app.models import AccountStatus, User, UserRole
from app.schemas import AdminUserUpdate, UserOut

router = APIRouter(prefix="/admin/users", tags=["Administration"])


def _invite_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(8))


@router.get("", response_model=list[UserOut])
def list_users(db: Db, _: AdminUser) -> list[User]:
    return list(db.query(User).order_by(User.role, User.full_name))


@router.get("/pending", response_model=list[UserOut])
def list_pending(db: Db, _: AdminUser) -> list[User]:
    return list(
        db.query(User)
        .filter(User.status == AccountStatus.pending_approval)
        .order_by(User.created_at.desc())
    )


@router.post("/{user_id}/approve", response_model=UserOut)
def approve_therapist(user_id: str, db: Db, _: AdminUser) -> User:
    account = db.get(User, user_id)
    if account is None:
        raise HTTPException(status_code=404, detail="User not found.")
    if account.role != UserRole.physiotherapist:
        raise HTTPException(status_code=400, detail="Only physiotherapists require approval.")
    if account.status != AccountStatus.pending_approval:
        raise HTTPException(status_code=400, detail="User is not awaiting approval.")
    account.status = AccountStatus.active
    if not account.invite_code:
        account.invite_code = _invite_code()
    db.commit()
    db.refresh(account)
    return account


@router.post("/{user_id}/reject", response_model=UserOut)
def reject_therapist(user_id: str, db: Db, _: AdminUser) -> User:
    account = db.get(User, user_id)
    if account is None:
        raise HTTPException(status_code=404, detail="User not found.")
    if account.role != UserRole.physiotherapist:
        raise HTTPException(status_code=400, detail="Only physiotherapist applications can be rejected here.")
    if account.status != AccountStatus.pending_approval:
        raise HTTPException(status_code=400, detail="User is not awaiting approval.")
    account.status = AccountStatus.inactive
    db.commit()
    db.refresh(account)
    return account


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: str, payload: AdminUserUpdate, db: Db, _: AdminUser) -> User:
    account = db.get(User, user_id)
    if account is None:
        raise HTTPException(status_code=404, detail="User not found.")
    account.status = AccountStatus(payload.status)
    if account.status == AccountStatus.active and account.role == UserRole.physiotherapist and not account.invite_code:
        account.invite_code = _invite_code()
    db.commit()
    db.refresh(account)
    return account
