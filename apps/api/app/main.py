from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ALLOW_ALL, CORS_ORIGINS
from app.db import Base, SessionLocal, engine
from app.routers import admin, appointments, auth, consent, exercises, observations, patients, plans, sessions, video
from app.seed import seed_if_empty


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_if_empty(db)
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
