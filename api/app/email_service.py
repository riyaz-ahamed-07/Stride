"""Outbound email. Prefer Resend HTTPS on hosts that block SMTP (e.g. Render)."""

from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage
from urllib.parse import quote

import httpx

from app.config import (
    IS_DEV,
    MAIL_CONFIGURED,
    PUBLIC_APP_URL,
    RESEND_API_KEY,
    RESEND_FROM,
    SMTP_CONFIGURED,
    SMTP_FROM,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USER,
    SMTP_USE_TLS,
)
from app.email_templates import otp_email, password_reset_email

logger = logging.getLogger("stride.email")


class EmailDeliveryError(RuntimeError):
    """Raised when mail is configured but delivery fails."""


def expose_dev_reset_token() -> bool:
    return IS_DEV and not MAIL_CONFIGURED


def mail_status() -> dict[str, object]:
    return {
        "mail_configured": MAIL_CONFIGURED,
        "provider": "resend" if RESEND_API_KEY else ("smtp" if SMTP_CONFIGURED else None),
        "resend_key_set": bool(RESEND_API_KEY),
        "resend_from": RESEND_FROM if RESEND_API_KEY else None,
        "smtp_configured": SMTP_CONFIGURED,
        "smtp_host": SMTP_HOST or None,
        "smtp_port": SMTP_PORT if SMTP_CONFIGURED else None,
        "smtp_user_set": bool(SMTP_USER),
        "smtp_password_set": bool(SMTP_PASSWORD),
        "smtp_from": SMTP_FROM or None,
    }


def send_otp_email(*, to: str, code: str, purpose: str = "verify_email") -> None:
    subject, plain, html = otp_email(code=code, purpose=purpose)
    _dispatch(to=to, subject=subject, plain=plain, html=html, kind="otp")


def send_password_reset_email(*, to: str, token: str) -> None:
    reset_url = f"{PUBLIC_APP_URL}/reset-password?token={quote(token, safe='')}"
    subject, plain, html = password_reset_email(reset_url=reset_url)
    _dispatch(to=to, subject=subject, plain=plain, html=html, kind="password_reset")


def _dispatch(*, to: str, subject: str, plain: str, html: str, kind: str) -> None:
    if RESEND_API_KEY:
        try:
            _deliver_resend(to=to, subject=subject, plain=plain, html=html)
            logger.info("%s email dispatched via Resend to %s", kind, to)
            print(f">>> EMAIL OK ({kind}/resend) → {to}", flush=True)
            return
        except Exception as exc:
            logger.exception("Failed to send %s email via Resend to %s", kind, to)
            print(f">>> EMAIL FAIL ({kind}/resend) → {to}: {exc}", flush=True)
            raise EmailDeliveryError(f"Could not send email via Resend: {exc}") from exc

    if SMTP_CONFIGURED:
        try:
            _deliver_smtp(to=to, subject=subject, plain=plain, html=html)
            logger.info("%s email dispatched via SMTP to %s", kind, to)
            print(f">>> EMAIL OK ({kind}/smtp) → {to}", flush=True)
            return
        except Exception as exc:
            logger.exception("Failed to send %s email via SMTP to %s", kind, to)
            print(f">>> EMAIL FAIL ({kind}/smtp) → {to}: {exc}", flush=True)
            raise EmailDeliveryError(
                f"Could not send email via SMTP: {exc}. "
                "Render often blocks Gmail SMTP — set STRIDE_RESEND_API_KEY instead."
            ) from exc

    if IS_DEV:
        print(
            f"\n>>> {kind} email (local demo, mail not configured)\nTo: {to}\n{subject}\n{plain}\n",
            flush=True,
        )
        logger.info("%s content logged for local demo (mail not configured)", kind)
        return

    logger.warning("%s email not sent; no Resend/SMTP configured.", kind)
    print(f">>> EMAIL SKIP ({kind}) — set STRIDE_RESEND_API_KEY (recommended on Render)", flush=True)
    raise EmailDeliveryError(
        "Email is not configured. On Render set STRIDE_RESEND_API_KEY (Gmail SMTP is usually blocked)."
    )


def _deliver_resend(*, to: str, subject: str, plain: str, html: str) -> None:
    payload = {
        "from": RESEND_FROM,
        "to": [to],
        "subject": subject,
        "text": plain,
        "html": html,
    }
    response = httpx.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=30.0,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"Resend HTTP {response.status_code}: {response.text[:400]}")


def _deliver_smtp(*, to: str, subject: str, plain: str, html: str) -> None:
    import socket
    import ssl

    from_addr = SMTP_FROM or SMTP_USER or "noreply@stride.local"
    message = EmailMessage()
    message["From"] = from_addr
    message["To"] = to
    message["Subject"] = subject
    message.set_content(plain)
    message.add_alternative(html, subtype="html")
    password = (SMTP_PASSWORD or "").replace(" ", "")
    context = ssl.create_default_context()

    addrinfo = socket.getaddrinfo(SMTP_HOST, SMTP_PORT, socket.AF_INET, socket.SOCK_STREAM)
    if not addrinfo:
        raise OSError(f"No IPv4 address for {SMTP_HOST}")
    family, socktype, proto, _, sockaddr = addrinfo[0]
    raw = socket.socket(family, socktype, proto)
    raw.settimeout(30)
    try:
        raw.connect(sockaddr)
        if SMTP_PORT == 465:
            sock = context.wrap_socket(raw, server_hostname=SMTP_HOST)
            smtp: smtplib.SMTP = smtplib.SMTP_SSL()
            smtp.sock = sock
            code, _ = smtp.getreply()
            if code != 220:
                raise smtplib.SMTPConnectError(code, "SMTP SSL greeting failed")
        else:
            smtp = smtplib.SMTP()
            smtp.sock = raw
            smtp._host = SMTP_HOST  # noqa: SLF001 — SNI/cert name for STARTTLS
            code, _ = smtp.getreply()
            if code != 220:
                raise smtplib.SMTPConnectError(code, "SMTP greeting failed")
            if SMTP_USE_TLS:
                smtp.starttls(context=context)
        if SMTP_USER:
            smtp.login(SMTP_USER, password)
        smtp.send_message(message)
        smtp.quit()
    except Exception:
        try:
            raw.close()
        except OSError:
            pass
        raise
