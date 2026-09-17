import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { PasswordField } from "../components/PasswordField";
import { StrideLogo } from "../components/StrideLogo";
import { IconField } from "../components/ui/IconField";
import { MailFieldIcon } from "../components/icons/AuthFieldIcons";
import { C, colors, type as typography } from "../theme";

type Props = {
  email: string;
  password: string;
  error: string;
  loading?: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSignIn: () => void;
  onBack: () => void;
  onForgotPassword: () => void;
  onSignUp: () => void;
};

export function LoginScreen({
  email,
  password,
  error,
  loading = false,
  onEmailChange,
  onPasswordChange,
  onSignIn,
  onBack,
  onForgotPassword,
  onSignUp,
}: Props) {
  return (
    <View style={styles.shell}>
      <Pressable style={styles.back} onPress={onBack} disabled={loading}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>
      <View style={styles.page}>
        <View style={styles.logoRow}>
          <StrideLogo size={48} />
        </View>
        <Text style={styles.h1}>Sign In</Text>
        <Text style={styles.sub}>Let&apos;s continue your rehab journey.</Text>

        <View style={styles.form}>
          <IconField
            label="Email Address"
            leftIcon={<MailFieldIcon />}
            value={email}
            onChangeText={onEmailChange}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
            placeholder="Enter your email..."
            textContentType="emailAddress"
            autoComplete="email"
          />

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Password</Text>
            <PasswordField
              value={password}
              onChangeText={onPasswordChange}
              editable={!loading}
            />
          </View>

          <View style={styles.footerLinks}>
            <Pressable onPress={onSignUp} disabled={loading}>
              <Text style={styles.linkMuted}>Sign Up</Text>
            </Pressable>
            <Pressable onPress={onForgotPassword} disabled={loading}>
              <Text style={styles.linkPrimary}>Forgot your password?</Text>
            </Pressable>
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>ERROR: {error}</Text>
            </View>
          ) : null}

          <Pressable
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={onSignIn}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.btnLoading}>
                <ActivityIndicator color="white" />
                <Text style={styles.btnPrimaryText}>Signing in…</Text>
              </View>
            ) : (
              <Text style={styles.btnPrimaryText}>Sign In →</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.surface.page },
  back: { paddingHorizontal: 24, paddingVertical: 8 },
  backText: { color: C.primary, fontWeight: "700", fontSize: 16 },
  page: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  logoRow: { alignItems: "center", marginBottom: 20 },
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
  footerLinks: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: -4,
  },
  linkMuted: { color: colors.text.muted, fontWeight: "600", fontSize: 14 },
  linkPrimary: { color: C.primary, fontWeight: "700", fontSize: 14 },
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
  btnLoading: { flexDirection: "row", alignItems: "center", gap: 10 },
  btnPrimaryText: { color: "#fff", fontWeight: "800", fontSize: 17 },
});
