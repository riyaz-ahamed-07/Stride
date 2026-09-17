import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Camera, X } from "lucide-react-native";
import { completePatientOnboarding, validateTherapistInvite } from "../api";
import {
  ContinueButton,
  OnboardingShell,
  O,
} from "../components/onboarding/OnboardingShell";
import { AgeWheel } from "../components/onboarding/AgeWheel";
import {
  GenderStep,
  type GenderChoice,
} from "../components/onboarding/GenderStep";
import {
  WeightScaleStep,
  type WeightUnit,
} from "../components/onboarding/WeightScaleStep";
import {
  FitnessLevelStep,
  FITNESS_LEVELS,
} from "../components/onboarding/FitnessLevelStep";
import {
  TherapistCodeStep,
  THERAPIST_CODE_LEN,
} from "../components/onboarding/TherapistCodeStep";
import { IconField } from "../components/ui/IconField";
import {
  LocationFieldIcon,
  NameFieldIcon,
  PhoneFieldIcon,
} from "../components/icons/AuthFieldIcons";
import type { AuthSession } from "../types";
import { C, type as typography } from "../theme";

type Props = {
  accessToken: string;
  onComplete: (session: AuthSession) => void;
};

const TOTAL = 7;

function ageToDob(age: number): string {
  const year = new Date().getFullYear() - age;
  return `${year}-01-01`;
}

function genderLabel(g: GenderChoice | ""): string {
  if (g === "male") return "Male";
  if (g === "female") return "Female";
  if (g === "prefer_not_to_say") return "Prefer not to say";
  return "—";
}

export function PatientOnboardingScreen({ accessToken, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [invite, setInvite] = useState("");
  const [inviteVerified, setInviteVerified] = useState(false);
  const [linkedTherapist, setLinkedTherapist] = useState("");
  const [gender, setGender] = useState<GenderChoice | "">("male");
  const [age, setAge] = useState(25);
  const [weight, setWeight] = useState(65);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [fitnessLevel, setFitnessLevel] = useState(2);
  const [exerciseVenue, setExerciseVenue] = useState<
    "home" | "gym" | "clinic" | ""
  >("");
  const [cameraPromptOpen, setCameraPromptOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const profileStepReady =
    fullName.trim().length > 0 &&
    phone.trim().length > 0 &&
    location.trim().length > 0;

  const inviteReady = invite.trim().length >= THERAPIST_CODE_LEN;
  const fit = FITNESS_LEVELS[fitnessLevel];
  const venueLabel = exerciseVenue
    ? `${exerciseVenue.charAt(0).toUpperCase()}${exerciseVenue.slice(1)}`
    : "—";

  function validateStep(current: number): string {
    if (current === 0 && !profileStepReady) return "profile";
    if (current === 1 && !inviteReady) {
      return "Your therapist code doesn't match the expected length.";
    }
    if (current === 1 && !inviteVerified) {
      return "Confirm a valid therapist code to continue.";
    }
    if (current === 2 && !gender) return "Select a gender option to continue.";
    if (current === 5 && !exerciseVenue)
      return "Choose where you usually exercise.";
    return "";
  }

  async function goNext() {
    if (step === 0 && !profileStepReady) return;
    if (step === 1) {
      if (!inviteReady) {
        setError("Your therapist code doesn't match the expected length.");
        return;
      }
      setBusy(true);
      setError("");
      try {
        const result = await validateTherapistInvite(accessToken, invite);
        setInviteVerified(true);
        setLinkedTherapist(result.therapist_name);
        setStep(2);
      } catch (err) {
        setInviteVerified(false);
        setLinkedTherapist("");
        setError(
          err instanceof Error
            ? err.message
            : "That invite code was not found.",
        );
      } finally {
        setBusy(false);
      }
      return;
    }

    const issue = validateStep(step);
    if (issue) {
      if (step !== 0) setError(issue);
      return;
    }
    setError("");
    if (step >= TOTAL - 1) {
      setCameraPromptOpen(true);
      return;
    }
    setStep((s) => s + 1);
  }

  function goBack() {
    setError("");
    setCameraPromptOpen(false);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function finalizeWithCameraConsent(allowed: boolean) {
    if (busy) return;
    if (!allowed) {
      setCameraPromptOpen(false);
      setError(
        "Camera access is needed for guided movement sessions. Tap Finalize to allow.",
      );
      return;
    }
    if (!inviteVerified) {
      setCameraPromptOpen(false);
      setError("Confirm a valid therapist code to continue.");
      setStep(1);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const session = await completePatientOnboarding(accessToken, {
        full_name: fullName,
        date_of_birth: ageToDob(age),
        phone: phone.trim(),
        gender: gender || null,
        body_region: "general",
        rehab_goal: "Improve mobility and recovery",
        notes:
          [
            location.trim() ? `Location: ${location.trim()}` : "",
            `Weight: ${weight} ${weightUnit}`,
            fit ? `Fitness: ${fit.label} (${fit.detail})` : "",
            exerciseVenue ? `Venue: ${venueLabel}` : "",
          ]
            .filter(Boolean)
            .join("\n") || null,
        therapist_invite_code: invite,
        camera_analysis_consent: true,
      });
      setCameraPromptOpen(false);
      onComplete(session);
    } catch (err) {
      setCameraPromptOpen(false);
      setError(err instanceof Error ? err.message : "Could not finish setup.");
      setBusy(false);
    }
  }

  const titles = [
    "Complete your profile",
    "Enter therapist code!",
    "Select your gender",
    "What's your age?",
    "What's your weight?",
    "Fitness Level",
    "Review & finalize",
  ];

  const subtitles = [
    "Tell us who you are so we can set up your care.",
    linkedTherapist
      ? `Linked to ${linkedTherapist}. You can continue.`
      : "Type the 8-character code from your physiotherapist.",
    "Helps tailor guidance and form cues.",
    "Used to personalize your rehab plan.",
    "Helps set safe session intensity.",
    "How often do you usually exercise?",
    "Check your details, then finalize to open your dashboard.",
  ];

  const reviewRows = [
    { label: "Name", value: fullName.trim() || "—" },
    { label: "Phone", value: phone.trim() || "—" },
    { label: "Location", value: location.trim() || "—" },
    { label: "Therapist", value: linkedTherapist || invite || "—" },
    { label: "Gender", value: genderLabel(gender) },
    { label: "Age", value: String(age) },
    { label: "Weight", value: `${weight} ${weightUnit}` },
    {
      label: "Fitness",
      value: fit ? `${fit.label} · ${fit.detail}` : "—",
    },
    { label: "Exercises at", value: venueLabel },
  ];

  const bodyAlign = step === 3 ? "center" : "top";
  const isCodeStep = step === 1;

  const venuePills =
    step === 5 ? (
      <View style={styles.pillRow}>
        {(
          [
            { id: "home" as const, label: "Home" },
            { id: "gym" as const, label: "Gym" },
            { id: "clinic" as const, label: "Clinic" },
          ] as const
        ).map((pill) => {
          const on = exerciseVenue === pill.id;
          return (
            <Pressable
              key={pill.id}
              style={[styles.pill, on && styles.pillOn]}
              onPress={() => setExerciseVenue(pill.id)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.pillText, on && styles.pillTextOn]}>
                {pill.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    ) : null;

  return (
    <>
      <OnboardingShell
        step={step}
        total={TOTAL}
        onBack={step > 0 ? goBack : undefined}
        title={titles[step]}
        subtitle={subtitles[step]}
        bodyAlign={bodyAlign}
        layout={isCodeStep ? "centered" : "default"}
        copyExtra={venuePills}
        copyStyle={
          step === 4
            ? { paddingTop: 28, paddingBottom: 12 }
            : step === 5
              ? { paddingBottom: 10 }
              : undefined
        }
        footerStyle={
          step === 2
            ? { paddingTop: 0 }
            : step === 5
              ? { paddingTop: 32 }
              : undefined
        }
        footer={
          step === 2 ? (
            <ContinueButton
              label="Continue"
              onPress={() => void goNext()}
              busy={busy}
              disabled={!gender}
            />
          ) : (
            <ContinueButton
              label={step === TOTAL - 1 ? "Finalize" : "Continue"}
              onPress={() => void goNext()}
              busy={busy}
              disabled={
                (step === 0 && !profileStepReady) ||
                (step === 1 && !inviteReady) ||
                (step === 5 && !exerciseVenue)
              }
            />
          )
        }
      >
        {error && step !== 0 && step !== 1 ? (
          <Text style={styles.error}>{error}</Text>
        ) : null}

        {step === 0 ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.profileForm}
            keyboardShouldPersistTaps="handled"
          >
            <IconField
              label="Full Name"
              leftIcon={<NameFieldIcon />}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              editable={!busy}
              placeholder="Your full name"
            />
            <IconField
              label="Phone Number"
              leftIcon={<PhoneFieldIcon />}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!busy}
              placeholder="+91 90000 00000"
            />
            <IconField
              label="Location"
              leftIcon={<LocationFieldIcon />}
              value={location}
              onChangeText={setLocation}
              editable={!busy}
              placeholder="City, Country"
            />
          </ScrollView>
        ) : null}

        {step === 1 ? (
          <TherapistCodeStep
            value={invite}
            onChange={(code) => {
              setInvite(code);
              setInviteVerified(false);
              setLinkedTherapist("");
              if (error) setError("");
            }}
            error={error}
            disabled={busy}
          />
        ) : null}

        {step === 2 ? (
          <View style={styles.genderStep}>
            <GenderStep value={gender} onChange={setGender} disabled={busy} />
            <Pressable
              style={[
                styles.preferNot,
                gender === "prefer_not_to_say" && styles.preferNotOn,
              ]}
              onPress={() => setGender("prefer_not_to_say")}
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{
                selected: gender === "prefer_not_to_say",
              }}
            >
              <Text style={styles.preferNotText}>Prefer not to answer</Text>
              <X size={20} color={O.green} strokeWidth={2.5} />
            </Pressable>
          </View>
        ) : null}

        {step === 3 ? <AgeWheel value={age} onChange={setAge} /> : null}

        {step === 4 ? (
          <WeightScaleStep
            value={weight}
            unit={weightUnit}
            onChange={setWeight}
            onUnitChange={setWeightUnit}
            disabled={busy}
          />
        ) : null}

        {step === 5 ? (
          <FitnessLevelStep
            value={fitnessLevel}
            onChange={setFitnessLevel}
            disabled={busy}
          />
        ) : null}

        {step === 6 ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.reviewList}
          >
            {reviewRows.map((row) => (
              <View key={row.label} style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{row.label}</Text>
                <Text style={styles.reviewValue}>{row.value}</Text>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </OnboardingShell>

      <Modal
        visible={cameraPromptOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!busy) setCameraPromptOpen(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard} accessibilityRole="alert">
            <View style={styles.modalIconWrap}>
              <Camera size={28} color={O.green} strokeWidth={2.2} />
            </View>
            <Text style={styles.modalTitle}>Allow Camera Access?</Text>
            <Text style={styles.modalBody}>
              Stride uses your camera for guided movement feedback. Video stays
              on your device unless you choose to share a summary.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalBtnGhost}
                onPress={() => void finalizeWithCameraConsent(false)}
                disabled={busy}
                accessibilityRole="button"
              >
                <Text style={styles.modalBtnGhostText}>Don't Allow</Text>
              </Pressable>
              <Pressable
                style={styles.modalBtnPrimary}
                onPress={() => void finalizeWithCameraConsent(true)}
                disabled={busy}
                accessibilityRole="button"
              >
                <Text style={styles.modalBtnPrimaryText}>
                  {busy ? "Saving…" : "Allow"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  error: {
    color: C.danger,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
    fontSize: 14,
  },
  profileForm: { gap: 18, paddingTop: 20, paddingBottom: 12 },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: O.gray20,
  },
  pillOn: {
    backgroundColor: O.green,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "700",
    color: O.gray60,
  },
  pillTextOn: {
    color: O.white,
  },
  reviewList: {
    gap: 8,
    paddingBottom: 12,
  },
  reviewRow: {
    backgroundColor: O.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: O.gray20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  reviewLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: O.gray60,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  reviewValue: {
    fontSize: 16,
    fontWeight: "700",
    color: O.gray80,
    fontFamily: typography.fontFamilyBold,
  },
  genderStep: {
    flex: 1,
  },
  preferNot: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: O.greenSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    alignSelf: "center",
    marginTop: 14,
    marginBottom: 14,
  },
  preferNotOn: {
    borderWidth: 1.5,
    borderColor: O.green,
  },
  preferNotText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.2,
    color: O.green,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: O.white,
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    alignItems: "center",
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: O.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: O.gray80,
    textAlign: "center",
    marginBottom: 8,
    fontFamily: typography.fontFamilyExtraBold,
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 21,
    color: O.gray60,
    textAlign: "center",
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  modalBtnGhost: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: O.gray20,
  },
  modalBtnGhostText: {
    fontSize: 15,
    fontWeight: "700",
    color: O.gray80,
  },
  modalBtnPrimary: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: O.green,
  },
  modalBtnPrimaryText: {
    fontSize: 15,
    fontWeight: "800",
    color: O.white,
  },
});
