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
import { completeTherapistOnboarding } from "../api";
import { StrideLogo } from "../components/StrideLogo";
import type { AuthSession } from "../types";
import { C } from "../theme";

type Props = {
  accessToken: string;
  onComplete: (session: AuthSession) => void;
};

export function TherapistOnboardingScreen({ accessToken, onComplete }: Props) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [license, setLicense] = useState("");
  const [clinic, setClinic] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (busy) return;
    if (!fullName.trim()) {
      setError("Enter your full name.");
      return;
    }
    if (!license.trim()) {
      setError("Enter your license number.");
      return;
    }
    if (!clinic.trim()) {
      setError("Enter your clinic name.");
      return;
    }
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
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <View style={styles.logoRow}>
          <StrideLogo size={44} />
          <Text style={styles.logoText}>Stride</Text>
        </View>
        <Text style={styles.h1}>Physiotherapist profile</Text>
        <Text style={styles.sub}>
          Tell us about your practice. An administrator will review your account before patients can
          link to you.
        </Text>

        <Text style={styles.label}>Full name</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
          editable={!busy}
        />

        <Text style={styles.label}>Phone (optional)</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          editable={!busy}
        />

        <Text style={styles.label}>License number</Text>
        <TextInput
          style={styles.input}
          value={license}
          onChangeText={setLicense}
          editable={!busy}
        />

        <Text style={styles.label}>Clinic name</Text>
        <TextInput
          style={styles.input}
          value={clinic}
          onChangeText={setClinic}
          autoCapitalize="words"
          editable={!busy}
        />

        <Text style={styles.label}>Specialty (optional)</Text>
        <TextInput
          style={styles.input}
          value={specialty}
          onChangeText={setSpecialty}
          editable={!busy}
          placeholder="e.g. Orthopaedics"
          placeholderTextColor={C.muted}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.btnPrimary, busy && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.btnPrimaryText}>Submit for approval</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: 20, justifyContent: "center" },
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
});
