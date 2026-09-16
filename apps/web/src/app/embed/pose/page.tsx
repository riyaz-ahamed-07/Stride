"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PoseMetrics } from "@/components/PoseCamera";

const PoseCamera = dynamic(
  () => import("@/components/PoseCamera").then((m) => m.PoseCamera),
  { ssr: false },
);

function postToApp(payload: Record<string, unknown>) {
  try {
    const w = window as Window & { ReactNativeWebView?: { postMessage: (s: string) => void } };
    w.ReactNativeWebView?.postMessage(JSON.stringify(payload));
  } catch {
    /* not in WebView */
  }
}

function EmbedPoseInner() {
  const searchParams = useSearchParams();
  const facing = searchParams.get("facing") === "environment" ? "environment" : "user";
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(true);
    postToApp({ type: "status", text: "Starting camera…" });
  }, []);

  function onMetrics(metrics: PoseMetrics) {
    postToApp({
      type: "metrics",
      reps: metrics.reps,
      phase: metrics.phase,
      confidence: metrics.confidence,
      cameraStatus: metrics.cameraStatus,
      guidance: metrics.guidance,
    });
  }

  return (
    <div className="embed-pose-page" data-facing={facing}>
      <PoseCamera
        enabled={enabled}
        embed
        facingMode={facing}
        onMetrics={onMetrics}
        onStatus={(text) => {
          postToApp({ type: "status", text });
          if (text.startsWith("Tracking")) {
            postToApp({ type: "ready" });
          }
        }}
        onError={(message) => postToApp({ type: "error", message })}
      />
    </div>
  );
}

/** Full-screen pose camera for mobile WebView embed (skeleton overlay). */
export default function EmbedPosePage() {
  return (
    <Suspense fallback={<div className="embed-pose-page" style={{ background: "#0f172a" }} />}>
      <EmbedPoseInner />
    </Suspense>
  );
}
