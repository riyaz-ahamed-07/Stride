"""Password rules and OTP helpers."""

from __future__ import annotations

import re
import secrets
from datetime import datetime, timedelta, timezone

OTP_LENGTH = 6
OTP_TTL_MINUTES = 15


def validate_password_strength(password: str) -> list[str]:
    """Return list of unmet rules (empty = valid)."""
    issues: list[str] = []
    if len(password) < 8:
        issues.append("At least 8 characters")
    if not re.search(r"[A-Z]", password):
        issues.append("One uppercase letter")
    if not re.search(r"[0-9]", password):
        issues.append("One number")
    if not re.search(r"[^A-Za-z0-9]", password):
        issues.append("One symbol")
    return issues


def generate_otp() -> str:
    return "".join(secrets.choice("0123456789") for _ in range(OTP_LENGTH))


def otp_expires_at() -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES)
