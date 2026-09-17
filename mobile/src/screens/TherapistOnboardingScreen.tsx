import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { completeTherapistOnboarding } from "../api";
import {
  ContinueButton,
  OnboardingShell,
  O,
} from "../components/onboarding/OnboardingShell";
import type { AuthSession } from "../types";
import { colors } from "../theme";

type Props = {
  accessToken: string;
  onComplete: (session: AuthSession) => void;
};

const TOTAL = 3;

export function TherapistOnboardingScreen({ accessToken, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [license, setLicense] = useState("");
  const [clinic, setClinic] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function validate(current: number): string {
    if (current === 0 && !fullName.trim()) return "Enter your full name.";
    if (current === 1 && !license.trim()) return "Enter your license number.";
    if (current === 2 && !clinic.trim()) return "Enter your clinic name.";
    return "";
  }

  function goNext() {
    const issue = validate(step);
    if (issue) {
      setError(issue);
      return;
    }
    setError("");
    if (step >= TOTAL - 1) {
      void handleSubmit();
      return;
    }
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const session = await completeTherapistOnboarding(accessToken, {
        full_name: fullName,
        phone: phone || null,
        license_number: license,
        clinic_name: clinic,
        specialty: specialty || null,
      });
      onComplete(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish setup.");
      setBusy(false);
    }
  }

  const titles = [
    "What should we call you?",
    "Your professional license",
    "Where do you practise?",
  ];

  return (
    <OnboardingShell
      step={step}
      total={TOTAL}
      onBack={step > 0 ? () => setStep((s) => s - 1) : undefined}
      title={titles[step]}
      subtitle={
        step === 2
          ? "An administrator reviews your account before patients can link to you."
          : undefined
      }
      footer={
        <ContinueButton
          label={step === TOTAL - 1 ? "Submit for approval" : "Continue"}
          onPress={goNext}
          busy={busy}
        />
      }
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {step === 0 ? (
        <View style={styles.stack}>
          <Text style={styles.label}>Full name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            editable={!busy}
            placeholderTextColor={O.gray40}
          />
          <Text style={styles.label}>Phone (optional)</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!busy}
            placeholderTextColor={O.gray40}
          />
        </View>
      ) : null}

      {step === 1 ? (
        <View style={styles.stack}>
          <Text style={styles.label}>License number</Text>
          <TextInput
            style={styles.input}
            value={license}
            onChangeText={setLicense}
            editable={!busy}
            placeholderTextColor={O.gray40}
          />
          <Text style={styles.label}>Specialty (optional)</Text>
          <TextInput
            style={styles.input}
            value={specialty}
            onChangeText={setSpecialty}
            editable={!busy}
            placeholder="e.g. Orthopaedics"
            placeholderTextColor={O.gray40}
          />
        </View>
      ) : null}

      {step === 2 ? (
        <View style={styles.stack}>
          <Text style={styles.label}>Clinic name</Text>
          <TextInput
            style={styles.input}
            value={clinic}
            onChangeText={setClinic}
            autoCapitalize="words"
            editable={!busy}
            placeholderTextColor={O.gray40}
          />
        </View>
      ) : null}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  error: {
    color: colors.semantic.error,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  stack: { gap: 10 },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: O.gray60,
    marginTop: 4,
  },
  input: {
    minHeight: 56,
    borderRadius: 21,
    backgroundColor: O.white,
    paddingHorizontal: 18,
    fontSize: 17,
    fontWeight: "600",
    color: O.gray80,
    borderWidth: 1,
    borderColor: O.gray20,
    shadowColor: "#2F3C33",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
});
