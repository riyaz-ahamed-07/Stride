/** MediaPipe Pose Landmarker indices (33-point BlazePose). */
export const PoseIndex = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

export type Landmark = {
  x: number;
  y: number;
  z: number;
  visibility?: number;
};

/** Interior angle at point `b` formed by points a–b–c, in degrees. */
export function jointAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let degrees = Math.abs((radians * 180) / Math.PI);
  if (degrees > 180) degrees = 360 - degrees;
  return degrees;
}

export function visibilityOf(points: Landmark[]): number {
  if (!points.length) return 0;
  const sum = points.reduce((acc, p) => acc + (p.visibility ?? 0), 0);
  return sum / points.length;
}

/** Prefer the side with higher average visibility for sit-to-stand. */
export function pickSide(landmarks: Landmark[]): "left" | "right" {
  const left = visibilityOf([
    landmarks[PoseIndex.leftHip],
    landmarks[PoseIndex.leftKnee],
    landmarks[PoseIndex.leftAnkle],
  ]);
  const right = visibilityOf([
    landmarks[PoseIndex.rightHip],
    landmarks[PoseIndex.rightKnee],
    landmarks[PoseIndex.rightAnkle],
  ]);
  return left >= right ? "left" : "right";
}

export function kneeAngle(landmarks: Landmark[], side: "left" | "right"): number {
  if (side === "left") {
    return jointAngle(
      landmarks[PoseIndex.leftHip],
      landmarks[PoseIndex.leftKnee],
      landmarks[PoseIndex.leftAnkle],
    );
  }
  return jointAngle(
    landmarks[PoseIndex.rightHip],
    landmarks[PoseIndex.rightKnee],
    landmarks[PoseIndex.rightAnkle],
  );
}

export function hipAngle(landmarks: Landmark[], side: "left" | "right"): number {
  if (side === "left") {
    return jointAngle(
      landmarks[PoseIndex.leftShoulder],
      landmarks[PoseIndex.leftHip],
      landmarks[PoseIndex.leftKnee],
    );
  }
  return jointAngle(
    landmarks[PoseIndex.rightShoulder],
    landmarks[PoseIndex.rightHip],
    landmarks[PoseIndex.rightKnee],
  );
}

export function trackingConfidence(landmarks: Landmark[], side: "left" | "right"): number {
  if (side === "left") {
    return visibilityOf([
      landmarks[PoseIndex.leftHip],
      landmarks[PoseIndex.leftKnee],
      landmarks[PoseIndex.leftAnkle],
    ]);
  }
  return visibilityOf([
    landmarks[PoseIndex.rightHip],
    landmarks[PoseIndex.rightKnee],
    landmarks[PoseIndex.rightAnkle],
  ]);
}

/**
 * Lateral trunk offset in normalized image space (|mid-shoulder.x − mid-hip.x|).
 * Rule-based cue only — not a clinical lean diagnosis.
 */
export function trunkLateralOffset(landmarks: Landmark[]): number | null {
  const ls = landmarks[PoseIndex.leftShoulder];
  const rs = landmarks[PoseIndex.rightShoulder];
  const lh = landmarks[PoseIndex.leftHip];
  const rh = landmarks[PoseIndex.rightHip];
  if (!ls || !rs || !lh || !rh) return null;
  const conf = visibilityOf([ls, rs, lh, rh]);
  if (conf < 0.4) return null;
  const midShoulderX = (ls.x + rs.x) / 2;
  const midHipX = (lh.x + rh.x) / 2;
  return Math.abs(midShoulderX - midHipX);
}

/** Absolute difference between left and right knee angles when both sides are visible. */
export function kneeAsymmetryDeg(landmarks: Landmark[]): number | null {
  const leftConf = trackingConfidence(landmarks, "left");
  const rightConf = trackingConfidence(landmarks, "right");
  if (leftConf < 0.45 || rightConf < 0.45) return null;
  return Math.abs(kneeAngle(landmarks, "left") - kneeAngle(landmarks, "right"));
}

/** Skeleton segments — full BlazePose 33-landmark topology. */
export const POSE_CONNECTIONS: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 7],
  [0, 4],
  [4, 5],
  [5, 6],
  [6, 8],
  [9, 10],
  [11, 12],
  [11, 13],
  [13, 15],
  [15, 17],
  [15, 19],
  [15, 21],
  [17, 19],
  [12, 14],
  [14, 16],
  [16, 18],
  [16, 20],
  [16, 22],
  [18, 20],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [24, 26],
  [25, 27],
  [26, 28],
  [27, 29],
  [28, 30],
  [29, 31],
  [30, 32],
  [27, 31],
  [28, 32],
];

/** Joints drawn as visible markers (torso + limbs + extremities). */
export const POSE_JOINTS = [
  0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
] as const;

/** @deprecated use POSE_CONNECTIONS — kept for older imports */
export const FULL_POSE_CONNECTIONS = POSE_CONNECTIONS;
