import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  Canvas,
  Circle,
  Group,
  Line,
  Path,
  Skia,
  vec,
} from "@shopify/react-native-skia";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
  VisionCameraProxy,
} from "react-native-vision-camera";
import { useRunOnJS } from "react-native-worklets-core";

import {
  mapPoseToPortrait,
  POSE_CONNECTIONS,
  POSE_JOINTS,
  type MediaPipeLandmark,
  type ScreenLandmark,
} from "../lib/pose/connections";
import { hipAngle, kneeAngle, kneeAsymmetryDeg, pickSide, trackingConfidence, trunkLateralOffset } from "../lib/pose/landmarks";
import { NATIVE_POSE_ANDROID } from "../lib/pose/nativePose";
import {
  createSitStandHold,
  createSitStandState,
  updateSitStand,
} from "../lib/pose/sitToStand";
import type { PoseMetricsPayload } from "./PoseSkeletonCamera";
import { C } from "../theme";

const VIS_MIN = 0.35;
const SKELETON = "#d8ff58";
const GUIDE = "rgba(56, 189, 248, 0.55)";

type Props = {
  facing: "front" | "back";
  recipeKey?: string | null;
  style?: StyleProp<ViewStyle>;
  onReady?: () => void;
  onError?: (message: string) => void;
  onMetrics?: (metrics: PoseMetricsPayload) => void;
};

const posePlugin = VisionCameraProxy.initFrameProcessorPlugin("poseLandmarker", {});

function SkiaPoseLayer({
  layout,
  points,
  goniometer,
}: {
  layout: { w: number; h: number };
  points: ScreenLandmark[];
  goniometer?: { x: number; y: number };
}) {
  const { w, h } = layout;
  const guidePath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(w * 0.5, h * 0.06);
    p.lineTo(w * 0.5, h * 0.94);
    p.moveTo(w * 0.18, h * 0.2);
    p.lineTo(w * 0.82, h * 0.2);
    p.moveTo(w * 0.12, h * 0.88);
    p.lineTo(w * 0.88, h * 0.88);
    return p;
  }, [w, h]);

  if (w < 1 || h < 1) return null;

  const sx = (x: number) => x * w;
  const sy = (y: number) => y * h;

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path path={guidePath} color={GUIDE} style="stroke" strokeWidth={2} />
      <Group>
        {POSE_CONNECTIONS.map(([a, b], i) => {
          const pa = points[a];
          const pb = points[b];
          if (!pa || !pb || pa.visibility < VIS_MIN || pb.visibility < VIS_MIN) return null;
          return (
            <Line
              key={`s-${i}`}
              p1={vec(sx(pa.x), sy(pa.y))}
              p2={vec(sx(pb.x), sy(pb.y))}
              color={SKELETON}
              strokeWidth={4}
            />
          );
        })}
      </Group>
      <Group>
        {POSE_JOINTS.map((idx) => {
          const p = points[idx];
          if (!p || p.visibility < VIS_MIN) return null;
          return (
            <Circle
              key={`j-${idx}`}
              cx={sx(p.x)}
              cy={sy(p.y)}
              r={idx === 0 ? 6 : idx >= 11 && idx <= 28 ? 5.5 : 4}
              color="white"
            />
          );
        })}
      </Group>
      {goniometer ? (
        <Circle
          cx={sx(goniometer.x)}
          cy={sy(goniometer.y)}
          r={36}
          color="#fde047"
          style="stroke"
          strokeWidth={3}
        />
      ) : null}
    </Canvas>
  );
}

/**
 * Native Vision Camera + MediaPipe pose plugin + Skia skeleton overlay.
 * Requires dev client rebuilt with plugins/withMediaPipePose.js.
 */
export function NativePoseCamera({
  facing,
  recipeKey,
  style,
  onReady,
  onError,
  onMetrics,
}: Props) {
  const device = useCameraDevice(facing === "front" ? "front" : "back");
  const { hasPermission, requestPermission } = useCameraPermission();
  const [layout, setLayout] = useState({ w: 0, h: 0 });
  const [screenPoints, setScreenPoints] = useState<ScreenLandmark[]>([]);
  const [goniometer, setGoniometer] = useState<{ x: number; y: number } | undefined>();
  const [status, setStatus] = useState("Starting…");
  const [ready, setReady] = useState(false);

  const sitRef = useRef(createSitStandState());
  const holdRef = useRef(createSitStandHold());
  const countReps = recipeKey === "sit_to_stand";
  const android = NATIVE_POSE_ANDROID;

  useEffect(() => {
    if (!posePlugin) {
      onError?.("Native pose plugin missing — rebuild dev client with npm run prebuild");
    }
  }, [onError]);

  useEffect(() => {
    if (hasPermission) return;
    void requestPermission();
  }, [hasPermission, requestPermission]);

  const handleLandmarks = useCallback(
    (raw: MediaPipeLandmark[]) => {
      if (!raw || raw.length < 33) {
        setScreenPoints([]);
        setGoniometer(undefined);
        setStatus("Step into frame — align to guides");
        onMetrics?.({
          reps: sitRef.current.reps,
          confidence: 0,
          kneeAngle: 0,
          phase: sitRef.current.phase,
          reliable: false,
        });
        return;
      }

      const portrait = mapPoseToPortrait(raw, android);
      setScreenPoints(portrait);

      const side = pickSide(raw);
      const angle = kneeAngle(raw, side);
      const conf = trackingConfidence(raw, side);
      const kneeIdx = side === "left" ? 25 : 26;
      const kneePt = portrait[kneeIdx];
      if (kneePt && conf >= VIS_MIN) {
        setGoniometer({ x: kneePt.x, y: kneePt.y });
      } else {
        setGoniometer(undefined);
      }

      let reps = sitRef.current.reps;
      let phase = sitRef.current.phase;
      let reliable = conf >= 0.55;

      if (countReps) {
        sitRef.current = updateSitStand(
          sitRef.current,
          {
            kneeDeg: angle,
            confidence: conf,
            hipDeg: hipAngle(raw, side),
            trunkOffset: trunkLateralOffset(raw),
            kneeAsymmetry: kneeAsymmetryDeg(raw),
          },
          holdRef.current,
        );
        reps = sitRef.current.reps;
        phase = sitRef.current.phase;
        reliable = sitRef.current.reliable;
      }

      onMetrics?.({
        reps,
        confidence: Number(conf.toFixed(2)),
        kneeAngle: Number(angle.toFixed(1)),
        phase,
        reliable,
      });

      if (reliable) {
        setStatus(
          countReps
            ? `Reps ${reps} · ${phase} · ${Math.round(angle)}°`
            : `${Math.round(angle)}° knee · tracking OK`,
        );
      } else {
        setStatus("Low confidence — reposition using guides");
      }

      if (!ready) {
        setReady(true);
        onReady?.();
      }
    },
    [android, countReps, onMetrics, onReady, ready],
  );

  const onLandmarks = useRunOnJS(handleLandmarks, [handleLandmarks]);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";
      if (!posePlugin) return;
      const result = posePlugin.call(frame) as { pose?: MediaPipeLandmark[] } | MediaPipeLandmark[] | null;
      const pose = Array.isArray(result)
        ? result
        : result && Array.isArray(result.pose)
          ? result.pose
          : null;
      if (pose && pose.length >= 33) {
        onLandmarks(pose);
      }
    },
    [onLandmarks],
  );

  if (!posePlugin) {
    return (
      <View style={[styles.wrap, style, styles.center]}>
        <Text style={styles.errorText}>
          Native pose unavailable. Run prebuild and rebuild the dev client.
        </Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={[styles.wrap, style, styles.center]}>
        <ActivityIndicator color="#d8ff58" size="large" />
        <Text style={styles.loadingText}>Requesting camera…</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={[styles.wrap, style, styles.center]}>
        <Text style={styles.errorText}>No {facing} camera on this device.</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.wrap, style]}
      onLayout={(e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout;
        setLayout({ w: width, h: height });
      }}
    >
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        pixelFormat="rgb"
        frameProcessor={frameProcessor}
      />
      <SkiaPoseLayer layout={layout} points={screenPoints} goniometer={goniometer} />
      <View style={styles.statusChip} pointerEvents="none">
        <Text style={styles.statusText}>{status}</Text>
      </View>
      {!ready ? (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator color="#d8ff58" size="large" />
          <Text style={styles.loadingText}>Loading native pose…</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#0F172A", overflow: "hidden" },
  center: { alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    gap: 12,
  },
  loadingText: { color: C.surface, fontWeight: "600", fontSize: 14, textAlign: "center" },
  errorText: { color: "#fca5a5", fontWeight: "600", fontSize: 14, textAlign: "center" },
  statusChip: {
    position: "absolute",
    left: 12,
    top: 12,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    maxWidth: "88%",
  },
  statusText: { color: "#e2e8f0", fontWeight: "600", fontSize: 12 },
});
