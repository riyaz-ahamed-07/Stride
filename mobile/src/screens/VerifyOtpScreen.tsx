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
import { resendEmailOtp, verifyEmailOtp } from "../api";
import { StrideLogo } from "../components/StrideLogo";
import type { AuthSession } from "../types";
import { C } from "../theme";

type Props = {
  email: string;
  initialDevCode?: string | null;
  onVerified: (session: AuthSession) => void;
  onBack: () => void;
};

export function VerifyOtpScreen({
  email,
  initialDevCode,
  onVerified,
  onBack,
}: Props) {
  const [code, setCode] = useState(initialDevCode ?? "");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState(initialDevCode ?? "");
  const [info, setInfo] = useState(
    initialDevCode
      ? `Demo OTP: ${initialDevCode}`
      : "In development, tap Resend to show the code, or check the API terminal.",
  );

  async function handleVerify() {
    if (!email.trim()) {
      setError("Email is missing. Go back and sign in again.");
      return;
    }
    if (busy || code.trim().length < 6) return;
    setBusy(true);
    setError("");
    try {
      const session = await verifyEmailOtp(email, code);
      onVerified(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify code.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    if (!email.trim()) {
      setError("Email is missing. Go back and sign in again.");
      return;
    }
    if (resending) return;
    setResending(true);
    setError("");
    try {
      const result = await resendEmailOtp(email);
      if (result.dev_code) {
        setDevCode(result.dev_code);
        setCode(result.dev_code);
        setInfo(`Demo OTP: ${result.dev_code}`);
      } else {
        setInfo("A new code was sent. Check the API terminal in development.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code.");
    } finally {
      setResending(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable style={styles.back} onPress={onBack} disabled={busy}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>
      <View style={styles.card}>
        <View style={styles.logoRow}>
          <StrideLogo size={44} />
          <Text style={styles.logoText}>Stride</Text>
        </View>
        <Text style={styles.h1}>Verify your email</Text>
        <Text style={styles.sub}>
          {email.trim() ? (
            <>
              Enter the 6-digit code sent to{"\n"}
              <Text style={styles.email}>{email}</Text>
            </>
          ) : (
            "Your email is missing from this session. Go back and sign in again to verify."
          )}
        </Text>

        <Text style={styles.label}>Verification code</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          editable={!busy}
          placeholder="000000"
          placeholderTextColor={C.muted}
        />

        {devCode ? (
          <Text style={styles.devHint}>Demo OTP: {devCode}</Text>
        ) : null}
        {info ? <Text style={styles.info}>{info}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[
            styles.btnPrimary,
            (busy || !email.trim() || code.length < 6) && styles.btnDisabled,
          ]}
          onPress={handleVerify}
          disabled={busy || !email.trim() || code.length < 6}
        >
          {busy ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.btnPrimaryText}>Verify</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.resend}
          onPress={handleResend}
          disabled={resending || busy}
        >
          <Text style={styles.resendText}>
            {resending ? "Sending…" : "Resend code"}
          </Text>
        </Pressable>
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
  sub: { fontSize: 15, color: C.muted, marginBottom: 20, lineHeight: 22 },
  email: { color: C.text, fontWeight: "700" },
  label: { fontSize: 14, fontWeight: "600", color: C.text, marginBottom: 8 },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    fontSize: 22,
    letterSpacing: 8,
    textAlign: "center",
    fontWeight: "700",
  },
  devHint: { marginTop: 12, fontSize: 14, color: C.primary, fontWeight: "700" },
  info: { marginTop: 8, fontSize: 13, color: C.muted, lineHeight: 18 },
  error: { color: C.danger, fontWeight: "600", marginTop: 10, lineHeight: 20 },
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
  resend: { alignItems: "center", marginTop: 16, paddingVertical: 8 },
  resendText: { color: C.primary, fontWeight: "700", fontSize: 15 },
});
