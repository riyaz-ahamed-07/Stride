import os
import tempfile
from pathlib import Path

_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp.close()
os.environ["STRIDE_DATABASE_URL"] = f"sqlite:///{Path(_tmp.name).as_posix()}"
os.environ["STRIDE_ENV"] = "dev"
os.environ["STRIDE_SMTP_HOST"] = ""
os.environ["STRIDE_LIVEKIT_URL"] = "ws://127.0.0.1:7880"
os.environ["STRIDE_LIVEKIT_API_KEY"] = "devkey"
os.environ["STRIDE_LIVEKIT_API_SECRET"] = "devsecret-devsecret-devsecret-12"
os.environ["STRIDE_VIDEO_TOKEN_MINUTES"] = "15"
