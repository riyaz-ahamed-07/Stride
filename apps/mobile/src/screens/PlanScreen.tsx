import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Plan } from "../types";
import { C } from "../theme";

type Props = {
  plan: Plan | null;
  error: string;
  onStartExercise: (exerciseId: string) => void;
};

export function PlanScreen({ plan, error, onStartExercise }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>Your plan</Text>
      <Text style={styles.h1}>Home exercises</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!plan ? (
        <View style={styles.card}>
          <Text style={styles.body}>
            No active plan yet. Your physiotherapist will assign exercises here.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>{plan.title}</Text>
            <Text style={styles.heroMeta}>
              {plan.items.length} exercises · Complete at your own pace
            </Text>
          </View>
          {plan.items.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Guided movement</Text>
              </View>
              <Text style={styles.exerciseName}>{item.exercise_name}</Text>
              <Text style={styles.body}>{item.instructions}</Text>
              <Text style={styles.meta}>
                {item.target_sets} sets × {item.target_repetitions} reps
              </Text>
              <View style={styles.alert}>
                <Text style={styles.alertTitle}>Stop if you feel pain</Text>
                <Text style={styles.alertBody}>{item.safety_notes}</Text>
              </View>
              <Pressable style={styles.btnPrimary} onPress={() => onStartExercise(item.id)}>
                <Text style={styles.btnPrimaryText}>Start exercise</Text>
              </Pressable>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 24 },
  eyebrow: { fontSize: 14, color: C.muted, marginBottom: 4 },
  h1: { fontSize: 28, fontWeight: "800", color: C.text, marginBottom: 20 },
  error: { color: C.danger, fontWeight: "600", marginBottom: 12 },
  heroCard: {
    backgroundColor: C.mintGrad,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  heroTitle: { fontSize: 20, fontWeight: "800", color: C.text, marginBottom: 6 },
  heroMeta: { fontSize: 15, color: C.muted },
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: C.warningSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
  },
  badgeText: { fontSize: 13, fontWeight: "700", color: "#B45309" },
  exerciseName: { fontSize: 20, fontWeight: "800", color: C.text, marginBottom: 8 },
  body: { fontSize: 16, color: C.text, lineHeight: 24, marginBottom: 10 },
  meta: { fontSize: 14, color: C.muted, marginBottom: 12, fontWeight: "600" },
  alert: {
    backgroundColor: C.dangerSoft,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: C.danger,
    marginBottom: 16,
  },
  alertTitle: { fontWeight: "800", color: C.danger, marginBottom: 4, fontSize: 15 },
  alertBody: { fontSize: 14, color: C.text, lineHeight: 20 },
  btnPrimary: {
    minHeight: 54,
    backgroundColor: C.primary,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: { color: "white", fontSize: 17, fontWeight: "700" },
});
