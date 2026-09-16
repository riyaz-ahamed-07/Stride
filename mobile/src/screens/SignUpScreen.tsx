import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { registerAccount } from "../api";
import { PasswordField } from "../components/PasswordField";
import { StrideLogo } from "../components/StrideLogo";
import { passwordRules, passwordValid } from "../lib/passwordStrength";
import type { AuthSession } from "../types";
import { C } from "../theme";

type Props = {
  onBack: () => void;
  onRegistered: (session: AuthSession, email: string) => void;
  onGoLogin: () => void;
};

export function SignUpScreen({ onBack, onRegistered, onGoLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const rules = useMemo(() => passwordRules(password), [password]);

  async function handleSubmit() {
    if (busy) return;
    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }
    if (!passwordValid(password)) {
      setError("Please meet all password requirements.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const session = await registerAccount(email, password, "patient");
      onRegistered(session, email.trim().toLowerCase());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Pressable style={styles.back} onPress={onBack} disabled={busy}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>
      <View style={styles.card}>
        <View style={styles.logoRow}>
          <StrideLogo size={44} />
          <Text style={styles.logoText}>Stride</Text>
        </View>
        <Text style={styles.h1}>Create your patient account</Text>
        <Text style={styles.sub}>
          This phone app is for patients. Physiotherapists and admins should use the Stride web app
          to register and manage clinics.
        </Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!busy}
          placeholderTextColor={C.muted}
        />

        <Text style={styles.label}>Password</Text>
        <PasswordField value={password} onChangeText={setPassword} editable={!busy} />
        <View style={styles.rules}>
          {rules.map((rule) => (
            <Text key={rule.id} style={[styles.rule, rule.ok && styles.ruleOk]}>
              {rule.ok ? "✓" : "○"} {rule.label}
            </Text>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.btnPrimary, busy && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.btnPrimaryText}>Continue</Text>
          )}
        </Pressable>

        <View style={styles.footerRow}>
          <Text style={styles.footerMuted}>Already have an account? </Text>
          <Pressable onPress={onGoLogin} disabled={busy}>
            <Text style={styles.footerLink}>Sign in</Text>
          </Pressable>
        </View>
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
  label: { fontSize: 14, fontWeight: "600", color: C.text, marginBottom: 8, marginTop: 8 },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    fontSize: 17,
    color: C.text,
    marginBottom: 4,
  },
  rules: { marginTop: 10, gap: 4 },
  rule: { fontSize: 13, color: C.muted },
  ruleOk: { color: C.success, fontWeight: "600" },
  error: { color: C.danger, fontWeight: "600", marginTop: 10, lineHeight: 20 },
  btnPrimary: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { color: "#fff", fontWeight: "800", fontSize: 17 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
    flexWrap: "wrap",
    gap: 4,
  },
  footerMuted: { color: C.muted, fontSize: 14 },
  footerLink: { color: C.primary, fontWeight: "700", fontSize: 14 },
});
