import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { Camera } from "expo-camera";
import { endConsultation, joinConsultation } from "../api";
import { buildConsultationHtml } from "../lib/consultationRoomHtml";
import type { Appointment, ConsultationJoin } from "../types";

type Props = {
  appointmentId: string;
  accessToken: string;
  appointment: Appointment | null;
  role?: string;
  onLeave: () => void;
};

export function ConsultScreen({
  appointmentId,
  accessToken,
  appointment,
  role = "patient",
  onLeave,
}: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [join, setJoin] = useState<ConsultationJoin | null>(null);
  const [loadError, setLoadError] = useState("");
  const [cameraDenied, setCameraDenied] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [ready, setReady] = useState(false);
  const webRef = useRef<WebView>(null);

  const start = useCallback(async () => {
    setReady(false);
    setLoadError("");
    try {
      const cam = await Camera.requestCameraPermissionsAsync();
      const mic = await Camera.requestMicrophonePermissionsAsync();
      setCameraDenied(cam.status !== "granted");
      setMicDenied(mic.status !== "granted");
      if (cam.status !== "granted" || mic.status !== "granted") {
        throw new Error(
          "Camera and microphone are required for video visits. Open Settings → Apps → Stride → Permissions, enable both, then try again.",
        );
      }
      const payload = await joinConsultation(accessToken, appointmentId);
      setJoin(payload);
      setHtml(buildConsultationHtml(payload));
    } catch (err) {
      setJoin(null);
      setHtml(null);
      setLoadError(
        err instanceof Error
          ? err.message
          : "Could not start the consultation.",
      );
    } finally {
      setReady(true);
    }
  }, [accessToken, appointmentId]);

  useEffect(() => {
    void start();
  }, [start]);

  const hangUpAndLeave = useCallback(() => {
    webRef.current?.injectJavaScript(`
      try { if (window.__strideHangUp) window.__strideHangUp(); } catch (e) {}
      true;
    `);
    setTimeout(() => onLeave(), 200);
  }, [onLeave]);

  async function onWebMessage(raw: string) {
    try {
      const msg = JSON.parse(raw) as { type?: string; message?: string };
      if (msg.type === "end" || msg.type === "ended") {
        hangUpAndLeave();
        return;
      }
      if (msg.type === "need-token") {
        const payload = await joinConsultation(accessToken, appointmentId);
        const encoded = JSON.stringify({
          url: payload.livekit_url,
          token: payload.token,
          tokenExpiresAt: payload.token_expires_at,
        });
        webRef.current?.injectJavaScript(`
          try { if (window.__strideRefresh) window.__strideRefresh(${encoded}); } catch (e) {}
          true;
        `);
        return;
      }
      if (msg.type === "permission-camera") setCameraDenied(true);
      if (msg.type === "permission-mic") setMicDenied(true);
      if (msg.type === "failed") {
        setLoadError(
          msg.message || "Could not connect to the consultation room.",
        );
      }
    } catch {
      if (raw === "end") hangUpAndLeave();
    }
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#93C5FD" size="large" />
        <Text style={styles.loadingText}>
          Opening your rehabilitation consultation…
        </Text>
      </View>
    );
  }

  if (loadError || !html || !join) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Could not join</Text>
        <Text style={styles.errorBody}>
          {loadError || "This consultation is not available."}
        </Text>
        {appointment?.reason ? (
          <Text style={styles.meta}>{appointment.reason}</Text>
        ) : null}
        {cameraDenied ? (
          <Text style={styles.meta}>Camera permission was denied.</Text>
        ) : null}
        {micDenied ? (
          <Text style={styles.meta}>Microphone permission was denied.</Text>
        ) : null}
        <Pressable style={styles.btn} onPress={() => void start()}>
          <Text style={styles.btnText}>Try again</Text>
        </Pressable>
        <Pressable style={styles.btnGhost} onPress={onLeave}>
          <Text style={styles.btnGhostText}>Close</Text>
        </Pressable>
      </View>
    );
  }

  const peerName =
    role === "patient"
      ? join.consultation.therapist.full_name
      : join.consultation.patient.full_name;

  return (
    <View style={styles.fill}>
      <View style={styles.topBar}>
        <View style={styles.topCopy}>
          <Text style={styles.topTitle} numberOfLines={1}>
            Rehabilitation consultation
          </Text>
          <Text style={styles.topMeta} numberOfLines={1}>
            {peerName}
            {join.consultation.reason ? ` · ${join.consultation.reason}` : ""}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            if (role !== "patient") {
              void endConsultation(accessToken, appointmentId).catch(
                () => undefined,
              );
            }
            hangUpAndLeave();
          }}
          hitSlop={8}
        >
          <Text style={styles.closeBtn}>
            {role === "patient" ? "Leave" : "End"}
          </Text>
        </Pressable>
      </View>
      {cameraDenied || micDenied ? (
        <View style={styles.warn}>
          {cameraDenied ? (
            <Text style={styles.warnText}>Camera permission was denied.</Text>
          ) : null}
          {micDenied ? (
            <Text style={styles.warnText}>
              Microphone permission was denied.
            </Text>
          ) : null}
        </View>
      ) : null}
      <WebView
        ref={webRef}
        source={{ html, baseUrl: "https://localhost/" }}
        style={styles.fill}
        originWhitelist={["*"]}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        mediaCapturePermissionGrantType="grant"
        allowsFullscreenVideo
        onMessage={(event) => void onWebMessage(event.nativeEvent.data)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#0F172A" },
  center: {
    flex: 1,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  loadingText: {
    color: "#94A3B8",
    marginTop: 12,
    fontSize: 16,
    textAlign: "center",
  },
  errorTitle: { color: "white", fontSize: 22, fontWeight: "800" },
  errorBody: {
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 22,
    fontSize: 16,
  },
  meta: { color: "rgba(255,255,255,0.5)", fontSize: 14, textAlign: "center" },
  btn: {
    marginTop: 12,
    minHeight: 48,
    paddingHorizontal: 28,
    borderRadius: 999,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "white", fontWeight: "700", fontSize: 16 },
  btnGhost: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  btnGhostText: { color: "#93C5FD", fontWeight: "700", fontSize: 16 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#1E293B",
    gap: 12,
  },
  topCopy: { flex: 1 },
  topTitle: { color: "white", fontWeight: "700", fontSize: 16 },
  topMeta: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 2 },
  closeBtn: {
    color: "#FCA5A5",
    fontWeight: "800",
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  warn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#7f1d1d",
  },
  warnText: { color: "#fecaca", fontSize: 14 },
});
