/**
 * Kinovea "Human model" custom tool — standing reference pose.
 * @see human-model.source.xml (upstream Kinovea/Kinovea)
 */

export type KinoveaPoint = { name: string; x: number; y: number; color: string };
export type KinoveaSegment = {
  name: string;
  point1: number;
  point2: number;
  color: string;
  width: number;
};

/** Raw canvas coordinates from Kinovea tool (≈370×600). */
export const KINOVEA_MODEL_BOUNDS = { minX: 115, maxX: 255, minY: 80, maxY: 535 };

export const KINOVEA_HUMAN_POINTS: KinoveaPoint[] = [
  { name: "Vertex", x: 185, y: 80, color: "#dc322f" },
  { name: "Chin", x: 185, y: 140, color: "#dc322f" },
  { name: "Left shoulder", x: 225, y: 170, color: "#cb4b16" },
  { name: "Left elbow", x: 230, y: 250, color: "#cb4b16" },
  { name: "Left wrist", x: 240, y: 310, color: "#cb4b16" },
  { name: "Left hand", x: 255, y: 315, color: "#cb4b16" },
  { name: "Left hip", x: 210, y: 300, color: "#6c71c4" },
  { name: "Left knee", x: 210, y: 415, color: "#6c71c4" },
  { name: "Left ankle", x: 210, y: 515, color: "#6c71c4" },
  { name: "Left foot", x: 240, y: 535, color: "#6c71c4" },
  { name: "Left heel", x: 205, y: 530, color: "#6c71c4" },
  { name: "Right shoulder", x: 145, y: 170, color: "#b58900" },
  { name: "Right elbow", x: 140, y: 250, color: "#b58900" },
  { name: "Right wrist", x: 130, y: 310, color: "#b58900" },
  { name: "Right hand", x: 115, y: 315, color: "#b58900" },
  { name: "Right hip", x: 160, y: 300, color: "#d33682" },
  { name: "Right knee", x: 160, y: 415, color: "#d33682" },
  { name: "Right ankle", x: 160, y: 515, color: "#d33682" },
  { name: "Right foot", x: 130, y: 535, color: "#d33682" },
  { name: "Right heel", x: 165, y: 530, color: "#d33682" },
];

export const KINOVEA_HUMAN_SEGMENTS: KinoveaSegment[] = [
  { name: "Head", point1: 0, point2: 1, color: "#dc322f", width: 2 },
  { name: "Left arm", point1: 2, point2: 3, color: "#cb4b16", width: 2 },
  { name: "Left forearm", point1: 3, point2: 4, color: "#cb4b16", width: 2 },
  { name: "Left hand", point1: 4, point2: 5, color: "#cb4b16", width: 2 },
  { name: "Left trunk", point1: 2, point2: 6, color: "#268bd2", width: 2 },
  { name: "Left thigh", point1: 6, point2: 7, color: "#6c71c4", width: 2 },
  { name: "Left leg", point1: 7, point2: 8, color: "#6c71c4", width: 2 },
  { name: "Left foot1", point1: 8, point2: 9, color: "#6c71c4", width: 2 },
  { name: "Left foot2", point1: 9, point2: 10, color: "#6c71c4", width: 2 },
  { name: "Left foot3", point1: 10, point2: 8, color: "#6c71c4", width: 4 },
  { name: "Top trunk", point1: 2, point2: 11, color: "#268bd2", width: 2 },
  { name: "Right arm", point1: 11, point2: 12, color: "#b58900", width: 2 },
  { name: "Right forearm", point1: 12, point2: 13, color: "#b58900", width: 2 },
  { name: "Right hand", point1: 13, point2: 14, color: "#b58900", width: 2 },
  { name: "Right trunk", point1: 11, point2: 15, color: "#268bd2", width: 2 },
  { name: "Right thigh", point1: 15, point2: 16, color: "#d33682", width: 2 },
  { name: "Right leg", point1: 16, point2: 17, color: "#d33682", width: 2 },
  { name: "Right foot1", point1: 17, point2: 18, color: "#d33682", width: 2 },
  { name: "Right foot2", point1: 18, point2: 19, color: "#d33682", width: 2 },
  { name: "Right foot3", point1: 19, point2: 17, color: "#d33682", width: 4 },
  { name: "Bottom trunk", point1: 15, point2: 6, color: "#268bd2", width: 2 },
];

export function normalizeKinoveaPoint(
  p: KinoveaPoint,
  width: number,
  height: number,
): { x: number; y: number } {
  const { minX, maxX, minY, maxY } = KINOVEA_MODEL_BOUNDS;
  return {
    x: ((p.x - minX) / (maxX - minX)) * width,
    y: ((p.y - minY) / (maxY - minY)) * height,
  };
}
