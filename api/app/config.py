import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Load api/.env if present (gitignored). SQLite remains the default without it.
_env_file = ROOT / ".env"
if _env_file.exists():
    for raw in _env_file.read_text(encoding="utf-8-sig").splitlines():
        line = raw.strip().lstrip("\ufeff")
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip().lstrip("\ufeff")
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)

DATABASE_URL = os.getenv("STRIDE_DATABASE_URL", f"sqlite:///{ROOT / 'stride.db'}")
SECRET_KEY = os.getenv("STRIDE_SECRET_KEY", "stride-academic-prototype-change-before-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("STRIDE_TOKEN_MINUTES", "720"))
# Default local/demo. Set STRIDE_ENV=production to hide OTP/reset secrets from API responses.
STRIDE_ENV = os.getenv("STRIDE_ENV", "dev").strip().lower()
IS_DEV = STRIDE_ENV in {"dev", "development", "local"}
PUBLIC_APP_URL = os.getenv("STRIDE_PUBLIC_APP_URL", "http://localhost:3001").rstrip("/")
SMTP_HOST = os.getenv("STRIDE_SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("STRIDE_SMTP_PORT", "587"))
SMTP_USER = os.getenv("STRIDE_SMTP_USER", "").strip()
SMTP_PASSWORD = os.getenv("STRIDE_SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("STRIDE_SMTP_FROM", "").strip()
SMTP_USE_TLS = os.getenv("STRIDE_SMTP_TLS", "1") == "1"
SMTP_CONFIGURED = bool(SMTP_HOST)
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "STRIDE_CORS_ORIGINS",
        "http://localhost:3001,http://127.0.0.1:3001,http://localhost:8081,http://localhost:19006",
    ).split(",")
    if origin.strip()
]
# Allow any origin in local demo when STRIDE_CORS_ALLOW_ALL=1 (phone on LAN, etc.)
CORS_ALLOW_ALL = os.getenv("STRIDE_CORS_ALLOW_ALL", "1") == "1"
SUPABASE_URL = os.getenv("STRIDE_SUPABASE_URL", "")
SUPABASE_PROJECT_REF = os.getenv("STRIDE_SUPABASE_PROJECT_REF", "")
LIVEKIT_URL = os.getenv("STRIDE_LIVEKIT_URL") or os.getenv("LIVEKIT_URL", "")
LIVEKIT_API_KEY = os.getenv("STRIDE_LIVEKIT_API_KEY") or os.getenv("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.getenv("STRIDE_LIVEKIT_API_SECRET") or os.getenv("LIVEKIT_API_SECRET", "")
VIDEO_TOKEN_TTL_MINUTES = int(os.getenv("STRIDE_VIDEO_TOKEN_MINUTES", "15"))
