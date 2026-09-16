import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AccountGearButton } from "../components/AccountGearButton";
import { phoneDialUri } from "../lib/phone";
import type { TherapistContact } from "../types";
import { C } from "../theme";

const TOPICS = [
  {
    title: "If something hurts",
    body: "Stop the exercise. Sit down. If pain is sudden or severe, call your physiotherapist using the button below.",
  },
  {
    title: "Video consultations",
    body: "Use a tablet or computer for the best view. Allow camera and microphone. If video fails, call your physiotherapist.",
  },
  {
    title: "If text looks small",
    body: "This app uses large buttons and clear labels. Family helpers can tap buttons for the patient.",
  },
  {
    title: "Family helpers",
    body: "You may tap buttons for the patient. Do not change the prescribed plan without the therapist.",
  },
];

type Props = {
  therapist: TherapistContact | null;
  onOpenAccount: () => void;
};

function emergencyCopy(therapist: TherapistContact | null): {
  title: string;
  body: string;
} {
  if (therapist?.phone) {
    const clinic = therapist.clinic_name ? ` at ${therapist.clinic_name}` : "";
    return {
      title: "Urgent help",
      body: `If exercise causes sudden or severe pain, stop immediately and call ${therapist.full_name}${clinic}. For life-threatening emergencies, call your local emergency number.`,
    };
  }
  if (therapist) {
    return {
      title: "Urgent help",
      body: `Contact ${therapist.full_name}${therapist.clinic_name ? ` (${therapist.clinic_name})` : ""} through your clinic if you have sudden or severe pain. For life-threatening emergencies, call your local emergency number.`,
    };
  }
  return {
    title: "Urgent help",
    body: "If exercise causes sudden or severe pain, stop immediately and contact your clinic. For life-threatening emergencies, call your local emergency number.",
  };
}

export function HelpScreen({ therapist, onOpenAccount }: Props) {
  const urgent = emergencyCopy(therapist);
  const dial = therapist?.phone ? phoneDialUri(therapist.phone) : "";

  function callTherapist() {
    if (!dial) return;
    Linking.openURL(`tel:${dial}`);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <View style={{ flex: 1 }} />
        <AccountGearButton onOpenAccount={onOpenAccount} />
      </View>
      <Text style={styles.eyebrow}>Support</Text>
      <Text style={styles.h1}>Help centre</Text>
      <Text style={styles.sub}>
        Simple answers for patients and family helpers.
      </Text>

      {TOPICS.map((topic) => (
        <View key={topic.title} style={styles.card}>
          <Text style={styles.cardTitle}>{topic.title}</Text>
          <Text style={styles.cardBody}>{topic.body}</Text>
        </View>
      ))}

      <View style={styles.cardDanger}>
        <Text style={styles.cardTitle}>{urgent.title}</Text>
        <Text style={styles.cardBody}>{urgent.body}</Text>
        {dial ? (
          <Pressable style={styles.btnPrimary} onPress={callTherapist}>
            <Text style={styles.btnPrimaryText}>
              Call {therapist!.full_name}
            </Text>
          </Pressable>
        ) : null}
        {therapist?.phone ? (
          <Text style={styles.phoneHint}>{therapist.phone}</Text>
        ) : therapist ? (
          <Text style={styles.phoneHint}>
            No phone number on file — contact your clinic directly.
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 24 },
  topRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  eyebrow: { fontSize: 14, color: C.muted, marginBottom: 4 },
  h1: { fontSize: 28, fontWeight: "800", color: C.text, marginBottom: 8 },
  sub: { fontSize: 16, color: C.muted, lineHeight: 24, marginBottom: 20 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardDanger: {
    backgroundColor: C.dangerSoft,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.text,
    marginBottom: 8,
  },
  cardBody: { fontSize: 16, color: C.text, lineHeight: 24 },
  btnPrimary: {
    marginTop: 14,
    minHeight: 48,
    backgroundColor: C.danger,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: { color: "white", fontWeight: "700", fontSize: 16 },
  phoneHint: { marginTop: 10, fontSize: 14, color: C.muted, fontWeight: "600" },
});
