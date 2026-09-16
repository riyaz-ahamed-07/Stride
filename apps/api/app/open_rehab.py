"""
Load Open Rehab Exercises (CC BY 4.0) into Stride seed/catalog shapes.

Source: https://github.com/cutemo0953/open-rehab-exercises
Attribution: Deno Orthopaedics / iRehab — exercise content CC BY 4.0.
"""

from __future__ import annotations

import json
from pathlib import Path

DATA_ROOT = Path(__file__).resolve().parents[1] / "data" / "open_rehab"

DEFAULT_SAFETY = (
    "Stop if you feel pain, dizziness, or unsteadiness. "
    "This is educational content from the Open Rehab Exercises library (CC BY 4.0) — "
    "follow your physiotherapist's advice for your condition."
)

# Stride pose recipes (joint logic stays in app code; therapists never edit angles).
POSE_BY_SOURCE: dict[str, str | None] = {
    "ex-sit-to-stand": "sit_to_stand",
    "ex-slr-flexion": "straight_leg_raise",
    "ex-mini-squats-wall": "mini_squat",
    "ex-mini-squats-60": "mini_squat",
}


def catalog_rows(locale: str = "en") -> list[dict]:
    index_path = DATA_ROOT / "exercises" / "index.json"
    if not index_path.exists():
        return []

    index = json.loads(index_path.read_text(encoding="utf-8"))
    rows: list[dict] = []
    for entry in index.get("exercises", []):
        source_id = entry["id"]
        meta_path = DATA_ROOT / "exercises" / f"{source_id}.json"
        locale_path = DATA_ROOT / "locales" / locale / f"{source_id}.json"
        if not meta_path.exists() or not locale_path.exists():
            continue
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        loc = json.loads(locale_path.read_text(encoding="utf-8"))
        cues = loc.get("audioCues") or []
        demo_cue = " · ".join(cues[:3]) if cues else ""
        rows.append(
            {
                "source_id": source_id,
                "name": loc["name"],
                "instructions": loc.get("instructions") or "",
                "safety_notes": DEFAULT_SAFETY,
                "body_region": meta.get("bodyRegion") or entry.get("bodyRegion") or "general",
                "category": meta.get("category") or entry.get("category") or "strength",
                "default_sets": int(meta.get("defaultSets") or 2),
                "default_repetitions": int(meta.get("defaultReps") or 8),
                "demo_cue": demo_cue,
                "pose_recipe_key": POSE_BY_SOURCE.get(source_id),
            }
        )
    return rows
