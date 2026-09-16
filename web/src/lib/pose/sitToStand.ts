/**
 * Bounded sit-to-stand repetition counter (explainable rules, not a classifier).
 * Standing ≈ extended knee (~155°+); sitting ≈ flexed knee (~115°-).
 * One repetition = sit → stand → sit after a confirmed stand.
 */

export type SitStandPhase =
  | "unknown"
  | "sitting"
  | "rising"
  | "standing"
  | "lowering";

export type SitStandFeatures = {
  kneeDeg: number;
  confidence: number;
  hipDeg?: number | null;
  trunkOffset?: number | null;
  kneeAsymmetry?: number | null;
};

export type SitStandState = {
  reps: number;
  phase: SitStandPhase;
  lastAngle: number;
  reliable: boolean;
  incompleteAttempts: number;
  trunkLeanEvents: number;
  kneeAsymmetryEvents: number;
  guidance: string;
};

/** Confirmed posture used for hysteresis (excludes rising/lowering). */
type ConfirmedPhase = "unknown" | "sitting" | "standing";

export type SitStandHold = {
  count: number;
  candidate: ConfirmedPhase;
  midZoneFrames: number;
  attemptedRise: boolean;
  lastTrunkFlag: boolean;
  lastAsymFlag: boolean;
  confirmed: ConfirmedPhase;
};

const STAND_DEG = 155;
const SIT_DEG = 115;
const MIN_CONFIDENCE = 0.55;
const HOLD_FRAMES = 4;
const TRUNK_LEAN_THRESHOLD = 0.085;
const KNEE_ASYMMETRY_THRESHOLD = 28;
const MID_ZONE_FRAMES_FOR_INCOMPLETE = 6;

export function createSitStandState(): SitStandState {
  return {
    reps: 0,
    phase: "unknown",
    lastAngle: 0,
    reliable: false,
    incompleteAttempts: 0,
    trunkLeanEvents: 0,
    kneeAsymmetryEvents: 0,
    guidance: "Step into frame so your hips and knees are visible.",
  };
}

export function createSitStandHold(): SitStandHold {
  return {
    count: 0,
    candidate: "unknown",
    midZoneFrames: 0,
    attemptedRise: false,
    lastTrunkFlag: false,
    lastAsymFlag: false,
    confirmed: "unknown",
  };
}

function guidanceFor(phase: SitStandPhase, reliable: boolean): string {
  if (!reliable) return "Hold still — we need a clearer view of your legs.";
  switch (phase) {
    case "sitting":
      return "Sit tall, feet flat. Stand up when ready.";
    case "rising":
      return "Push through your heels and stand tall.";
    case "standing":
      return "Stand tall, then sit with control.";
    case "lowering":
      return "Lower slowly until you are seated.";
    default:
      return "Find a sitting or standing start position.";
  }
}

function toDisplayPhase(
  confirmed: ConfirmedPhase,
  kneeDeg: number,
): SitStandPhase {
  if (confirmed === "sitting" && kneeDeg > SIT_DEG && kneeDeg < STAND_DEG)
    return "rising";
  if (confirmed === "standing" && kneeDeg < STAND_DEG && kneeDeg > SIT_DEG)
    return "lowering";
  return confirmed;
}

function normalizeFeatures(
  featuresOrAngle: SitStandFeatures | number,
  confidence?: number,
): SitStandFeatures {
  if (typeof featuresOrAngle === "number") {
    return { kneeDeg: featuresOrAngle, confidence: confidence ?? 0 };
  }
  return featuresOrAngle;
}

function ensureHold(
  hold: Partial<SitStandHold> & { count: number; candidate: string },
): SitStandHold {
  const defaults = createSitStandHold();
  hold.midZoneFrames ??= defaults.midZoneFrames;
  hold.attemptedRise ??= defaults.attemptedRise;
  hold.lastTrunkFlag ??= defaults.lastTrunkFlag;
  hold.lastAsymFlag ??= defaults.lastAsymFlag;
  hold.confirmed ??= defaults.confirmed;
  return hold as SitStandHold;
}

/**
 * Update sit-to-stand state.
 * Overloads:
 *   updateSitStand(state, kneeDeg, confidence, hold)
 *   updateSitStand(state, features, hold)
 */
export function updateSitStand(
  state: SitStandState,
  featuresOrAngle: SitStandFeatures | number,
  confidenceOrHold: number | SitStandHold,
  holdMaybe?: SitStandHold,
): SitStandState {
  const rawHold =
    typeof confidenceOrHold === "number"
      ? (holdMaybe ?? createSitStandHold())
      : confidenceOrHold;
  const holdRef = ensureHold(rawHold);
  const features = normalizeFeatures(
    featuresOrAngle,
    typeof confidenceOrHold === "number" ? confidenceOrHold : undefined,
  );

  const { kneeDeg, confidence } = features;
  const trunkOffset = features.trunkOffset ?? null;
  const kneeAsymmetry = features.kneeAsymmetry ?? null;

  const reliable = confidence >= MIN_CONFIDENCE && Number.isFinite(kneeDeg);
  if (!reliable) {
    return {
      ...state,
      lastAngle: kneeDeg,
      reliable: false,
      guidance: guidanceFor(state.phase, false),
    };
  }

  let confirmed = holdRef.confirmed;
  if (confirmed === "unknown") {
    if (state.phase === "sitting" || state.phase === "rising")
      confirmed = "sitting";
    else if (state.phase === "standing" || state.phase === "lowering")
      confirmed = "standing";
  }

  let incompleteAttempts = state.incompleteAttempts;
  let trunkLeanEvents = state.trunkLeanEvents;
  let kneeAsymmetryEvents = state.kneeAsymmetryEvents;

  const inMid = kneeDeg > SIT_DEG && kneeDeg < STAND_DEG;
  if (confirmed === "sitting" && inMid) {
    holdRef.midZoneFrames += 1;
    holdRef.attemptedRise = true;
  } else if (confirmed === "sitting" && kneeDeg <= SIT_DEG) {
    if (
      holdRef.attemptedRise &&
      holdRef.midZoneFrames >= MID_ZONE_FRAMES_FOR_INCOMPLETE
    ) {
      incompleteAttempts += 1;
    }
    holdRef.midZoneFrames = 0;
    holdRef.attemptedRise = false;
  } else if (confirmed === "standing" || kneeDeg >= STAND_DEG) {
    holdRef.midZoneFrames = 0;
    holdRef.attemptedRise = false;
  }

  const trunkFlag = trunkOffset != null && trunkOffset >= TRUNK_LEAN_THRESHOLD;
  if (
    trunkFlag &&
    !holdRef.lastTrunkFlag &&
    (confirmed === "standing" || (confirmed === "sitting" && inMid))
  ) {
    trunkLeanEvents += 1;
  }
  holdRef.lastTrunkFlag = trunkFlag;

  const asymFlag =
    kneeAsymmetry != null && kneeAsymmetry >= KNEE_ASYMMETRY_THRESHOLD;
  if (asymFlag && !holdRef.lastAsymFlag && inMid) {
    kneeAsymmetryEvents += 1;
  }
  holdRef.lastAsymFlag = asymFlag;

  let candidate: ConfirmedPhase = confirmed;
  if (kneeDeg >= STAND_DEG) candidate = "standing";
  else if (kneeDeg <= SIT_DEG) candidate = "sitting";
  else {
    const phase = toDisplayPhase(confirmed, kneeDeg);
    return {
      reps: state.reps,
      phase,
      lastAngle: kneeDeg,
      reliable: true,
      incompleteAttempts,
      trunkLeanEvents,
      kneeAsymmetryEvents,
      guidance: guidanceFor(phase, true),
    };
  }

  if (candidate === confirmed) {
    holdRef.count = 0;
    holdRef.candidate = candidate;
    const phase = toDisplayPhase(confirmed, kneeDeg);
    return {
      reps: state.reps,
      phase,
      lastAngle: kneeDeg,
      reliable: true,
      incompleteAttempts,
      trunkLeanEvents,
      kneeAsymmetryEvents,
      guidance: guidanceFor(phase, true),
    };
  }

  if (holdRef.candidate !== candidate) {
    holdRef.candidate = candidate;
    holdRef.count = 1;
    const phase = toDisplayPhase(confirmed, kneeDeg);
    return {
      reps: state.reps,
      phase,
      lastAngle: kneeDeg,
      reliable: true,
      incompleteAttempts,
      trunkLeanEvents,
      kneeAsymmetryEvents,
      guidance: guidanceFor(phase, true),
    };
  }

  holdRef.count += 1;
  if (holdRef.count < HOLD_FRAMES) {
    const phase = toDisplayPhase(confirmed, kneeDeg);
    return {
      reps: state.reps,
      phase,
      lastAngle: kneeDeg,
      reliable: true,
      incompleteAttempts,
      trunkLeanEvents,
      kneeAsymmetryEvents,
      guidance: guidanceFor(phase, true),
    };
  }

  holdRef.count = 0;
  let reps = state.reps;
  if (confirmed === "standing" && candidate === "sitting") {
    reps += 1;
  }
  holdRef.confirmed = candidate;

  return {
    reps,
    phase: candidate,
    lastAngle: kneeDeg,
    reliable: true,
    incompleteAttempts,
    trunkLeanEvents,
    kneeAsymmetryEvents,
    guidance: guidanceFor(candidate, true),
  };
}

export {
  MIN_CONFIDENCE,
  STAND_DEG,
  SIT_DEG,
  TRUNK_LEAN_THRESHOLD,
  KNEE_ASYMMETRY_THRESHOLD,
};
