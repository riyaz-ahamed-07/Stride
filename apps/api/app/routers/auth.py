from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import CurrentUser
from app.models import User
from app.schemas import TokenOut, UserOut
from app.security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/token", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> TokenOut:
    user = db.query(User).filter(User.email == form.username.lower()).first()
    if user is None or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email or password is not correct.")
    token = create_access_token(subject=user.id, role=user.role.value)
    return TokenOut(access_token=token, role=user.role.value, full_name=user.full_name, user_id=user.id)


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> User:
    return user
