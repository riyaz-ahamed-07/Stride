from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.auth_utils import validate_password_strength
from app.config import IS_DEV
from app.db import get_db
from app.deps import AuthenticatedUser, CurrentUser
from app.email_service import expose_dev_reset_token, send_password_reset_email
from app.models import AccountStatus, ConsentRecord, ConsentStatus, User, UserRole
from app.otp_service import (
    ResetTokenError,
    consume_password_reset,
    issue_otp,
    issue_password_reset,
    verify_otp,
)
from app.schemas import (
    ChangeTherapistIn,
    ForgotPasswordIn,
    ForgotPasswordOut,
    GoogleAuthIn,
    PasswordCheckOut,
    PatientOnboardingIn,
    PatientProfileUpdateIn,
    RegisterIn,
    ResetPasswordIn,
    ResetPasswordOut,
    ResendOtpIn,
    TherapistContactOut,
    TherapistOnboardingIn,
    TokenOut,
    UserOut,
    VerifyOtpIn,
)
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _token_for(user: User, *, dev_code: str | None = None) -> TokenOut:
    token = create_access_token(subject=user.id, role=user.role.value)
    return TokenOut(
        access_token=token,
        role=user.role.value,  # type: ignore[arg-type]
        full_name=user.full_name or user.email,
        user_id=user.id,
        status=user.status.value,  # type: ignore[arg-type]
        email_verified=user.email_verified,
        dev_code=dev_code if IS_DEV else None,
    )


@router.post("/check-password", response_model=PasswordCheckOut)
def check_password(payload: RegisterIn) -> PasswordCheckOut:
    issues = validate_password_strength(payload.password)
    return PasswordCheckOut(valid=len(issues) == 0, issues=issues)


@router.post("/register", response_model=TokenOut, status_code=201)
def register(payload: RegisterIn, db: Session = Depends(get_db)) -> TokenOut:
    email = payload.email.strip().lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    issues = validate_password_strength(payload.password)
    if issues:
        raise HTTPException(status_code=400, detail={"password": issues})
    user = User(
        email=email,
        full_name="",
        password_hash=hash_password(payload.password),
        role=UserRole(payload.role),
        status=AccountStatus.pending_email,
        auth_provider="email",
        email_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    otp = issue_otp(db, email, "verify_email")
    return _token_for(user, dev_code=otp)


@router.post("/verify-otp", response_model=TokenOut)
def verify_email_otp(payload: VerifyOtpIn, db: Session = Depends(get_db)) -> TokenOut:
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=404, detail="Account not found.")
    if not verify_otp(db, email, payload.code.strip(), "verify_email"):
        raise HTTPException(status_code=400, detail="Invalid or expired code.")
    user.email_verified = True
    user.status = AccountStatus.pending_onboarding
    db.commit()
    db.refresh(user)
    return _token_for(user)


@router.post("/resend-otp")
def resend_otp(payload: ResendOtpIn, db: Session = Depends(get_db)) -> dict[str, str | None]:
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if user is None or user.status != AccountStatus.pending_email:
        raise HTTPException(status_code=400, detail="No pending verification for this email.")
    otp = issue_otp(db, email, "verify_email")
    out: dict[str, str | None] = {"detail": "Verification code sent."}
    if IS_DEV:
        out["dev_code"] = otp
    return out


@router.post("/forgot-password", response_model=ForgotPasswordOut)
def forgot_password(payload: ForgotPasswordIn, db: Session = Depends(get_db)) -> ForgotPasswordOut:
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    token: str | None = None
    if user and user.password_hash:
        token = issue_password_reset(db, user)
        send_password_reset_email(to=user.email, token=token)
    return ForgotPasswordOut(
        detail="If that email exists, reset instructions were sent.",
        dev_reset_token=token if token and expose_dev_reset_token() else None,
    )


@router.post("/reset-password", response_model=ResetPasswordOut)
def reset_password(payload: ResetPasswordIn, db: Session = Depends(get_db)) -> ResetPasswordOut:
    issues = validate_password_strength(payload.password)
    if issues:
        raise HTTPException(status_code=400, detail={"password": issues})
    try:
        user = consume_password_reset(db, payload.token)
    except ResetTokenError as exc:
        raise HTTPException(status_code=400, detail={"code": exc.code, "message": exc.message}) from exc
    user.password_hash = hash_password(payload.password)
    db.commit()
    return ResetPasswordOut(detail="Password updated. Sign in with your new password.")


@router.post("/google", response_model=TokenOut)
def google_sign_in(payload: GoogleAuthIn, db: Session = Depends(get_db)) -> TokenOut:
    # Client-asserted Google identity is not verified here — do not use for demos or production.
    _ = payload, db
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Google sign-in is not enabled. Use email registration.",
    )


@router.post("/onboarding/patient", response_model=TokenOut)
def onboarding_patient(payload: PatientOnboardingIn, user: AuthenticatedUser, db: Session = Depends(get_db)) -> TokenOut:
    if user.role != UserRole.patient:
        raise HTTPException(status_code=400, detail="Patient onboarding only.")
    if user.status == AccountStatus.active and user.therapist_id:
        return _token_for(user)
    if user.status not in (AccountStatus.pending_onboarding, AccountStatus.active):
        raise HTTPException(
            status_code=400,
            detail=f"Account status is {user.status.value}. Complete email verification first.",
        )

    therapist = _resolve_therapist(db, payload.therapist_invite_code)
    user.full_name = payload.full_name
    user.date_of_birth = payload.date_of_birth
    user.phone = payload.phone
    user.body_region = payload.body_region
    user.rehab_goal = payload.rehab_goal
    user.notes = payload.notes
    user.therapist_id = therapist.id
    user.status = AccountStatus.active
    db.add(
        ConsentRecord(
            patient_id=user.id,
            purpose="camera_analysis",
            status=ConsentStatus.granted,
            revoked_at=None,
        )
    )
    db.commit()
    db.refresh(user)
    return _token_for(user)


@router.post("/onboarding/therapist", response_model=TokenOut)
def onboarding_therapist(
    payload: TherapistOnboardingIn, user: AuthenticatedUser, db: Session = Depends(get_db)
) -> TokenOut:
    if user.role != UserRole.physiotherapist:
        raise HTTPException(status_code=400, detail="Therapist onboarding only.")
    if user.status == AccountStatus.pending_approval:
        return _token_for(user)
    if user.status != AccountStatus.pending_onboarding:
        raise HTTPException(
            status_code=400,
            detail=f"Account status is {user.status.value}. Complete email verification first.",
        )
    user.full_name = payload.full_name
    user.phone = payload.phone
    user.license_number = payload.license_number
    user.clinic_name = payload.clinic_name
    user.specialty = payload.specialty
    user.status = AccountStatus.pending_approval
    db.commit()
    db.refresh(user)
    return _token_for(user)


@router.post("/token", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> TokenOut:
    user = db.query(User).filter(User.email == form.username.lower()).first()
    if user is None or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email or password is not correct.")
    if user.status == AccountStatus.inactive:
        raise HTTPException(status_code=403, detail="This account is inactive.")
    return _token_for(user)


@router.get("/me", response_model=UserOut)
def me(user: AuthenticatedUser) -> User:
    return user


@router.get("/my-therapist", response_model=TherapistContactOut)
def my_therapist(user: CurrentUser, db: Session = Depends(get_db)) -> TherapistContactOut:
    if user.role != UserRole.patient:
        raise HTTPException(status_code=403, detail="Only patients can view their assigned therapist.")
    if not user.therapist_id:
        raise HTTPException(status_code=404, detail="No physiotherapist is assigned to your account yet.")
    therapist = db.get(User, user.therapist_id)
    if therapist is None or therapist.role != UserRole.physiotherapist:
        raise HTTPException(status_code=404, detail="Your assigned physiotherapist could not be found.")
    return TherapistContactOut(
        full_name=therapist.full_name or "Your physiotherapist",
        phone=therapist.phone,
        clinic_name=therapist.clinic_name,
    )


def _resolve_therapist(db: Session, invite_code: str) -> User:
    code = invite_code.strip().upper()
    therapist = db.query(User).filter(User.invite_code == code).first()
    if therapist is None:
        raise HTTPException(status_code=400, detail="That invite code was not found. Check with your physiotherapist.")
    if therapist.role != UserRole.physiotherapist:
        raise HTTPException(status_code=400, detail="That invite code does not belong to a physiotherapist.")
    if therapist.status != AccountStatus.active:
        raise HTTPException(
            status_code=400,
            detail="This physiotherapist account is not active yet. Ask them to confirm their clinic access.",
        )
    return therapist


@router.patch("/me", response_model=UserOut)
def update_me(
    payload: PatientProfileUpdateIn,
    user: CurrentUser,
    db: Session = Depends(get_db),
) -> User:
    if user.role != UserRole.patient:
        raise HTTPException(status_code=403, detail="Only patients can update this profile here.")
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No changes provided.")
    for key, value in data.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user


@router.post("/change-therapist", response_model=TherapistContactOut)
def change_therapist(
    payload: ChangeTherapistIn,
    user: CurrentUser,
    db: Session = Depends(get_db),
) -> TherapistContactOut:
    if user.role != UserRole.patient:
        raise HTTPException(status_code=403, detail="Only patients can change their physiotherapist.")
    therapist = _resolve_therapist(db, payload.therapist_invite_code)
    if user.therapist_id == therapist.id:
        raise HTTPException(status_code=400, detail="You are already linked to this physiotherapist.")
    user.therapist_id = therapist.id
    db.commit()
    db.refresh(user)
    return TherapistContactOut(
        full_name=therapist.full_name or "Your physiotherapist",
        phone=therapist.phone,
        clinic_name=therapist.clinic_name,
    )


@router.delete("/me", response_model=UserOut)
def delete_me(user: CurrentUser, db: Session = Depends(get_db)) -> User:
    if user.role != UserRole.patient:
        raise HTTPException(status_code=403, detail="Only patients can delete their account here.")
    user.status = AccountStatus.inactive
    db.commit()
    db.refresh(user)
    return user
