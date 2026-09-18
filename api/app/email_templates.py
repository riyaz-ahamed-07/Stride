"""Responsive HTML + plain-text bodies for Stride transactional email."""

from __future__ import annotations

from html import escape

from app.auth_utils import OTP_TTL_MINUTES

# Brand tokens (shared/design-tokens.json)
_PRIMARY = "#0058B8"
_ACCENT = "#00C6A7"
_TEXT = "#0F172A"
_MUTED = "#64748B"
_PAGE = "#F5F8FC"
_CARD = "#FFFFFF"
_BORDER = "#E2E8F0"


def _shell(*, title: str, preheader: str, inner_html: str) -> str:
    pre = escape(preheader)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="color-scheme" content="light"/>
  <meta name="supported-color-schemes" content="light"/>
  <title>{escape(title)}</title>
  <style>
    body, table, td, a {{ -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }}
    table, td {{ mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }}
    img {{ -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }}
    body {{ margin: 0 !important; padding: 0 !important; width: 100% !important; background: {_PAGE}; }}
    .preheader {{ display: none !important; visibility: hidden; opacity: 0; color: transparent;
      height: 0; width: 0; max-height: 0; max-width: 0; overflow: hidden; mso-hide: all; }}
    .wrap {{ width: 100%; background: {_PAGE}; }}
    .card {{ width: 100%; max-width: 560px; background: {_CARD}; border: 1px solid {_BORDER};
      border-radius: 16px; overflow: hidden; }}
    .brand {{ font-family: Arial, Helvetica, sans-serif; font-size: 22px; font-weight: 700;
      letter-spacing: 0.02em; color: {_PRIMARY}; }}
    .h1 {{ font-family: Arial, Helvetica, sans-serif; font-size: 22px; line-height: 1.3;
      font-weight: 700; color: {_TEXT}; margin: 0 0 12px; }}
    .p {{ font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.55;
      color: {_MUTED}; margin: 0 0 16px; }}
    .code {{ font-family: Consolas, 'Courier New', monospace; font-size: 32px; letter-spacing: 0.28em;
      font-weight: 700; color: {_PRIMARY}; background: #E6F4FF; border-radius: 12px;
      padding: 18px 16px; text-align: center; }}
    .btn {{ display: inline-block; background: {_PRIMARY}; color: #ffffff !important;
      font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 700;
      text-decoration: none; padding: 14px 28px; border-radius: 999px; }}
    .foot {{ font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.5;
      color: {_MUTED}; }}
    .accent-bar {{ height: 4px; background: linear-gradient(90deg, {_PRIMARY}, {_ACCENT}); }}
    @media only screen and (max-width: 620px) {{
      .pad {{ padding: 24px 18px !important; }}
      .h1 {{ font-size: 20px !important; }}
      .code {{ font-size: 26px !important; letter-spacing: 0.18em !important; padding: 16px 12px !important; }}
      .btn {{ display: block !important; width: 100% !important; box-sizing: border-box !important;
        text-align: center !important; }}
    }}
  </style>
</head>
<body>
  <div class="preheader">{pre}</div>
  <table role="presentation" class="wrap" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 28px 14px;">
        <table role="presentation" class="card" cellpadding="0" cellspacing="0">
          <tr><td class="accent-bar"></td></tr>
          <tr>
            <td class="pad" style="padding: 32px 36px 12px;">
              <div class="brand">STRIDE</div>
            </td>
          </tr>
          <tr>
            <td class="pad" style="padding: 8px 36px 32px;">
              {inner_html}
            </td>
          </tr>
          <tr>
            <td class="pad" style="padding: 0 36px 28px;">
              <p class="foot" style="margin:0;">
                Stride tele-physiotherapy · This is an automated message.<br/>
                If you did not expect this email, you can ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def otp_email(*, code: str, purpose: str = "verify_email") -> tuple[str, str, str]:
    safe_code = escape(code)
    if purpose == "verify_email":
        subject = "Your Stride verification code"
        headline = "Verify your email"
        lead = f"Use this code to finish creating your Stride account. It expires in {OTP_TTL_MINUTES} minutes."
        preheader = f"Your Stride code is {code}"
        plain = (
            f"Your Stride email verification code is: {code}\n\n"
            f"This code expires in {OTP_TTL_MINUTES} minutes.\n\n"
            "If you did not create a Stride account, you can ignore this email."
        )
    else:
        subject = "Your Stride security code"
        headline = "Your security code"
        lead = f"Use this code to continue. It expires in {OTP_TTL_MINUTES} minutes."
        preheader = f"Your Stride security code is {code}"
        plain = (
            f"Your Stride security code is: {code}\n\n"
            f"This code expires in {OTP_TTL_MINUTES} minutes.\n"
        )

    inner = f"""
      <h1 class="h1">{escape(headline)}</h1>
      <p class="p">{escape(lead)}</p>
      <div class="code">{safe_code}</div>
      <p class="p" style="margin-top:20px;margin-bottom:0;">
        Enter this code in the app or on the website. Do not share it with anyone.
      </p>
    """
    html = _shell(title=subject, preheader=preheader, inner_html=inner)
    return subject, plain, html


def password_reset_email(*, reset_url: str) -> tuple[str, str, str]:
    subject = "Reset your Stride password"
    safe_url = escape(reset_url, quote=True)
    preheader = "Reset your Stride password"
    plain = (
        "We received a request to reset your Stride password.\n\n"
        f"Open this link to choose a new password (expires in {OTP_TTL_MINUTES} minutes):\n"
        f"{reset_url}\n\n"
        "If you did not request this, you can ignore this email."
    )
    inner = f"""
      <h1 class="h1">Reset your password</h1>
      <p class="p">
        We received a request to reset your Stride password.
        This link expires in {OTP_TTL_MINUTES} minutes.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 8px 0 20px;">
        <tr>
          <td align="center" bgcolor="{_PRIMARY}" style="border-radius:999px;">
            <a class="btn" href="{safe_url}" target="_blank" rel="noopener">Choose a new password</a>
          </td>
        </tr>
      </table>
      <p class="p" style="margin-bottom:8px;">Or copy and paste this link into your browser:</p>
      <p class="p" style="word-break:break-all;font-size:13px;margin-bottom:0;">
        <a href="{safe_url}" style="color:{_PRIMARY};">{safe_url}</a>
      </p>
    """
    html = _shell(title=subject, preheader=preheader, inner_html=inner)
    return subject, plain, html
