import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { registerAccount } from "../api";
import { PasswordField } from "../components/PasswordField";
import { StrideLogo } from "../components/StrideLogo";
import { IconField } from "../components/ui/IconField";
import { MailFieldIcon } from "../components/icons/AuthFieldIcons";
import {
  AccountTypeCards,
  type AccountRole,
} from "../components/onboarding/AccountTypeCards";
import { passwordRules, passwordValid } from "../lib/passwordStrength";
import type { AuthSession } from "../types";
import { C, colors, type as typography } from "../theme";

type Props = {
  onBack: () => void;
  onRegistered: (session: AuthSession, email: string) => void;
  onGoLogin: () => void;
};

export function SignUpScreen({ onBack, onRegistered, onGoLogin }: Props) {
  const [role, setRole] = useState<AccountRole | "">("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const rules = useMemo(() => passwordRules(password), [password]);
  const canSubmit =
    role !== "" &&
    email.trim().length > 0 &&
    passwordValid(password) &&
    password === confirm &&
    confirm.length > 0;

  async function handleSubmit() {
    if (busy || !canSubmit) return;
    const selectedRole = role as AccountRole;
    setBusy(true);
    setError("");
    try {
      const apiRole =
        selectedRole === "therapist" ? "physiotherapist" : "patient";
      const session = await registerAccount(email, password, apiRole);
      onRegistered(session, email.trim().toLowerCase());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create account.",
      );
    } finally {
      setBusy(false);
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

      <View style={styles.logoRow}>
        <StrideLogo size={48} />
      </View>

      <Text style={styles.h1}>Sign Up For Free</Text>
      <Text style={styles.sub}>Sign up in 1 minute for free!</Text>

      <View style={styles.form}>
        <AccountTypeCards value={role} onChange={setRole} disabled={busy} />

        <IconField
          label="Email Address"
          leftIcon={<MailFieldIcon />}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!busy}
          placeholder="Enter your email..."
          textContentType="emailAddress"
          autoComplete="email"
        />

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Password</Text>
          <PasswordField
            value={password}
            onChangeText={setPassword}
            editable={!busy}
          />
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Password Confirmation</Text>
          <PasswordField
            value={confirm}
            onChangeText={setConfirm}
            editable={!busy}
            error={confirm.length > 0 && password !== confirm}
            placeholder="Confirm your password..."
          />
        </View>

        <View style={styles.rules}>
          {rules.map((rule) => (
            <Text key={rule.id} style={[styles.rule, rule.ok && styles.ruleOk]}>
              {rule.ok ? "✓" : "○"} {rule.label}
            </Text>
          ))}
        </View>

        {confirm.length > 0 && password !== confirm ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>
              ERROR: Passwords do not match!
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>ERROR: {error}</Text>
          </View>
        ) : null}

        <Pressable
          style={[
            styles.btnPrimary,
            (busy || !canSubmit) && styles.btnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={busy || !canSubmit}
        >
          {busy ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.btnPrimaryText}>Sign Up →</Text>
          )}
        </Pressable>

        <View style={styles.footerRow}>
          <Text style={styles.footerMuted}>Already have an account? </Text>
          <Pressable onPress={onGoLogin} disabled={busy}>
            <Text style={styles.footerLink}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    backgroundColor: colors.surface.page,
  },
  back: { marginBottom: 8, alignSelf: "flex-start" },
  backText: { color: C.primary, fontWeight: "700", fontSize: 16 },
  logoRow: {
    alignItems: "center",
    marginBottom: 20,
    marginTop: 4,
  },
  h1: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text.primary,
    textAlign: "center",
    fontFamily: typography.fontFamilyExtraBold,
    letterSpacing: -0.4,
  },
  sub: {
    fontSize: 15,
    color: colors.text.muted,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 28,
    lineHeight: 22,
  },
  form: { gap: 18 },
  fieldBlock: { gap: 8 },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text.primary,
    fontFamily: typography.fontFamilyBold,
  },
  rules: { gap: 4, marginTop: -4 },
  rule: { fontSize: 13, color: colors.text.muted },
  ruleOk: { color: C.success, fontWeight: "600" },
  errorBanner: {
    backgroundColor: colors.semantic.errorSoft,
    borderWidth: 1,
    borderColor: colors.semantic.error,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  errorBannerText: {
    color: colors.semantic.error,
    fontWeight: "700",
    fontSize: 14,
  },
  btnPrimary: {
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { color: "#fff", fontWeight: "800", fontSize: 17 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    flexWrap: "wrap",
    gap: 4,
  },
  footerMuted: { color: colors.text.muted, fontSize: 14 },
  footerLink: { color: C.primary, fontWeight: "700", fontSize: 14 },
});
