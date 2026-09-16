"""Outbound email. SMTP is optional; local demo logs a reset URL instead of sending."""

from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage
from urllib.parse import quote

from app.auth_utils import OTP_TTL_MINUTES
from app.config import (
    IS_DEV,
    PUBLIC_APP_URL,
    SMTP_CONFIGURED,
    SMTP_FROM,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USER,
    SMTP_USE_TLS,
)

logger = logging.getLogger("stride.email")


def expose_dev_reset_token() -> bool:
    return IS_DEV and not SMTP_CONFIGURED


def send_password_reset_email(*, to: str, token: str) -> None:
    reset_url = f"{PUBLIC_APP_URL}/reset-password?token={quote(token, safe='')}"
    if SMTP_CONFIGURED:
        try:
            _deliver_smtp(to, reset_url)
            logger.info("Password reset email dispatched")
        except Exception:
            logger.exception("Failed to send password reset email")
        return
    if IS_DEV:
        print(f"\n>>> Password reset (local demo, email not configured)\n    {reset_url}\n", flush=True)
        logger.info("Password reset link logged for local demo (SMTP not configured)")
        return
    logger.warning("Password reset email not sent; SMTP is not configured.")


def _deliver_smtp(to: str, reset_url: str) -> None:
    from_addr = SMTP_FROM or SMTP_USER or "noreply@stride.local"
    message = EmailMessage()
    message["From"] = from_addr
    message["To"] = to
    message["Subject"] = "Reset your Stride password"
    message.set_content(
        "We received a request to reset your Stride password.\n\n"
        f"Open this link to choose a new password (expires in {OTP_TTL_MINUTES} minutes):\n"
        f"{reset_url}\n\n"
        "If you did not request this, you can ignore this email."
    )
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as smtp:
        if SMTP_USE_TLS:
            smtp.starttls()
        if SMTP_USER:
            smtp.login(SMTP_USER, SMTP_PASSWORD)
        smtp.send_message(message)
