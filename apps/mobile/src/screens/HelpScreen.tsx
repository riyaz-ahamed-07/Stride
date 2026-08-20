import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { C } from "../theme";

const TOPICS = [
  {
    title: "If something hurts",
    body: "Stop the exercise. Sit down. Contact your clinic if pain is sudden or severe.",
  },
  {
    title: "Video visits",
    body: "Use a tablet or computer for the best view. Allow camera and microphone. If video fails, call the clinic number on your appointment card.",
  },
  {
    title: "If text looks small",
    body: "This app uses large buttons and clear labels. Family helpers can tap buttons for the patient.",
  },
  {
    title: "Family helpers",
    body: "You may tap buttons for the patient. Do not change the prescribed plan without the therapist.",
  },
  {
    title: "Emergency",
    body: "Stride is not for emergencies. Call your local emergency number if someone is in danger.",
    emergency: true,
  },
];

export function HelpScreen() {
  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>Support</Text>
      <Text style={styles.h1}>Help centre</Text>
      <Text style={styles.sub}>Simple answers for patients and family helpers.</Text>

      {TOPICS.map((topic) => (
        <View key={topic.title} style={[styles.card, topic.emergency && styles.cardDanger]}>
          <Text style={styles.cardTitle}>{topic.title}</Text>
          <Text style={styles.cardBody}>{topic.body}</Text>
          {topic.emergency ? (
            <Pressable style={styles.btnOutline} onPress={() => Linking.openURL("tel:112")}>
              <Text style={styles.btnOutlineText}>Call emergency services</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 24 },
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
  cardDanger: { backgroundColor: C.dangerSoft, borderColor: "#FECACA" },
  cardTitle: { fontSize: 18, fontWeight: "800", color: C.text, marginBottom: 8 },
  cardBody: { fontSize: 16, color: C.text, lineHeight: 24 },
  btnOutline: {
    marginTop: 14,
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: C.danger,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surface,
  },
  btnOutlineText: { color: C.danger, fontWeight: "700", fontSize: 16 },
});
