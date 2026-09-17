import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInput as TextInputType,
} from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { resendEmailOtp, verifyEmailOtp } from "../api";
import { StrideLogo } from "../components/StrideLogo";
import type { AuthSession } from "../types";
import { C, colors, type as typography } from "../theme";

const OTP_LEN = 6;

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
  const seed = (initialDevCode ?? "").replace(/\D/g, "").slice(0, OTP_LEN);
  const [digits, setDigits] = useState<string[]>(() => {
    const arr = Array.from({ length: OTP_LEN }, () => "");
    for (let i = 0; i < seed.length; i++) arr[i] = seed[i]!;
    return arr;
  });
  const [active, setActive] = useState(Math.min(seed.length, OTP_LEN - 1));
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(
    initialDevCode
      ? `Demo OTP: ${initialDevCode}`
      : "Enter the code from your email, or tap Resend in development.",
  );
  const inputs = useRef<(TextInputType | null)[]>([]);

  const code = digits.join("");

  function setDigitAt(index: number, raw: string) {
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }
    const chars = cleaned.slice(0, OTP_LEN - index).split("");
    const next = [...digits];
    chars.forEach((ch, offset) => {
      next[index + offset] = ch;
    });
    setDigits(next);
    const focusAt = Math.min(index + chars.length, OTP_LEN - 1);
    setActive(focusAt);
    inputs.current[focusAt]?.focus();
  }

  async function handleVerify() {
    if (!email.trim()) {
      setError("Email is missing. Go back and sign in again.");
      return;
    }
    if (busy || code.length < OTP_LEN) return;
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
        const nextCode = result.dev_code.replace(/\D/g, "").slice(0, OTP_LEN);
        const next = Array.from(
          { length: OTP_LEN },
          (_, i) => nextCode[i] ?? "",
        );
        setDigits(next);
        setActive(Math.min(nextCode.length, OTP_LEN - 1));
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
      <View style={styles.topRow}>
        <Pressable
          style={styles.backBtn}
          onPress={onBack}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.text.primary} strokeWidth={2.5} />
        </Pressable>
        <Text style={styles.topTitle}>OTP Verification</Text>
      </View>

      <View style={styles.logoRow}>
        <StrideLogo size={44} />
      </View>

      <Text style={styles.h1}>Enter your OTP!</Text>
      <Text style={styles.sub}>
        Please enter the {OTP_LEN}-digit code we sent
        {email.trim() ? (
          <>
            {" "}
            to{"\n"}
            <Text style={styles.email}>{email}</Text>
          </>
        ) : (
          "!"
        )}
      </Text>

      <View style={styles.otpRow}>
        {digits.map((digit, index) => {
          const isActive = active === index;
          return (
            <TextInput
              key={index}
              ref={(ref) => {
                inputs.current[index] = ref;
              }}
              style={[styles.otpBox, isActive && styles.otpBoxActive]}
              value={digit}
              onChangeText={(text) => setDigitAt(index, text)}
              onFocus={() => setActive(index)}
              onKeyPress={({ nativeEvent }) => {
                if (
                  nativeEvent.key === "Backspace" &&
                  !digits[index] &&
                  index > 0
                ) {
                  inputs.current[index - 1]?.focus();
                  setActive(index - 1);
                }
              }}
              keyboardType="number-pad"
              maxLength={OTP_LEN}
              editable={!busy}
              selectTextOnFocus
              textContentType="oneTimeCode"
            />
          );
        })}
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>ERROR: {error}</Text>
        </View>
      ) : info ? (
        <Text style={styles.info}>{info}</Text>
      ) : null}

      <Pressable
        style={[
          styles.btnPrimary,
          (busy || code.length < OTP_LEN) && styles.btnDisabled,
        ]}
        onPress={handleVerify}
        disabled={busy || code.length < OTP_LEN}
      >
        {busy ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.btnPrimaryText}>Continue →</Text>
        )}
      </Pressable>

      <Text style={styles.resendMuted}>Didn&apos;t receive the auth code?</Text>
      <Pressable onPress={handleResend} disabled={resending || busy}>
        <Text style={styles.resendLink}>
          {resending ? "Sending…" : "Re-Send the OTP, now!"}
        </Text>
      </Pressable>
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
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text.primary,
    fontFamily: typography.fontFamilyExtraBold,
  },
  logoRow: { alignItems: "center", marginBottom: 18 },
  h1: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text.primary,
    fontFamily: typography.fontFamilyExtraBold,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  sub: {
    fontSize: 15,
    color: colors.text.muted,
    lineHeight: 22,
    marginBottom: 28,
  },
  email: { color: colors.text.primary, fontWeight: "700" },
  otpRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginBottom: 18,
  },
  otpBox: {
    flex: 1,
    aspectRatio: 0.78,
    maxHeight: 72,
    borderRadius: 16,
    backgroundColor: colors.surface.subtle,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "800",
    color: colors.text.primary,
  },
  otpBoxActive: {
    backgroundColor: C.primary,
    color: "#fff",
  },
  errorBanner: {
    backgroundColor: colors.semantic.errorSoft,
    borderWidth: 1,
    borderColor: colors.semantic.error,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  errorBannerText: {
    color: colors.semantic.error,
    fontWeight: "700",
    fontSize: 14,
  },
  info: {
    color: colors.text.muted,
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  btnPrimary: {
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  btnDisabled: { opacity: 0.55 },
  btnPrimaryText: { color: "#fff", fontWeight: "800", fontSize: 17 },
  resendMuted: {
    textAlign: "center",
    color: colors.text.muted,
    fontSize: 14,
    marginBottom: 6,
  },
  resendLink: {
    textAlign: "center",
    color: C.primary,
    fontWeight: "700",
    fontSize: 15,
    textDecorationLine: "underline",
  },
});
