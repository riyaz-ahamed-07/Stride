import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { Camera } from "expo-camera";
import {
  buildPoseSkeletonHtml,
  type PoseMetricsPayload,
} from "../lib/poseSkeletonHtml";
import { C } from "../theme";

export type { PoseMetricsPayload };

type Props = {
  facing: "front" | "back";
  recipeKey?: string | null;
  style?: StyleProp<ViewStyle>;
  onReady?: () => void;
  onError?: (message: string) => void;
  onMetrics?: (metrics: PoseMetricsPayload) => void;
};

/**
 * Live camera + BlazePose skeleton (Kinovea-style alignment guides + goniometer on canvas).
 * Separate from DemoFigurePanel reference model in the corner.
 */
export function PoseSkeletonCamera({
  facing,
  recipeKey,
  style,
  onReady,
  onError,
  onMetrics,
}: Props) {
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [overlayError, setOverlayError] = useState("");
  const [permReady, setPermReady] = useState(false);

  const html = useMemo(
    () => buildPoseSkeletonHtml(facing, { recipeKey }),
    [facing, recipeKey],
  );

  useEffect(() => {
    let cancelled = false;
    async function ensurePermission() {
      try {
        const cam = await Camera.requestCameraPermissionsAsync();
        if (cancelled) return;
        if (!cam.granted) {
          const msg = "Camera permission is required for live pose overlay.";
          setOverlayError(msg);
          setLoading(false);
          onError?.(msg);
          return;
        }
        setPermReady(true);
      } catch {
        if (!cancelled) setPermReady(true);
      }
    }
    void ensurePermission();
    return () => {
      cancelled = true;
    };
  }, [onError]);

  useEffect(() => {
    setLoading(true);
    setOverlayError("");
  }, [facing, html]);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        message?: string;
        reps?: number;
        confidence?: number;
        kneeAngle?: number;
        phase?: string;
        reliable?: boolean;
      };
      if (msg.type === "ready") {
        setLoading(false);
        setOverlayError("");
        onReady?.();
      }
      if (msg.type === "error" && msg.message) {
        setLoading(false);
        setOverlayError(msg.message);
        onError?.(msg.message);
      }
      if (msg.type === "metrics") {
        onMetrics?.({
          reps: msg.reps ?? 0,
          confidence: msg.confidence ?? 0,
          kneeAngle: msg.kneeAngle ?? 0,
          phase: msg.phase ?? "unknown",
          reliable: Boolean(msg.reliable),
        });
      }
    } catch {
      /* ignore */
    }
  }

  function stopOverlay() {
    webRef.current?.injectJavaScript(`
      try { if (window.__strideStopPose) window.__strideStopPose(); } catch (e) {}
      true;
    `);
  }

  useEffect(() => () => stopOverlay(), []);

  if (!permReady) {
    return (
      <View style={[styles.wrap, style]}>
        <View style={styles.loading}>
          <ActivityIndicator color="#d8ff58" size="large" />
          <Text style={styles.loadingText}>Requesting camera…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, style]}>
      <WebView
        key={`${facing}-${recipeKey ?? "none"}`}
        ref={webRef}
        source={{ html, baseUrl: "https://localhost/" }}
        style={styles.web}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        mixedContentMode="always"
        allowsFullscreenVideo
        mediaCapturePermissionGrantType="grant"
        onMessage={handleMessage}
        onContentProcessDidTerminate={() => webRef.current?.reload()}
        {...(Platform.OS === "android" ? { androidLayerType: "hardware" as const } : {})}
      />
      {loading ? (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator color="#d8ff58" size="large" />
          <Text style={styles.loadingText}>Loading camera, guides & pose model…</Text>
        </View>
      ) : null}
      {overlayError ? (
        <View style={styles.errorBanner} pointerEvents="none">
          <Text style={styles.errorText}>{overlayError}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#0F172A", overflow: "hidden" },
  web: { flex: 1, backgroundColor: "#0F172A" },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    gap: 12,
  },
  loadingText: {
    color: C.surface,
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  errorBanner: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "rgba(239, 68, 68, 0.9)",
    borderRadius: 12,
    padding: 10,
  },
  errorText: { color: "white", fontWeight: "600", fontSize: 13, textAlign: "center" },
});
