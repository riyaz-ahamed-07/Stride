"""Preview Stride email HTML locally and optionally send via SMTP.

Usage (from api/ with venv active):

  # Write responsive HTML previews and open in browser
  python scripts/preview_emails.py

  # Also send real messages to your inbox (uses api/.env SMTP)
  python scripts/preview_emails.py --send --to you@gmail.com

  # OTP only / reset only
  python scripts/preview_emails.py --only otp
  python scripts/preview_emails.py --only reset --send --to you@gmail.com
"""

from __future__ import annotations

import argparse
import sys
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.config import PUBLIC_APP_URL, SMTP_CONFIGURED, SMTP_USER  # noqa: E402
from app.email_service import send_otp_email, send_password_reset_email  # noqa: E402
from app.email_templates import otp_email, password_reset_email  # noqa: E402

OUT_DIR = ROOT / "scripts" / "_email_preview"


def _write(name: str, html: str) -> Path:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / name
    path.write_text(html, encoding="utf-8")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description="Preview / send Stride transactional emails")
    parser.add_argument("--only", choices=("otp", "reset", "all"), default="all")
    parser.add_argument("--send", action="store_true", help="Send via SMTP from api/.env")
    parser.add_argument("--to", default="", help="Recipient when using --send")
    parser.add_argument("--no-open", action="store_true", help="Do not open browser")
    args = parser.parse_args()

    paths: list[Path] = []

    if args.only in {"otp", "all"}:
        subject, plain, html = otp_email(code="787812", purpose="verify_email")
        path = _write("otp-verify.html", html)
        paths.append(path)
        print(f"OTP preview: {path}")
        print(f"  subject: {subject}")
        print(f"  plain:   {plain.splitlines()[0]}")
        if args.send:
            to = (args.to or SMTP_USER or "").strip()
            if not to:
                print("ERROR: pass --to email@example.com")
                return 1
            if not SMTP_CONFIGURED:
                print("ERROR: SMTP not configured in api/.env")
                return 1
            send_otp_email(to=to, code="787812", purpose="verify_email")
            print(f"  sent OTP HTML mail to {to}")

    if args.only in {"reset", "all"}:
        demo_url = f"{PUBLIC_APP_URL}/reset-password?token=preview-demo-token"
        subject, plain, html = password_reset_email(reset_url=demo_url)
        path = _write("password-reset.html", html)
        paths.append(path)
        print(f"Reset preview: {path}")
        print(f"  subject: {subject}")
        if args.send:
            to = (args.to or SMTP_USER or "").strip()
            if not to:
                print("ERROR: pass --to email@example.com")
                return 1
            if not SMTP_CONFIGURED:
                print("ERROR: SMTP not configured in api/.env")
                return 1
            send_password_reset_email(to=to, token="preview-demo-token")
            print(f"  sent reset HTML mail to {to}")

    if not args.no_open:
        for path in paths:
            webbrowser.open(path.resolve().as_uri())

    print("\nTip: resize the browser window or use DevTools device mode to check mobile layout.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
