import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { requestPasswordReset } from "../api";
import { StrideLogo } from "../components/StrideLogo";
import { C } from "../theme";

type Props = {
  initialEmail?: string;
  onBack: () => void;
};

export function ForgotPasswordScreen({ initialEmail = "", onBack }: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  async function handleSubmit() {
    if (busy || !email.trim()) return;
    setError("");
    setBusy(true);
    try {
      const result = await requestPasswordReset(email);
      setResetToken(result.dev_reset_token ?? null);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Pressable style={styles.back} onPress={onBack} disabled={busy}>
        <Text style={styles.backText}>← Back to sign in</Text>
      </Pressable>
      <View style={styles.card}>
        <View style={styles.logoRow}>
          <StrideLogo size={44} />
          <Text style={styles.logoText}>Stride</Text>
        </View>
        <Text style={styles.h1}>Forgot password?</Text>
        <Text style={styles.sub}>
          Enter your email and we&apos;ll send reset instructions. In local demo mode the reset token
          is shown here — finish on the web app at /reset-password.
        </Text>
        {sent ? (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>Check your email</Text>
            <Text style={styles.successBody}>
              If an account exists for {email.trim().toLowerCase()}, reset instructions were sent.
            </Text>
            {resetToken ? (
              <Text style={styles.token} selectable>
                Demo reset token:{"\n"}
                {resetToken}
              </Text>
            ) : null}
            <Pressable style={styles.btnPrimary} onPress={onBack}>
              <Text style={styles.btnPrimaryText}>Back to sign in</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!busy}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              style={[styles.btnPrimary, busy && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={busy || !email.trim()}
            >
              {busy ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.btnPrimaryText}>Send reset link</Text>
              )}
            </Pressable>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: 20, justifyContent: "center" },
  back: { marginBottom: 12 },
  backText: { color: C.primary, fontWeight: "700", fontSize: 16 },
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
  sub: { fontSize: 16, color: C.muted, marginBottom: 20, lineHeight: 24 },
  label: { fontSize: 14, fontWeight: "600", color: C.text, marginBottom: 8 },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    backgroundColor: C.surfaceMuted,
    paddingHorizontal: 16,
    fontSize: 17,
    marginBottom: 4,
  },
  btnPrimary: {
    minHeight: 54,
    backgroundColor: C.primary,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  btnDisabled: { opacity: 0.85 },
  btnPrimaryText: { color: "white", fontSize: 17, fontWeight: "700" },
  error: { color: C.danger, fontWeight: "600", marginTop: 8, lineHeight: 22 },
  successBox: { gap: 10 },
  successTitle: { fontSize: 18, fontWeight: "800", color: C.success },
  successBody: { fontSize: 15, color: C.text, lineHeight: 22, marginBottom: 8 },
  token: {
    fontSize: 12,
    color: C.primary,
    fontWeight: "600",
    lineHeight: 18,
    backgroundColor: C.surfaceMuted,
    padding: 12,
    borderRadius: 12,
  },
});
