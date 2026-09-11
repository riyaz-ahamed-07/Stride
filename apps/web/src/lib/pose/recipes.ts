/**
 * Pose recipes: clinician-facing exercises map to preset joint logic.
 * Therapists prescribe dosage + cues; they never edit angle thresholds.
 * Sources: clinical HEP conventions + MediaPipe landmark indices.
 */

export type PoseRecipeKey = "sit_to_stand" | "straight_leg_raise" | "mini_squat";

export type PoseRecipe = {
  key: PoseRecipeKey;
  label: string;
  summary: string;
  /** Human cue shown to patient — not raw angles */
  patientCue: string;
  joints: string[];
};

export const POSE_RECIPES: Record<PoseRecipeKey, PoseRecipe> = {
  sit_to_stand: {
    key: "sit_to_stand",
    label: "Sit to stand",
    summary: "Counts sit↔stand cycles from knee flexion/extension rules.",
    patientCue: "Stand tall, then sit with control. Each full stand-to-sit counts as one.",
    joints: ["hip", "knee", "ankle"],
  },
  straight_leg_raise: {
    key: "straight_leg_raise",
    label: "Straight leg raise",
    summary: "Detects hip flexion with a relatively straight knee.",
    patientCue: "Keep the knee straight while the leg lifts and lowers.",
    joints: ["hip", "knee"],
  },
  mini_squat: {
    key: "mini_squat",
    label: "Mini squat",
    summary: "Tracks shallow knee bend depth without deep squat thresholds.",
    patientCue: "Small bend, then stand tall. Stay within a comfortable range.",
    joints: ["hip", "knee"],
  },
};

export function recipeFor(key: string | null | undefined): PoseRecipe | null {
  if (!key) return null;
  return POSE_RECIPES[key as PoseRecipeKey] ?? null;
}
