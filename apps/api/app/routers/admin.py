from fastapi import APIRouter, HTTPException

from app.deps import AdminUser, Db
from app.models import AccountStatus, User
from app.schemas import AdminUserUpdate, UserOut

router = APIRouter(prefix="/admin/users", tags=["Administration"])


@router.get("", response_model=list[UserOut])
def list_users(db: Db, _: AdminUser) -> list[User]:
    return list(db.query(User).order_by(User.role, User.full_name))


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: str, payload: AdminUserUpdate, db: Db, _: AdminUser) -> User:
    account = db.get(User, user_id)
    if account is None:
        raise HTTPException(status_code=404, detail="User not found.")
    account.status = AccountStatus(payload.status)
    db.commit()
    db.refresh(account)
    return account
