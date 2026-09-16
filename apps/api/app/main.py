from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ALLOW_ALL, CORS_ORIGINS, DATABASE_URL, IS_DEV
from app.db import Base, SessionLocal, engine
from app.routers import admin, appointments, auth, consent, exercises, observations, patients, plans, sessions, video
from app.schema_migrate import ensure_schema
from app.seed import ensure_system_exercises, seed_demo


@asynccontextmanager
async def lifespan(_: FastAPI):
    if engine is None or SessionLocal is None:
        raise RuntimeError("Database engine is not configured.")
    Base.metadata.create_all(bind=engine)
    ensure_schema(engine)
    db = SessionLocal()
    try:
        if IS_DEV and DATABASE_URL.startswith("sqlite"):
            seed_demo(db)
        else:
            ensure_system_exercises(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Stride API",
    description="Therapist-led tele-physiotherapy workflow for the academic prototype. Not a medical device.",
    version="0.3.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if CORS_ALLOW_ALL else CORS_ORIGINS,
    allow_credentials=not CORS_ALLOW_ALL,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(exercises.router)
app.include_router(plans.router)
app.include_router(sessions.router)
app.include_router(appointments.router)
app.include_router(observations.router)
app.include_router(consent.router)
app.include_router(admin.router)
app.include_router(video.router)


@app.get("/health", tags=["Health"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": "stride-api"}
