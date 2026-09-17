import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { Camera, CameraView } from "expo-camera";
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

type Phase = "loading" | "lobby" | "live" | "failed";

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function ConsultScreen({
  appointmentId,
  accessToken,
  appointment,
  role = "patient",
  onLeave,
}: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [html, setHtml] = useState<string | null>(null);
  const [join, setJoin] = useState<ConsultationJoin | null>(null);
  const [loadError, setLoadError] = useState("");
  const [cameraDenied, setCameraDenied] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const webRef = useRef<WebView>(null);

  const peerLabel = useMemo(() => {
    if (!join) return "";
    if (join.role === "patient") {
      const t = join.consultation.therapist;
      return [t.full_name, t.clinic_name].filter(Boolean).join(" · ");
    }
    return (
      join.consultation.patient.full_name ||
      join.consultation.reason ||
      "Patient"
    );
  }, [join]);

  const selfName = join?.display_name || "You";

  const prepareLobby = useCallback(async () => {
    setPhase("loading");
    setLoadError("");
    setHtml(null);
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
      setCameraOn(true);
      setMicOn(true);
      setPhase("lobby");
    } catch (err) {
      setJoin(null);
      setPhase("failed");
      setLoadError(
        err instanceof Error
          ? err.message
          : "Could not start the consultation.",
      );
    }
  }, [accessToken, appointmentId]);

  useEffect(() => {
    void prepareLobby();
  }, [prepareLobby]);

  function joinFromLobby() {
    if (!join) return;
    setHtml(
      buildConsultationHtml(join, { cameraOn, micOn }),
    );
    setPhase("live");
  }

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
        if (role !== "patient" && msg.type === "end") {
          await endConsultation(accessToken, appointmentId).catch(
            () => undefined,
          );
        }
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
        setPhase("failed");
        setHtml(null);
        setLoadError(
          msg.message || "Could not connect to the consultation room.",
        );
      }
    } catch {
      if (raw === "end") hangUpAndLeave();
    }
  }

  if (phase === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#26BAA4" size="large" />
        <Text style={styles.loadingText}>
          Opening your rehabilitation consultation…
        </Text>
      </View>
    );
  }

  if (phase === "failed" || !join) {
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
        <Pressable style={styles.btn} onPress={() => void prepareLobby()}>
          <Text style={styles.btnText}>Try again</Text>
        </Pressable>
        <Pressable style={styles.btnGhost} onPress={onLeave}>
          <Text style={styles.btnGhostText}>Close</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === "lobby") {
    return (
      <View style={styles.lobby}>
        <View style={styles.previewWrap}>
          {cameraOn ? (
            <CameraView
              style={styles.previewCam}
              facing="front"
              mirror
              mute
            />
          ) : (
            <View style={styles.camOff}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initialsFrom(selfName)}</Text>
              </View>
              <Text style={styles.camOffTitle}>Camera is off</Text>
              <Text style={styles.camOffHint}>
                You&apos;ll join without video until you turn it on
              </Text>
            </View>
          )}
          <View style={styles.lobbyToggles}>
            <Pressable
              style={[styles.toggle, !micOn && styles.toggleOff]}
              onPress={() => setMicOn((v) => !v)}
              accessibilityLabel={micOn ? "Mute microphone" : "Unmute microphone"}
            >
              <Text style={styles.toggleGlyph}>{micOn ? "🎙" : "🔇"}</Text>
            </Pressable>
            <Pressable
              style={[styles.toggle, !cameraOn && styles.toggleOff]}
              onPress={() => setCameraOn((v) => !v)}
              accessibilityLabel={cameraOn ? "Turn camera off" : "Turn camera on"}
            >
              <Text style={styles.toggleGlyph}>{cameraOn ? "📷" : "🚫"}</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.lobbyPanel}>
          <Text style={styles.kicker}>Video visit</Text>
          <Text style={styles.ready}>Ready to join?</Text>
          {peerLabel ? <Text style={styles.peer}>{peerLabel}</Text> : null}
          <Pressable style={styles.btn} onPress={joinFromLobby}>
            <Text style={styles.btnText}>Join now</Text>
          </Pressable>
          <Pressable style={styles.btnGhost} onPress={onLeave}>
            <Text style={styles.btnGhostText}>Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
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
      {html ? (
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
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#0B1220" },
  center: {
    flex: 1,
    backgroundColor: "#0B1220",
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
    backgroundColor: "#26BAA4",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  btnText: { color: "white", fontWeight: "700", fontSize: 16 },
  btnGhost: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  btnGhostText: { color: "#64748B", fontWeight: "700", fontSize: 16 },
  warn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#7f1d1d",
  },
  warnText: { color: "#fecaca", fontSize: 14 },
  lobby: {
    flex: 1,
    backgroundColor: "#F7F9FC",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 28,
    gap: 20,
  },
  previewWrap: {
    flex: 1,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#111827",
    minHeight: 280,
  },
  previewCam: {
    ...StyleSheet.absoluteFillObject,
  },
  camOff: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
    backgroundColor: "#111827",
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#26BAA4",
  },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "800" },
  camOffTitle: { color: "#E2E8F0", fontSize: 18, fontWeight: "700" },
  camOffHint: {
    color: "#94A3B8",
    fontSize: 14,
    textAlign: "center",
    maxWidth: 240,
  },
  lobbyToggles: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 20,
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
    zIndex: 2,
    elevation: 4,
  },
  toggle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#1A1F2B",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleOff: { backgroundColor: "#7F1D1D" },
  toggleGlyph: { fontSize: 22 },
  lobbyPanel: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#64748B",
  },
  ready: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  peer: {
    color: "#64748B",
    fontSize: 15,
    marginBottom: 8,
    textAlign: "center",
  },
});
