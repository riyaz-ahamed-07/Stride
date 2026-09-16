"""Create the first clinic administrator (run once)."""

from __future__ import annotations

import argparse
import sys

from app.db import SessionLocal, engine, Base
from app.models import AccountStatus, User, UserRole
from app.schema_migrate import ensure_schema
from app.security import hash_password
from app.seed import ensure_system_exercises


def main() -> None:
    parser = argparse.ArgumentParser(description="Bootstrap Stride administrator")
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", default="Clinic administrator")
    parser.add_argument("--password", required=True)
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    ensure_schema(engine)
    db = SessionLocal()
    try:
        ensure_system_exercises(db)
        existing = db.query(User).filter(User.email == args.email.lower()).first()
        if existing:
            print("User already exists:", existing.email, existing.role.value, existing.status.value)
            sys.exit(1)
        admin = User(
            email=args.email.lower(),
            full_name=args.name,
            password_hash=hash_password(args.password),
            role=UserRole.administrator,
            status=AccountStatus.active,
            email_verified=True,
            auth_provider="email",
        )
        db.add(admin)
        db.commit()
        print("Administrator created:", admin.email)
    finally:
        db.close()


if __name__ == "__main__":
    main()
