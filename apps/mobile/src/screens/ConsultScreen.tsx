import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Camera } from "expo-camera";
import { WebView } from "react-native-webview";
import { API } from "../api";
import type { Appointment } from "../types";

type Props = {
  appointmentId: string;
  displayName: string;
  appointment: Appointment | null;
  onLeave: () => void;
};

export function ConsultScreen({ appointmentId, displayName, appointment, onLeave }: Props) {
  const [permState, setPermState] = useState<"checking" | "denied" | "ready">("checking");
  const [webError, setWebError] = useState("");

  const roomUrl = useMemo(() => {
    const params = new URLSearchParams({
      name: displayName,
      role: "patient",
    });
    return `${API}/video/room/${encodeURIComponent(appointmentId)}?${params.toString()}`;
  }, [appointmentId, displayName]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      console.log(`[Stride] In-app video room: ${roomUrl}`);
      const cam = await Camera.requestCameraPermissionsAsync();
      const mic = await Camera.requestMicrophonePermissionsAsync();
      if (cancelled) return;
      if (cam.granted && mic.granted) {
        setPermState("ready");
      } else {
        setPermState("denied");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomUrl]);

  if (permState === "checking") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" size="large" />
        <Text style={styles.wait}>Asking for camera and microphone…</Text>
        <Pressable onPress={onLeave}>
          <Text style={styles.leave}>← Cancel</Text>
        </Pressable>
      </View>
    );
  }

  if (permState === "denied") {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera permission needed</Text>
        <Text style={styles.body}>
          Allow camera and microphone for Expo Go in your phone settings, then join the visit again.
        </Text>
        <Pressable style={styles.btn} onPress={() => Linking.openSettings()}>
          <Text style={styles.btnText}>Open settings</Text>
        </Pressable>
        <Pressable onPress={onLeave}>
          <Text style={styles.leave}>← Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.topbar}>
        <Pressable onPress={onLeave}>
          <Text style={styles.leave}>← Leave call</Text>
        </Pressable>
        <Text style={styles.meta} numberOfLines={1}>
          {appointment?.reason ?? "Video visit"} · in the app
        </Text>
      </View>
      {webError ? <Text style={styles.error}>{webError}</Text> : null}
      <WebView
        source={{ uri: roomUrl }}
        style={styles.webview}
        originWhitelist={["*"]}
        mixedContentMode="always"
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        javaScriptEnabled
        domStorageEnabled
        allowsFullscreenVideo
        setSupportMultipleWindows={false}
        mediaCapturePermissionGrantType="grant"
        androidLayerType="hardware"
        onPermissionRequest={(event) => {
          const nativeEvent = event.nativeEvent as { grant?: (resources: string[]) => void; resources?: string[] };
          nativeEvent.grant?.(nativeEvent.resources ?? ["android.webkit.resource.VIDEO_CAPTURE", "android.webkit.resource.AUDIO_CAPTURE"]);
        }}
        onMessage={(event) => {
          if (event.nativeEvent.data === "end") onLeave();
        }}
        onError={(event) => {
          console.error("[Stride] WebView error", event.nativeEvent);
          setWebError("Could not load the video room. Check the API HTTPS tunnel.");
        }}
        onHttpError={(event) => {
          if (event.nativeEvent.statusCode >= 400) {
            setWebError(`Video room HTTP ${event.nativeEvent.statusCode}`);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0F172A" },
  center: {
    flex: 1,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 16,
  },
  wait: { color: "white", fontSize: 16, marginTop: 12 },
  title: { color: "white", fontSize: 22, fontWeight: "800", textAlign: "center" },
  body: { color: "rgba(255,255,255,0.8)", fontSize: 16, lineHeight: 24, textAlign: "center" },
  topbar: { paddingHorizontal: 16, paddingVertical: 10, gap: 4 },
  leave: { color: "white", fontWeight: "700", fontSize: 16 },
  meta: { color: "rgba(255,255,255,0.65)", fontSize: 13 },
  error: { color: "#FCA5A5", paddingHorizontal: 16, paddingBottom: 8 },
  webview: { flex: 1, backgroundColor: "#0F172A" },
  btn: {
    minHeight: 48,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "white", fontWeight: "700", fontSize: 16 },
});
