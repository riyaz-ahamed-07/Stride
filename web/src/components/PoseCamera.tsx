"use client";

import { useEffect, useRef, useState } from "react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { drawSkeleton } from "@/lib/pose/drawSkeleton";
import {
  hipAngle,
  kneeAngle,
  kneeAsymmetryDeg,
  pickSide,
  trackingConfidence,
  trunkLateralOffset,
  type Landmark,
} from "@/lib/pose/landmarks";
import {
  createSitStandHold,
  createSitStandState,
  type SitStandPhase,
  type SitStandState,
  updateSitStand,
} from "@/lib/pose/sitToStand";
import {
  cameraStatusLabel,
  classifyCameraError,
  type CameraTrackingStatus,
} from "@/lib/pose/cameraStatus";
import { sitStandObservations, type ObservationDraft } from "@/lib/pose/observations";

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
const FULL_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";
const LITE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export type PoseMetrics = {
  reps: number;
  confidence: number;
  kneeAngle: number;
  hipAngle: number | null;
  phase: SitStandPhase;
  reliable: boolean;
  source: "camera";
  guidance: string;
  incompleteAttempts: number;
  trunkLeanEvents: number;
  kneeAsymmetryEvents: number;
  personCount: number;
  cameraStatus: CameraTrackingStatus;
  observations: ObservationDraft[];
};

type Props = {
  enabled: boolean;
  onMetrics: (metrics: PoseMetrics) => void;
  facingMode?: "user" | "environment";
  embed?: boolean;
  targetReps?: number;
  onStatus?: (status: string) => void;
  onCameraStatus?: (status: CameraTrackingStatus) => void;
  onError?: (message: string) => void;
};

function emptyMetrics(partial?: Partial<PoseMetrics>): PoseMetrics {
  return {
    reps: 0,
    confidence: 0,
    kneeAngle: 0,
    hipAngle: null,
    phase: "unknown",
    reliable: false,
    source: "camera",
    guidance: "Step into frame so your hips and knees are visible.",
    incompleteAttempts: 0,
    trunkLeanEvents: 0,
    kneeAsymmetryEvents: 0,
    personCount: 0,
    cameraStatus: "idle",
    observations: [],
    ...partial,
  };
}

export function PoseCamera({
  enabled,
  onMetrics,
  facingMode = "user",
  embed = false,
  targetReps = 0,
  onStatus,
  onCameraStatus,
  onError,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const sitRef = useRef(createSitStandState());
  const holdRef = useRef(createSitStandHold());
  const lastTsRef = useRef(-1);
  const statusRef = useRef<CameraTrackingStatus>("idle");
  const onMetricsRef = useRef(onMetrics);
  const targetRef = useRef(targetReps);

  const [status, setStatus] = useState<CameraTrackingStatus>("idle");
  const [error, setError] = useState("");

  onMetricsRef.current = onMetrics;
  targetRef.current = targetReps;

  function publishStatus(next: CameraTrackingStatus) {
    if (statusRef.current === next) return;
    statusRef.current = next;
    setStatus(next);
    onStatus?.(cameraStatusLabel(next));
    onCameraStatus?.(next);
  }

  useEffect(() => {
    if (!enabled) {
      stopCamera();
      publishStatus("stopped");
      return;
    }

    let cancelled = false;

    async function start() {
      setError("");
      publishStatus("loading");
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM);
        if (cancelled) return;

        async function loadLandmarker(modelPath: string, delegate: "GPU" | "CPU") {
          return PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: modelPath, delegate },
            runningMode: "VIDEO",
            numPoses: 2,
            minPoseDetectionConfidence: 0.55,
            minPosePresenceConfidence: 0.55,
            minTrackingConfidence: 0.55,
          });
        }

        try {
          landmarkerRef.current = await loadLandmarker(FULL_MODEL, "GPU");
        } catch {
          try {
            landmarkerRef.current = await loadLandmarker(FULL_MODEL, "CPU");
          } catch {
            landmarkerRef.current = await loadLandmarker(LITE_MODEL, "CPU");
          }
        }

        publishStatus("requesting");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        sitRef.current = createSitStandState();
        holdRef.current = createSitStandHold();
        publishStatus("tracking");
        loop();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Camera or pose model failed.";
        const classified = classifyCameraError(err);
        setError(message);
        onError?.(message);
        publishStatus(classified);
      }
    }

    function emitFromState(
      state: SitStandState,
      conf: number,
      angle: number,
      hip: number | null,
      personCount: number,
      cameraStatus: CameraTrackingStatus,
    ) {
      onMetricsRef.current(
        emptyMetrics({
          reps: state.reps,
          confidence: Number(conf.toFixed(2)),
          kneeAngle: Number(angle.toFixed(1)),
          hipAngle: hip == null ? null : Number(hip.toFixed(1)),
          phase: state.phase,
          reliable: state.reliable,
          guidance: state.guidance,
          incompleteAttempts: state.incompleteAttempts,
          trunkLeanEvents: state.trunkLeanEvents,
          kneeAsymmetryEvents: state.kneeAsymmetryEvents,
          personCount,
          cameraStatus,
          observations: sitStandObservations(state, conf),
        }),
      );
    }

    function loop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;
      if (!video || !canvas || !landmarker || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
      }

      const now = performance.now();
      if (now > lastTsRef.current) {
        const result = landmarker.detectForVideo(video, now);
        lastTsRef.current = now;
        const poseCount = result.landmarks?.length ?? 0;
        const landmarks = (result.landmarks?.[0] ?? []) as Landmark[];
        const ctx = canvas.getContext("2d");
        const target = targetRef.current;
        const progress =
          target > 0 ? Math.min(1, sitRef.current.reps / target) : undefined;

        if (poseCount > 1) {
          publishStatus("multi_person");
          if (ctx) {
            drawSkeleton(ctx, landmarks, canvas.width, canvas.height, true, {
              phase: sitRef.current.phase,
              progress,
              cue: "Only one person should be in frame",
              showReference: true,
            });
          }
          emitFromState(sitRef.current, 0, sitRef.current.lastAngle, null, poseCount, "multi_person");
        } else if (!landmarks.length) {
          publishStatus("no_person");
          if (ctx) {
            drawSkeleton(ctx, [], canvas.width, canvas.height, true, {
              phase: sitRef.current.phase,
              progress,
              cue: "No person detected",
              showReference: true,
            });
          }
          emitFromState(sitRef.current, 0, 0, null, 0, "no_person");
        } else {
          const side = pickSide(landmarks);
          const angle = kneeAngle(landmarks, side);
          const hip = hipAngle(landmarks, side);
          const conf = trackingConfidence(landmarks, side);
          sitRef.current = updateSitStand(
            sitRef.current,
            {
              kneeDeg: angle,
              confidence: conf,
              hipDeg: hip,
              trunkOffset: trunkLateralOffset(landmarks),
              kneeAsymmetry: kneeAsymmetryDeg(landmarks),
            },
            holdRef.current,
          );
          const cameraStatus: CameraTrackingStatus = sitRef.current.reliable
            ? "tracking"
            : "low_confidence";
          publishStatus(cameraStatus);

          if (ctx) {
            drawSkeleton(ctx, landmarks, canvas.width, canvas.height, true, {
              phase: sitRef.current.phase,
              progress,
              cue: sitRef.current.guidance,
              showReference: true,
            });
          }
          emitFromState(sitRef.current, conf, angle, hip, 1, cameraStatus);
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    start();

    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, facingMode]);

  function stopCamera() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    lastTsRef.current = -1;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  return (
    <div className={`pose-panel${embed ? " pose-panel-embed" : ""}`}>
      <div className={`pose-stage${embed ? " pose-stage-embed" : ""}`}>
        <video ref={videoRef} className="pose-video" playsInline muted />
        <canvas ref={canvasRef} className="pose-canvas" />
      </div>
      {!embed ? (
        <div className="pose-status">
          <span
            className={`badge ${
              status === "permission_denied" || status === "unavailable" || status === "multi_person"
                ? "badge-danger"
                : status === "no_person" || status === "low_confidence"
                  ? "badge-warning"
                  : "badge-success"
            }`}
          >
            {cameraStatusLabel(status)}
          </span>
          {error ? <p className="error">{error}</p> : null}
          <p className="pose-hint">
            Pose runs on this device only. Raw video is not uploaded. Counting pauses when tracking is
            unclear.
          </p>
        </div>
      ) : null}
    </div>
  );
}
