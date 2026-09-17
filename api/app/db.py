from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import DATABASE_URL

engine: Engine | None = None
SessionLocal: sessionmaker[Session] | None = None


def _sqlalchemy_url(database_url: str) -> str:
    # requirements ship psycopg3; bare postgresql:// still defaults to psycopg2.
    if database_url.startswith("postgresql://"):
        return "postgresql+psycopg://" + database_url.removeprefix("postgresql://")
    if database_url.startswith("postgres://"):
        return "postgresql+psycopg://" + database_url.removeprefix("postgres://")
    return database_url


def configure_engine(database_url: str) -> Engine:
    global engine, SessionLocal
    if engine is not None:
        engine.dispose()
    url = _sqlalchemy_url(database_url)
    if url.startswith("sqlite"):
        connect_args: dict = {"check_same_thread": False}
        engine = create_engine(url, connect_args=connect_args, future=True)
    else:
        # Supabase transaction pooler (PgBouncer :6543) rejects named prepared
        # statements across clients — disable them for psycopg3.
        engine = create_engine(
            url,
            connect_args={"prepare_threshold": None},
            pool_pre_ping=True,
            future=True,
        )
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    return engine


configure_engine(DATABASE_URL)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    if SessionLocal is None:
        raise RuntimeError("Database engine is not configured.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
