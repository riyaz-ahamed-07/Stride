"""Email OTP and password reset token storage."""

from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.auth_utils import generate_otp, otp_expires_at
from app.config import IS_DEV, SMTP_CONFIGURED
from app.email_service import EmailDeliveryError, send_otp_email
from app.models import EmailOtp, PasswordResetToken, User

logger = logging.getLogger("stride.auth")


class ResetTokenError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


def _hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def issue_otp(db: Session, email: str, purpose: str) -> str:
    db.query(EmailOtp).filter(
        EmailOtp.email == email.lower(),
        EmailOtp.purpose == purpose,
        EmailOtp.consumed.is_(False),
    ).update({"consumed": True})
    code = generate_otp()
    db.add(
        EmailOtp(
            email=email.lower(),
            code_hash=_hash(code),
            purpose=purpose,
            expires_at=otp_expires_at(),
        )
    )
    db.commit()
    try:
        send_otp_email(to=email, code=code, purpose=purpose)
    except EmailDeliveryError:
        # Always leave the code in Render/server logs so demos can continue.
        print(f"\n>>> OTP FALLBACK for {email} ({purpose}): {code}\n", flush=True)
        logger.exception("OTP email delivery failed for %s — code logged to stdout", email)
        if IS_DEV and not SMTP_CONFIGURED:
            return code
        raise
    if IS_DEV and not SMTP_CONFIGURED:
        print(f"\n>>> OTP for {email} ({purpose}): {code}\n", flush=True)
        logger.info("OTP for %s (%s): %s (dev fallback — SMTP not configured)", email, purpose, code)
    return code


def verify_otp(db: Session, email: str, code: str, purpose: str) -> bool:
    now = datetime.now(timezone.utc)
    rows = (
        db.query(EmailOtp)
        .filter(
            EmailOtp.email == email.lower(),
            EmailOtp.purpose == purpose,
            EmailOtp.consumed.is_(False),
        )
        .order_by(EmailOtp.created_at.desc())
        .all()
    )
    for row in rows:
        expires = row.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires <= now:
            row.consumed = True
            continue
        if row.code_hash == _hash(code):
            row.consumed = True
            db.commit()
            return True
    db.commit()
    return False


def issue_password_reset(db: Session, user: User) -> str:
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.consumed.is_(False),
    ).update({"consumed": True})
    token = secrets.token_urlsafe(32)
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=_hash(token),
            expires_at=otp_expires_at(),
        )
    )
    db.commit()
    if IS_DEV:
        logger.info("Password reset token issued for %s", user.email)
    else:
        logger.info("Password reset token issued")
    return token


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def consume_password_reset(db: Session, token: str) -> User:
    now = datetime.now(timezone.utc)
    row = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == _hash(token))
        .first()
    )
    if row is None:
        raise ResetTokenError("invalid", "This reset link is invalid.")
    if row.consumed:
        raise ResetTokenError("already_used", "This reset link has already been used. Request a new one.")
    if _as_utc(row.expires_at) <= now:
        raise ResetTokenError("expired", "This reset link has expired. Request a new one.")
    user = db.get(User, row.user_id)
    if user is None:
        raise ResetTokenError("invalid", "This reset link is invalid.")
    row.consumed = True
    db.flush()
    return user
