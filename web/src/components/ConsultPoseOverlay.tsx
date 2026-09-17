"use client";

import { useEffect, useRef, useState } from "react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { drawSkeleton } from "@/lib/pose/drawSkeleton";
import type { Landmark } from "@/lib/pose/landmarks";

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
const LITE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

type Props = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  /** Front-camera self-view is usually mirrored; remote patient feed is not. */
  mirrored?: boolean;
};

/**
 * Draws a MediaPipe skeleton on top of an existing LiveKit patient video.
 * Overlay is local-only — it is not burned into the published track.
 */
export function ConsultPoseOverlay({
  videoRef,
  enabled,
  mirrored = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef(0);
  const lastTsRef = useRef(-1);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      return;
    }

    let cancelled = false;
    let landmarker: PoseLandmarker | null = null;

    async function boot() {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM);
        landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: LITE_MODEL,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.45,
          minPosePresenceConfidence: 0.45,
          minTrackingConfidence: 0.45,
        });
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setReady(true);
        setFailed(false);
      } catch {
        if (!cancelled) {
          setFailed(true);
          setReady(false);
        }
      }
    }

    void boot();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      setReady(false);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !ready) return;

    let alive = true;

    function loop() {
      if (!alive) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;

      if (
        video &&
        canvas &&
        landmarker &&
        video.readyState >= 2 &&
        video.videoWidth > 0
      ) {
        if (
          canvas.width !== video.videoWidth ||
          canvas.height !== video.videoHeight
        ) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        const now = performance.now();
        if (now > lastTsRef.current) {
          try {
            const result = landmarker.detectForVideo(video, now);
            lastTsRef.current = now;
            const landmarks = (result.landmarks?.[0] ?? []) as Landmark[];
            const ctx = canvas.getContext("2d");
            if (ctx) {
              drawSkeleton(
                ctx,
                landmarks,
                canvas.width,
                canvas.height,
                mirrored,
                {
                  showReference: false,
                  showGuides: false,
                  showBadge: false,
                  showGoniometer: false,
                },
              );
            }
          } catch {
            /* skip bad frames */
          }
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [enabled, ready, mirrored, videoRef]);

  if (!enabled) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="consult-pose-canvas"
        aria-hidden
      />
      {failed ? (
        <p className="consult-pose-status">Pose overlay unavailable</p>
      ) : !ready ? (
        <p className="consult-pose-status">Loading skeleton…</p>
      ) : null}
    </>
  );
}
