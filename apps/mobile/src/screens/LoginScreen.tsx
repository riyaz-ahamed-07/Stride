import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { PasswordField } from "../components/PasswordField";
import { StrideLogo } from "../components/StrideLogo";
import { C } from "../theme";

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
        <View style={styles.card}>
          <View style={styles.logoRow}>
            <StrideLogo size={44} />
            <Text style={styles.logoText}>Stride</Text>
          </View>
          <Text style={styles.h1}>Welcome back</Text>
          <Text style={styles.sub}>Sign in to follow your home exercise plan.</Text>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, loading && styles.inputDisabled]}
            value={email}
            onChangeText={onEmailChange}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
            placeholderTextColor={C.muted}
          />
          <Text style={styles.label}>Password</Text>
          <PasswordField
            value={password}
            onChangeText={onPasswordChange}
            editable={!loading}
          />
          <Pressable style={styles.forgotRow} onPress={onForgotPassword} disabled={loading}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
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
              <Text style={styles.btnPrimaryText}>Sign in</Text>
            )}
          </Pressable>
          <View style={styles.signUpRow}>
            <Text style={styles.signUpMuted}>Don&apos;t have an account? </Text>
            <Pressable onPress={onSignUp} disabled={loading}>
              <Text style={styles.signUpLink}>Sign up</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  back: { paddingHorizontal: 20, paddingVertical: 8 },
  backText: { color: C.primary, fontWeight: "700", fontSize: 16 },
  page: { flex: 1, justifyContent: "center", padding: 20, paddingTop: 0 },
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
  h1: { fontSize: 28, fontWeight: "800", color: C.text, marginBottom: 8 },
  sub: { fontSize: 16, color: C.muted, marginBottom: 24, lineHeight: 24 },
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
  inputDisabled: { opacity: 0.7 },
  forgotRow: { alignSelf: "flex-end", marginTop: 8, marginBottom: 4 },
  forgotText: { color: C.primary, fontWeight: "700", fontSize: 15 },
  btnPrimary: {
    minHeight: 54,
    backgroundColor: C.primary,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  btnDisabled: { opacity: 0.85 },
  btnLoading: { flexDirection: "row", alignItems: "center", gap: 10 },
  btnPrimaryText: { color: "white", fontSize: 17, fontWeight: "700" },
  error: { color: C.danger, fontWeight: "600", marginTop: 8, lineHeight: 22 },
  signUpRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
    flexWrap: "wrap",
  },
  signUpMuted: { fontSize: 15, color: C.muted },
  signUpLink: { fontSize: 15, color: C.primary, fontWeight: "700" },
});
