import {
  KINOVEA_HUMAN_POINTS,
  type KinoveaPoint,
} from "./humanModel";

export type PostureVariantKey = "standing" | "sitting" | "mini_squat" | "leg_raise";

/** Clinician-facing demo poses — derived from Kinovea human model joint angles. */
export function kinoveaPointsForVariant(key: PostureVariantKey | null | undefined): KinoveaPoint[] {
  const base = KINOVEA_HUMAN_POINTS.map((p) => ({ ...p }));

  switch (key) {
    case "sitting":
      return applySitting(base);
    case "mini_squat":
      return applyMiniSquat(base);
    case "leg_raise":
      return applyLegRaise(base);
    case "standing":
    default:
      return base;
  }
}

export function variantForRecipe(recipeKey: string | null | undefined): PostureVariantKey {
  switch (recipeKey) {
    case "sit_to_stand":
      return "standing";
    case "mini_squat":
      return "mini_squat";
    case "straight_leg_raise":
      return "leg_raise";
    default:
      return "standing";
  }
}

function set(base: KinoveaPoint[], index: number, x: number, y: number): KinoveaPoint[] {
  base[index] = { ...base[index], x, y };
  return base;
}

/** Seated reference — knees flexed, hips back slightly (Kinovea-style posture tool). */
function applySitting(points: KinoveaPoint[]): KinoveaPoint[] {
  const p = points.map((pt) => ({ ...pt }));
  set(p, 6, 215, 340);
  set(p, 15, 155, 340);
  set(p, 7, 250, 400);
  set(p, 16, 120, 400);
  set(p, 8, 250, 500);
  set(p, 17, 120, 500);
  set(p, 9, 265, 530);
  set(p, 18, 105, 530);
  set(p, 10, 245, 525);
  set(p, 19, 125, 525);
  return p;
}

function applyMiniSquat(points: KinoveaPoint[]): KinoveaPoint[] {
  const p = points.map((pt) => ({ ...pt }));
  set(p, 6, 208, 310);
  set(p, 15, 162, 310);
  set(p, 7, 205, 440);
  set(p, 16, 165, 440);
  set(p, 3, 228, 265);
  set(p, 12, 142, 265);
  return p;
}

function applyLegRaise(points: KinoveaPoint[]): KinoveaPoint[] {
  const p = points.map((pt) => ({ ...pt }));
  set(p, 7, 195, 330);
  set(p, 8, 175, 420);
  set(p, 9, 200, 440);
  set(p, 10, 170, 435);
  return p;
}
