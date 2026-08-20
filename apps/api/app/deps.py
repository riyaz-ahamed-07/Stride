from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import AccountStatus, User, UserRole
from app.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")
Db = Annotated[Session, Depends(get_db)]


def get_current_user(db: Db, token: Annotated[str, Depends(oauth2_scheme)]) -> User:
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
    except ValueError:
        user_id = None
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Please sign in again.")
    user = db.get(User, user_id)
    if user is None or user.status != AccountStatus.active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="This account is not active.")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*roles: UserRole):
    def checker(user: CurrentUser) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot use this part of Stride.")
        return user

    return checker


TherapistUser = Annotated[User, Depends(require_roles(UserRole.physiotherapist, UserRole.administrator))]
PhysioUser = Annotated[User, Depends(require_roles(UserRole.physiotherapist))]
AdminUser = Annotated[User, Depends(require_roles(UserRole.administrator))]
