/** BlazePose topology — matches MediaPipe PoseLandmarker / google-ai-edge samples. */
export const POSE_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10],
  [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
  [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32],
];

export const POSE_JOINTS = [
  0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
] as const;

export type MediaPipeLandmark = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};

export type ScreenLandmark = {
  x: number;
  y: number;
  visibility: number;
};

/** Portrait screen coords from raw MediaPipe sensor space (munishbp plugin README). */
export function mapLandmarkToPortrait(
  lm: MediaPipeLandmark,
  android: boolean,
): { x: number; y: number } {
  return {
    x: lm.y,
    y: android ? 1 - lm.x : lm.x,
  };
}

export function mapPoseToPortrait(
  landmarks: MediaPipeLandmark[],
  android: boolean,
): ScreenLandmark[] {
  return landmarks.map((lm) => {
    const { x, y } = mapLandmarkToPortrait(lm, android);
    return { x, y, visibility: lm.visibility ?? 0.5 };
  });
}
