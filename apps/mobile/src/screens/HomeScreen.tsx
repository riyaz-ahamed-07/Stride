import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Appointment, Plan } from "../types";
import { C } from "../theme";

type Props = {
  fullName: string;
  plan: Plan | null;
  appointments: Appointment[];
  banner: string;
  onSignOut: () => void;
  onOpenAppointments: () => void;
  onOpenConsult: (appointmentId: string) => void;
  onStartExercise: (exerciseId: string) => void;
  onSeeAllExercises: () => void;
};

export function HomeScreen({
  fullName,
  plan,
  appointments,
  banner,
  onSignOut,
  onOpenAppointments,
  onOpenConsult,
  onStartExercise,
  onSeeAllExercises,
}: Props) {
  const initials = fullName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const nextAppt = appointments.find((a) => a.status === "scheduled") ?? appointments[0];
  const progress = plan ? 75 : 0;

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View style={styles.greetRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View>
            <Text style={styles.greetSub}>Good morning</Text>
            <Text style={styles.greetName}>{fullName}</Text>
          </View>
        </View>
        <Pressable style={styles.iconBtn} onPress={onSignOut}>
          <Text>↪</Text>
        </Pressable>
      </View>

      {plan ? (
        <View style={styles.wellnessCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.wellnessMeta}>Today&apos;s rehabilitation plan</Text>
            <Text style={styles.wellnessTitle}>{plan.title}</Text>
            <View style={styles.vitalRow}>
              <View style={styles.vitalPill}>
                <Text style={styles.vitalText}>🦵 {plan.items.length} exercises</Text>
              </View>
            </View>
          </View>
          <View style={styles.ring}>
            <Text style={styles.ringText}>{progress}%</Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Your plan is coming</Text>
          <Text style={styles.emptyBody}>Your physiotherapist will assign home exercises here.</Text>
        </View>
      )}

      {banner ? (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>{banner}</Text>
        </View>
      ) : null}

      <View style={styles.quickGrid}>
        <Pressable style={styles.quickItem} onPress={onSeeAllExercises}>
          <Text style={styles.quickIcon}>🏃</Text>
          <Text style={styles.quickLabel}>Exercises</Text>
        </Pressable>
        <Pressable style={styles.quickItem} onPress={onOpenAppointments}>
          <Text style={styles.quickIcon}>📅</Text>
          <Text style={styles.quickLabel}>Appointments</Text>
        </Pressable>
        <Pressable
          style={styles.quickItem}
          onPress={() => onOpenConsult(nextAppt?.id ?? "demo")}
        >
          <Text style={styles.quickIcon}>📹</Text>
          <Text style={styles.quickLabel}>Video visit</Text>
        </Pressable>
      </View>

      {nextAppt ? (
        <View style={styles.apptCard}>
          <Text style={styles.sectionTitle}>Upcoming appointment</Text>
          <Text style={styles.apptName}>Physiotherapy video visit</Text>
          <Text style={styles.apptDetail}>
            {new Date(nextAppt.scheduled_at).toLocaleString()} · {nextAppt.reason ?? "Follow-up"}
          </Text>
          <Pressable style={styles.btnTeal} onPress={() => onOpenConsult(nextAppt.id)}>
            <Text style={styles.btnTealText}>Join consultation</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Today&apos;s exercises</Text>
        <Pressable onPress={onSeeAllExercises}>
          <Text style={styles.link}>See all</Text>
        </Pressable>
      </View>

      {plan?.items.slice(0, 3).map((item) => (
        <Pressable key={item.id} style={styles.taskCard} onPress={() => onStartExercise(item.id)}>
          <View style={styles.taskIcon}>
            <Text style={{ fontSize: 22 }}>🦵</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.taskTitle}>{item.exercise_name}</Text>
            <Text style={styles.taskMeta}>
              {item.target_sets} sets × {item.target_repetitions} reps
            </Text>
            <Text style={styles.taskCta}>Start movement →</Text>
          </View>
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>Pending</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 24 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greetRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.blueGrad,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  avatarText: { fontWeight: "800", fontSize: 18, color: C.primary },
  greetSub: { fontSize: 14, color: C.muted },
  greetName: { fontSize: 22, fontWeight: "800", color: C.text },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  wellnessCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.mintGrad,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  wellnessMeta: { fontSize: 13, color: C.muted, marginBottom: 4 },
  wellnessTitle: { fontSize: 20, fontWeight: "800", color: C.text, marginBottom: 10 },
  vitalRow: { flexDirection: "row", gap: 8 },
  vitalPill: {
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  vitalText: { fontSize: 13, fontWeight: "600" },
  ring: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 6,
    borderColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  ringText: { fontWeight: "800", fontSize: 15, color: C.teal },
  emptyCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: C.text, marginBottom: 8 },
  emptyBody: { fontSize: 15, color: C.muted, lineHeight: 22 },
  successBanner: {
    backgroundColor: C.successSoft,
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  successText: { color: C.success, fontWeight: "600", fontSize: 15 },
  quickGrid: { flexDirection: "row", gap: 10, marginBottom: 20 },
  quickItem: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    gap: 6,
  },
  quickIcon: { fontSize: 24 },
  quickLabel: { fontSize: 13, fontWeight: "700", color: C.text, textAlign: "center" },
  apptCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  apptName: { fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 6 },
  apptDetail: { fontSize: 14, color: C.muted, marginBottom: 14, lineHeight: 20 },
  btnTeal: {
    minHeight: 48,
    backgroundColor: C.teal,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  btnTealText: { color: "white", fontWeight: "700", fontSize: 16 },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  link: { color: C.primary, fontWeight: "700", fontSize: 15 },
  taskCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  taskIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.blueGrad,
    alignItems: "center",
    justifyContent: "center",
  },
  taskTitle: { fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 4 },
  taskMeta: { fontSize: 14, color: C.muted, marginBottom: 8 },
  taskCta: { fontSize: 14, fontWeight: "700", color: C.primary },
  pendingBadge: {
    backgroundColor: C.warningSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pendingText: { fontSize: 12, fontWeight: "700", color: "#B45309" },
});
