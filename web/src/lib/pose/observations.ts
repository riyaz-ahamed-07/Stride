/**
 * Structured movement observations for therapist review.
 * These are derived rule outputs — not raw landmarks and not clinical diagnoses.
 */

import type { SitStandState } from "./sitToStand";

export type ObservationDraft = {
  metric: string;
  value: number;
  confidence: number;
};

/** Build pending (pre-review) observation drafts from sit-to-stand session state. */
export function sitStandObservations(
  state: SitStandState,
  trackingConfidence: number,
): ObservationDraft[] {
  const conf = Math.min(1, Math.max(0, trackingConfidence));
  const drafts: ObservationDraft[] = [
    { metric: "repetitions", value: state.reps, confidence: conf },
  ];

  if (state.incompleteAttempts > 0) {
    drafts.push({
      metric: "incomplete_attempts",
      value: state.incompleteAttempts,
      confidence: conf,
    });
  }
  if (state.trunkLeanEvents > 0) {
    drafts.push({
      metric: "trunk_lateral_offset_events",
      value: state.trunkLeanEvents,
      confidence: Math.min(conf, 0.7),
    });
  }
  if (state.kneeAsymmetryEvents > 0) {
    drafts.push({
      metric: "knee_asymmetry_events",
      value: state.kneeAsymmetryEvents,
      confidence: Math.min(conf, 0.7),
    });
  }

  return drafts;
}
