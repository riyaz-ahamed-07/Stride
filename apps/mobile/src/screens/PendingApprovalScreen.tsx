import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { fetchProfile, signIn } from "../api";
import { StrideLogo } from "../components/StrideLogo";
import type { AuthSession } from "../types";
import { C } from "../theme";

type Props = {
  session: AuthSession;
  email: string;
  password: string;
  onApproved: (session: AuthSession) => void;
  onSignOut: () => void;
};

export function PendingApprovalScreen({ session, email, password, onApproved, onSignOut }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function checkStatus() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      // Prefer a fresh login when password is still in memory; else use profile status.
      if (email && password) {
        const next = await signIn(email, password);
        if (!next.status || next.status === "active") {
          onApproved(next);
          return;
        }
        if (next.status === "pending_approval") {
          setMessage("Still waiting for admin approval. Check again soon.");
          return;
        }
        setMessage(`Account status: ${next.status.replace(/_/g, " ")}.`);
        return;
      }
      const profile = await fetchProfile(session.access_token);
      if (profile.status === "active") {
        onApproved({ ...session, status: "active", full_name: profile.full_name || session.full_name });
        return;
      }
      setMessage("Still waiting for admin approval. Check again soon.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not check status.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <View style={styles.logoRow}>
          <StrideLogo size={44} />
          <Text style={styles.logoText}>Stride</Text>
        </View>
        <Text style={styles.h1}>Pending approval</Text>
        <Text style={styles.sub}>
          Your physiotherapist account is with the clinic administrator. You will get full access —
          including patient invite codes — once approved. You can use this app on phone or web.
        </Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <Pressable
          style={[styles.btnPrimary, busy && styles.btnDisabled]}
          onPress={checkStatus}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.btnPrimaryText}>Check status</Text>
          )}
        </Pressable>
        <Pressable style={styles.btnGhost} onPress={onSignOut} disabled={busy}>
          <Text style={styles.btnGhostText}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 20, justifyContent: "center" },
  card: {
    backgroundColor: C.surface,
    borderRadius: 28,
    padding: 28,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
    justifyContent: "center",
  },
  logoText: { fontSize: 24, fontWeight: "800", color: C.primary },
  h1: { fontSize: 26, fontWeight: "800", color: C.text, marginBottom: 8 },
  sub: { fontSize: 15, color: C.muted, marginBottom: 20, lineHeight: 22 },
  message: { color: C.primary, fontWeight: "600", marginBottom: 12, lineHeight: 20 },
  btnPrimary: {
    minHeight: 54,
    backgroundColor: C.primary,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.85 },
  btnPrimaryText: { color: "white", fontSize: 17, fontWeight: "700" },
  btnGhost: { alignItems: "center", marginTop: 16, padding: 12 },
  btnGhostText: { color: C.muted, fontWeight: "700", fontSize: 16 },
});
