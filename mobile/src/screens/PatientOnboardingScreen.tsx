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
import { completePatientOnboarding } from "../api";
import { StrideLogo } from "../components/StrideLogo";
import type { AuthSession } from "../types";
import { C } from "../theme";

type Props = {
  accessToken: string;
  onComplete: (session: AuthSession) => void;
};

type BodyRegion =
  | "knee"
  | "hip"
  | "shoulder"
  | "ankle"
  | "back"
  | "neck"
  | "wrist_hand"
  | "pelvic_floor"
  | "general";

const STEPS = ["Profile", "Recovery", "Therapist", "Consent"] as const;

const BODY_REGIONS: { id: BodyRegion; label: string }[] = [
  { id: "knee", label: "Knee" },
  { id: "hip", label: "Hip" },
  { id: "shoulder", label: "Shoulder" },
  { id: "ankle", label: "Ankle / foot" },
  { id: "back", label: "Back" },
  { id: "neck", label: "Neck" },
  { id: "wrist_hand", label: "Wrist / hand" },
  { id: "pelvic_floor", label: "Pelvic floor" },
  { id: "general", label: "General mobility" },
];

const GOAL_HINTS = [
  "Walk more comfortably day to day",
  "Return to work or daily tasks",
  "Rebuild strength after assessment",
  "Move with less stiffness",
];

export function PatientOnboardingScreen({ accessToken, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [bodyRegion, setBodyRegion] = useState<BodyRegion | "">("");
  const [notes, setNotes] = useState("");
  const [rehabGoal, setRehabGoal] = useState("");
  const [invite, setInvite] = useState("");
  const [cameraConsent, setCameraConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function validateStep(current: number): string {
    if (current === 0 && !fullName.trim()) return "Enter your full name.";
    if (current === 1) {
      if (!bodyRegion) return "Choose the body area you are recovering.";
      if (!rehabGoal.trim()) return "Share a short recovery goal.";
    }
    if (current === 2 && invite.trim().length < 4) {
      return "Enter the invite code from your physiotherapist.";
    }
    if (current === 3 && !cameraConsent) {
      return "Camera consent is required so guided movement sessions can run safely.";
    }
    return "";
  }

  function goNext() {
    const issue = validateStep(step);
    if (issue) {
      setError(issue);
      return;
    }
    setError("");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    if (busy) return;
    if (step < STEPS.length - 1) {
      goNext();
      return;
    }
    const issue = validateStep(step);
    if (issue) {
      setError(issue);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const session = await completePatientOnboarding(accessToken, {
        full_name: fullName,
        date_of_birth: dateOfBirth.trim() || null,
        phone: phone || null,
        body_region: bodyRegion,
        rehab_goal: rehabGoal,
        notes: notes || null,
        therapist_invite_code: invite,
        camera_analysis_consent: cameraConsent,
      });
      onComplete(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish setup.");
      setBusy(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <View style={styles.logoRow}>
          <StrideLogo size={44} />
          <Text style={styles.logoText}>Stride</Text>
        </View>
        <Text style={styles.eyebrow}>Patient setup</Text>
        <Text style={styles.h1}>Set up your rehabilitation</Text>
        <Text style={styles.sub}>
          A few short steps so your physiotherapist can personalise your home
          rehabilitation plan.
        </Text>

        <View style={styles.steps}>
          {STEPS.map((label, index) => {
            const current = index === step;
            const done = index < step;
            return (
              <View key={label} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepDot,
                    current && styles.stepDotCurrent,
                    done && styles.stepDotDone,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepDotText,
                      done && styles.stepDotTextDone,
                      current && styles.stepDotTextCurrent,
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    (current || done) && styles.stepLabelActive,
                  ]}
                >
                  {label}
                </Text>
              </View>
            );
          })}
        </View>

        {step === 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Basic profile</Text>
            <Text style={styles.label}>
              Full name <Text style={styles.req}>Required</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              editable={!busy}
            />
            <Text style={styles.label}>
              Date of birth <Text style={styles.opt}>Optional</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={C.muted}
              editable={!busy}
            />
            <Text style={styles.label}>
              Phone <Text style={styles.opt}>Optional</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!busy}
            />
          </View>
        ) : null}

        {step === 1 ? (
          <View>
            <Text style={styles.sectionTitle}>Rehabilitation context</Text>
            <Text style={styles.help}>
              Choose the focus area and a short goal. Your physiotherapist
              confirms the clinical plan.
            </Text>
            <Text style={styles.label}>
              Body region <Text style={styles.req}>Required</Text>
            </Text>
            <View style={styles.chipWrap}>
              {BODY_REGIONS.map((region) => {
                const selected = bodyRegion === region.id;
                return (
                  <Pressable
                    key={region.id}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setBodyRegion(region.id)}
                    disabled={busy}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {region.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.label}>
              Reason for therapy <Text style={styles.opt}>Optional</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={notes}
              onChangeText={setNotes}
              multiline
              editable={!busy}
              placeholder="e.g. Following my clinic assessment"
              placeholderTextColor={C.muted}
            />
            <Text style={styles.label}>
              Rehabilitation goal <Text style={styles.req}>Required</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={rehabGoal}
              onChangeText={setRehabGoal}
              editable={!busy}
              placeholder="What would better movement help you do?"
              placeholderTextColor={C.muted}
            />
            <View style={styles.chipWrap}>
              {GOAL_HINTS.map((hint) => (
                <Pressable
                  key={hint}
                  style={styles.hintChip}
                  onPress={() => setRehabGoal(hint)}
                  disabled={busy}
                >
                  <Text style={styles.hintText}>{hint}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View>
            <Text style={styles.sectionTitle}>
              Connect with your physiotherapist
            </Text>
            <Text style={styles.help}>
              Enter the invite code they gave you. Without a valid code you
              cannot finish setup.
            </Text>
            <Text style={styles.label}>
              Therapist invite code <Text style={styles.req}>Required</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={invite}
              onChangeText={(value) => setInvite(value.toUpperCase())}
              autoCapitalize="characters"
              editable={!busy}
              placeholder="8-character code"
              placeholderTextColor={C.muted}
            />
          </View>
        ) : null}

        {step === 3 ? (
          <View>
            <Text style={styles.sectionTitle}>Movement session consent</Text>
            <Text style={styles.help}>
              Some home exercises can use your device camera to count
              repetitions on your device. Video is not uploaded for clinic
              review unless your therapist asks you to share a session summary.
            </Text>
            <Pressable
              style={styles.consentRow}
              onPress={() => !busy && setCameraConsent((v) => !v)}
              disabled={busy}
            >
              <View
                style={[styles.checkbox, cameraConsent && styles.checkboxOn]}
              >
                {cameraConsent ? (
                  <Text style={styles.checkboxMark}>✓</Text>
                ) : null}
              </View>
              <Text style={styles.consentText}>
                I agree to camera-assisted movement analysis for my
                rehabilitation exercises.{" "}
                <Text style={styles.req}>Required</Text>
              </Text>
            </Pressable>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          {step > 0 ? (
            <Pressable style={styles.btnGhost} onPress={goBack} disabled={busy}>
              <Text style={styles.btnGhostText}>Back</Text>
            </Pressable>
          ) : (
            <View style={styles.btnGhostSpacer} />
          )}
          <Pressable
            style={[styles.btnPrimary, busy && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.btnPrimaryText}>
                {step === STEPS.length - 1
                  ? "Finish and open my plan"
                  : "Continue"}
              </Text>
            )}
          </Pressable>
        </View>
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
    marginBottom: 16,
    justifyContent: "center",
  },
  logoText: { fontSize: 24, fontWeight: "800", color: C.primary },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: C.teal,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  h1: { fontSize: 26, fontWeight: "800", color: C.text, marginBottom: 8 },
  sub: { fontSize: 15, color: C.muted, marginBottom: 18, lineHeight: 22 },
  steps: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 4,
  },
  stepItem: { flex: 1, alignItems: "center", gap: 6 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotCurrent: { backgroundColor: C.teal, borderColor: C.teal },
  stepDotDone: { backgroundColor: "#CCFBF1", borderColor: C.teal },
  stepDotText: { fontSize: 12, fontWeight: "700", color: C.muted },
  stepDotTextDone: { color: "#0F766E" },
  stepDotTextCurrent: { color: "white" },
  stepLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: C.muted,
    textAlign: "center",
  },
  stepLabelActive: { color: C.text },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.text,
    marginBottom: 8,
  },
  help: { fontSize: 14, color: C.muted, lineHeight: 20, marginBottom: 12 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
    marginBottom: 8,
    marginTop: 8,
  },
  req: {
    fontSize: 11,
    fontWeight: "700",
    color: C.teal,
    textTransform: "uppercase",
  },
  opt: { fontSize: 11, fontWeight: "600", color: C.muted },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    fontSize: 17,
    marginBottom: 4,
    color: C.text,
  },
  textarea: { minHeight: 80, paddingTop: 12, textAlignVertical: "top" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: {
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: "#F8FAFC",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipSelected: { borderColor: C.teal, backgroundColor: "#CCFBF1" },
  chipText: { fontSize: 14, fontWeight: "600", color: C.text },
  chipTextSelected: { color: "#0F766E" },
  hintChip: {
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  hintText: { fontSize: 12, fontWeight: "600", color: C.muted },
  consentRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxOn: { backgroundColor: C.teal, borderColor: C.teal },
  checkboxMark: { color: "white", fontWeight: "800", fontSize: 14 },
  consentText: { flex: 1, fontSize: 15, lineHeight: 22, color: C.text },
  error: { color: C.danger, fontWeight: "600", marginTop: 10, lineHeight: 20 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 20,
  },
  btnGhost: {
    minHeight: 48,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhostSpacer: { width: 64 },
  btnGhostText: { color: C.primary, fontSize: 16, fontWeight: "700" },
  btnPrimary: {
    flex: 1,
    minHeight: 54,
    backgroundColor: C.primary,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  btnDisabled: { opacity: 0.85 },
  btnPrimaryText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
});
