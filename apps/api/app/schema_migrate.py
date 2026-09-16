"""Lightweight SQLite column adds for academic prototype (no Alembic yet)."""

from __future__ import annotations

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def ensure_schema(engine: Engine) -> None:
    if engine.dialect.name != "sqlite":
        return
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    with engine.begin() as conn:
        if "exercises" in tables:
            cols = {c["name"] for c in inspector.get_columns("exercises")}
            _add(conn, "exercises", cols, "body_region", "VARCHAR(80) DEFAULT 'general'")
            _add(conn, "exercises", cols, "category", "VARCHAR(80) DEFAULT 'strength'")
            _add(conn, "exercises", cols, "default_sets", "INTEGER DEFAULT 2")
            _add(conn, "exercises", cols, "default_repetitions", "INTEGER DEFAULT 8")
            _add(conn, "exercises", cols, "demo_cue", "TEXT DEFAULT ''")
            _add(conn, "exercises", cols, "pose_recipe_key", "VARCHAR(80)")
            _add(conn, "exercises", cols, "source_id", "VARCHAR(80)")
            _add(conn, "exercises", cols, "source", "VARCHAR(80)")
            _add(conn, "exercises", cols, "created_by_id", "VARCHAR(36)")
            _add(conn, "exercises", cols, "is_system", "BOOLEAN DEFAULT 0")

        if "rehabilitation_plans" in tables:
            cols = {c["name"] for c in inspector.get_columns("rehabilitation_plans")}
            _add(conn, "rehabilitation_plans", cols, "duration_weeks", "INTEGER DEFAULT 4")
            _add(conn, "rehabilitation_plans", cols, "goal", "TEXT DEFAULT ''")

        if "plan_exercises" in tables:
            cols = {c["name"] for c in inspector.get_columns("plan_exercises")}
            _add(conn, "plan_exercises", cols, "week_number", "INTEGER DEFAULT 1")
            _add(conn, "plan_exercises", cols, "day_of_week", "INTEGER")
            _add(conn, "plan_exercises", cols, "session_type", "VARCHAR(20) DEFAULT 'home'")
            _add(conn, "plan_exercises", cols, "sort_order", "INTEGER DEFAULT 0")
            _add(conn, "plan_exercises", cols, "frequency_note", "VARCHAR(120) DEFAULT ''")

        if "users" in tables:
            cols = {c["name"] for c in inspector.get_columns("users")}
            _add(conn, "users", cols, "auth_provider", "VARCHAR(32) DEFAULT 'email'")
            _add(conn, "users", cols, "email_verified", "BOOLEAN DEFAULT 0")
            _add(conn, "users", cols, "phone", "VARCHAR(32)")
            _add(conn, "users", cols, "license_number", "VARCHAR(80)")
            _add(conn, "users", cols, "clinic_name", "VARCHAR(255)")
            _add(conn, "users", cols, "specialty", "VARCHAR(120)")
            _add(conn, "users", cols, "invite_code", "VARCHAR(16)")
            _add(conn, "users", cols, "body_region", "VARCHAR(40)")
            _add(conn, "users", cols, "rehab_goal", "VARCHAR(280)")

        if "appointments" in tables:
            cols = {c["name"] for c in inspector.get_columns("appointments")}
            _add(conn, "appointments", cols, "plan_id", "VARCHAR(36)")
            _add(conn, "appointments", cols, "week_number", "INTEGER")

        if "movement_observations" in tables:
            cols = {c["name"] for c in inspector.get_columns("movement_observations")}
            _add(conn, "movement_observations", cols, "original_value", "FLOAT")


def _add(conn, table: str, existing: set[str], column: str, ddl: str) -> None:
    if column in existing:
        return
    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))
