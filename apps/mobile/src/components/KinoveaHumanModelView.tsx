import { StyleSheet, View } from "react-native";

import {
  KINOVEA_HUMAN_SEGMENTS,
  KINOVEA_MODEL_BOUNDS,
  type KinoveaPoint,
} from "../lib/kinovea/humanModel";

type Props = {
  points: KinoveaPoint[];
  width: number;
  height: number;
};

function Segment({
  x1,
  y1,
  x2,
  y2,
  color,
  thickness,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  thickness: number;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 1) return null;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  return (
    <View
      style={{
        position: "absolute",
        left: x1,
        top: y1 - thickness / 2,
        width: length,
        height: thickness,
        backgroundColor: color,
        borderRadius: thickness / 2,
        transform: [{ rotate: `${angle}deg` }],
      }}
    />
  );
}

function JointDot({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <View
      style={{
        position: "absolute",
        left: x - 3,
        top: y - 3,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: color,
        borderWidth: 1,
        borderColor: "rgba(15, 23, 42, 0.35)",
      }}
    />
  );
}

/** Renders Kinovea human-model segments in a fixed viewport (demo / form guide only). */
export function KinoveaHumanModelView({ points, width, height }: Props) {
  const { minX, maxX, minY, maxY } = KINOVEA_MODEL_BOUNDS;
  const norm = points.map((p) => ({
    ...p,
    nx: ((p.x - minX) / (maxX - minX)) * width,
    ny: ((p.y - minY) / (maxY - minY)) * height,
  }));

  return (
    <View style={[styles.stage, { width, height }]}>
      {KINOVEA_HUMAN_SEGMENTS.map((seg) => {
        const a = norm[seg.point1];
        const b = norm[seg.point2];
        if (!a || !b) return null;
        return (
          <Segment
            key={seg.name}
            x1={a.nx}
            y1={a.ny}
            x2={b.nx}
            y2={b.ny}
            color={seg.color}
            thickness={seg.width}
          />
        );
      })}
      {norm.map((p) => (
        <JointDot key={p.name} x={p.nx} y={p.ny} color={p.color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    position: "relative",
    alignSelf: "center",
  },
});
