import type { MediaPipeLandmark } from "./connections";

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

export function visibilityOf(points: MediaPipeLandmark[]): number {
  if (!points.length) return 0;
  return points.reduce((acc, p) => acc + (p.visibility ?? 0), 0) / points.length;
}

export function pickSide(landmarks: MediaPipeLandmark[]): "left" | "right" {
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

function jointAngle(a: MediaPipeLandmark, b: MediaPipeLandmark, c: MediaPipeLandmark): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let degrees = Math.abs((radians * 180) / Math.PI);
  if (degrees > 180) degrees = 360 - degrees;
  return degrees;
}

export function kneeAngle(landmarks: MediaPipeLandmark[], side: "left" | "right"): number {
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

export function hipAngle(landmarks: MediaPipeLandmark[], side: "left" | "right"): number {
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

export function trackingConfidence(
  landmarks: MediaPipeLandmark[],
  side: "left" | "right",
): number {
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

export function trunkLateralOffset(landmarks: MediaPipeLandmark[]): number | null {
  const ls = landmarks[PoseIndex.leftShoulder];
  const rs = landmarks[PoseIndex.rightShoulder];
  const lh = landmarks[PoseIndex.leftHip];
  const rh = landmarks[PoseIndex.rightHip];
  if (!ls || !rs || !lh || !rh) return null;
  const conf = visibilityOf([ls, rs, lh, rh]);
  if (conf < 0.4) return null;
  return Math.abs((ls.x + rs.x) / 2 - (lh.x + rh.x) / 2);
}

export function kneeAsymmetryDeg(landmarks: MediaPipeLandmark[]): number | null {
  const leftConf = trackingConfidence(landmarks, "left");
  const rightConf = trackingConfidence(landmarks, "right");
  if (leftConf < 0.45 || rightConf < 0.45) return null;
  return Math.abs(kneeAngle(landmarks, "left") - kneeAngle(landmarks, "right"));
}
