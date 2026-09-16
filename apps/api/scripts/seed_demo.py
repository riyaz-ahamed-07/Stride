"""CLI wrapper: python scripts/seed_demo.py [--reset]

Prefer `python -m app.seed` from apps/api (same flags).
"""

from app.seed import main

if __name__ == "__main__":
    main()
