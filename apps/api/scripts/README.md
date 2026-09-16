# API scripts

Utilities for local development of `apps/api`. Run from `apps/api` with the virtualenv active:

```bat
.venv\Scripts\python -m app.seed --reset
.venv\Scripts\python scripts\bootstrap_admin.py --email ... --password ...
```

| Script | Purpose |
|---|---|
| `seed_demo.py` | Thin CLI wrapper around `python -m app.seed` |
| `bootstrap_admin.py` | Create the first administrator account |
| `e2e_qa_report.py` | API-level QA harness against a running server |
| `verify_observation_progress.py` | Smoke-check observation approval → patient progress |

These are development aids, not imported by the FastAPI app at runtime.
