import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATABASE_URL = os.getenv("STRIDE_DATABASE_URL", f"sqlite:///{ROOT / 'stride.db'}")
SECRET_KEY = os.getenv("STRIDE_SECRET_KEY", "stride-academic-prototype-change-before-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("STRIDE_TOKEN_MINUTES", "720"))
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "STRIDE_CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8081,http://localhost:19006",
    ).split(",")
    if origin.strip()
]
# Allow any origin in local demo when STRIDE_CORS_ALLOW_ALL=1 (phone on LAN, Expo tunnel, etc.)
CORS_ALLOW_ALL = os.getenv("STRIDE_CORS_ALLOW_ALL", "1") == "1"
