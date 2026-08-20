import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { PlanItem } from "../types";
import { C } from "../theme";

type Props = {
  item: PlanItem | null;
  saving: boolean;
  error: string;
  onBack: () => void;
  onFinish: (reps: number, notes: string) => void;
};

export function MoveScreen({ item, saving, error, onBack, onFinish }: Props) {
  const [reps, setReps] = useState(item ? String(item.target_repetitions) : "8");
  const [notes, setNotes] = useState("");

  if (!item) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Exercise not found.</Text>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <Pressable onPress={onBack}>
        <Text style={styles.back}>← Exercises</Text>
      </Pressable>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Guided movement</Text>
      </View>
      <Text style={styles.h1}>{item.exercise_name}</Text>
      <Text style={styles.body}>{item.instructions}</Text>
      <View style={styles.alert}>
        <Text style={styles.alertTitle}>Stop immediately if you feel pain</Text>
        <Text style={styles.alertBody}>
          Dizziness or unsteadiness means stop and rest. {item.safety_notes}
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Log your session</Text>
        <Text style={styles.label}>How many repetitions did you complete?</Text>
        <TextInput
          style={styles.input}
          value={reps}
          onChangeText={setReps}
          keyboardType="number-pad"
        />
        <Text style={styles.label}>Notes for your therapist (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="e.g. Last two were slower"
          placeholderTextColor={C.muted}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          style={[styles.btnPrimary, saving && styles.btnDisabled]}
          onPress={() => onFinish(Number(reps), notes)}
          disabled={saving}
        >
          <Text style={styles.btnPrimaryText}>{saving ? "Saving…" : "I have finished"}</Text>
        </Pressable>
        <Pressable style={styles.btnOutline} onPress={onBack}>
          <Text style={styles.btnOutlineText}>Not today</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 32 },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  missingText: { fontSize: 17, color: C.muted, marginBottom: 12 },
  back: { color: C.primary, fontWeight: "700", marginBottom: 16, fontSize: 16 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: C.warningSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  badgeText: { fontSize: 13, fontWeight: "700", color: "#B45309" },
  h1: { fontSize: 28, fontWeight: "800", color: C.text, marginBottom: 12 },
  body: { fontSize: 17, color: C.text, lineHeight: 26, marginBottom: 16 },
  alert: {
    backgroundColor: C.dangerSoft,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: C.danger,
    marginBottom: 20,
  },
  alertTitle: { fontWeight: "800", color: C.danger, marginBottom: 6, fontSize: 16 },
  alertBody: { fontSize: 15, color: C.text, lineHeight: 22 },
  formCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  formTitle: { fontSize: 20, fontWeight: "800", color: C.text, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: C.text, marginBottom: 8, marginTop: 8 },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    fontSize: 17,
  },
  textArea: { minHeight: 96, paddingTop: 14, textAlignVertical: "top" },
  error: { color: C.danger, fontWeight: "600", marginTop: 10 },
  btnPrimary: {
    minHeight: 54,
    backgroundColor: C.primary,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  btnDisabled: { opacity: 0.7 },
  btnPrimaryText: { color: "white", fontSize: 17, fontWeight: "700" },
  btnOutline: {
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    backgroundColor: C.surface,
  },
  btnOutlineText: { color: C.text, fontWeight: "700", fontSize: 16 },
});
