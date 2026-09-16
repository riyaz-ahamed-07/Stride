import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AccountGearButton } from "../components/AccountGearButton";
import {
  dosageLabel,
  filterTodayHome,
  firstIncompleteToday,
  greeting,
  isExerciseCompleted,
  planWeek,
  upcomingScheduled,
} from "../lib/planSchedule";
import type {
  Appointment,
  ExerciseSession,
  Plan,
  TherapistContact,
} from "../types";
import { C } from "../theme";

type Props = {
  fullName: string;
  plan: Plan | null;
  sessions: ExerciseSession[];
  appointments: Appointment[];
  therapist: TherapistContact | null;
  loading: boolean;
  error: string;
  banner: string;
  onRetry: () => void;
  onOpenAccount: () => void;
  onOpenAppointments: () => void;
  onOpenConsult: (appointmentId: string) => void;
  onStartExercise: (exerciseId: string) => void;
  onSeeAllExercises: () => void;
  onOpenProgress: () => void;
};

export function HomeScreen({
  fullName,
  plan,
  sessions,
  appointments,
  therapist,
  loading,
  error,
  banner,
  onRetry,
  onOpenAccount,
  onOpenAppointments,
  onOpenConsult,
  onStartExercise,
  onSeeAllExercises,
  onOpenProgress,
}: Props) {
  const week = plan ? planWeek(plan.start_date, plan.duration_weeks) : 1;
  const today = plan ? filterTodayHome(plan, week) : [];
  const nextUp = plan ? firstIncompleteToday(plan, sessions) : null;
  const nextAppt = upcomingScheduled(appointments);
  const remaining = today.filter(
    (item) => !isExerciseCompleted(item.id, sessions),
  ).length;

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>{greeting()}</Text>
          <Text style={styles.name}>{fullName || "Welcome"}</Text>
        </View>
        <AccountGearButton onOpenAccount={onOpenAccount} />
      </View>

      {loading ? (
        <Text style={styles.status}>Loading your rehabilitation…</Text>
      ) : null}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.primary} onPress={onRetry}>
            <Text style={styles.primaryText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {banner ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{banner}</Text>
        </View>
      ) : null}

      {!loading && !error && !plan ? (
        <View style={styles.section}>
          <Text style={styles.h2}>No rehabilitation plan yet</Text>
          <Text style={styles.body}>
            Your physiotherapist has not assigned a rehabilitation plan. Check back
            after your next appointment.
          </Text>
        </View>
      ) : null}

      {!loading && plan ? (
        <>
          <Text style={styles.program}>
            {plan.title}
            {plan.duration_weeks
              ? ` · Week ${week} of ${plan.duration_weeks}`
              : ""}
            {therapist ? ` · Prescribed by ${therapist.full_name}` : ""}
          </Text>

          <View style={styles.section}>
            <Text style={styles.h2}>Today</Text>
            {today.length === 0 ? (
              <Text style={styles.body}>
                No home exercises are scheduled for today. Open your plan to
                review other days, or rest as advised.
              </Text>
            ) : remaining === 0 ? (
              <Text style={styles.body}>
                You have completed today's home exercises.
              </Text>
            ) : (
              <Text style={styles.lede}>
                {remaining === 1
                  ? "One home exercise remaining."
                  : `${remaining} home exercises remaining.`}
              </Text>
            )}

            {today.map((item) => {
              const done = isExerciseCompleted(item.id, sessions);
              return (
                <View key={item.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exercise}>{item.exercise_name}</Text>
                    <Text style={styles.meta}>{dosageLabel(item)}</Text>
                  </View>
                  <Text style={[styles.flag, done && styles.flagDone]}>
                    {done ? "Completed" : "To do"}
                  </Text>
                </View>
              );
            })}

            {nextUp ? (
              <Pressable
                style={styles.primary}
                onPress={() => onStartExercise(nextUp.id)}
              >
                <Text style={styles.primaryText}>
                  Begin today's rehabilitation
                </Text>
              </Pressable>
            ) : today.length === 0 ? (
              <Pressable style={styles.primary} onPress={onSeeAllExercises}>
                <Text style={styles.primaryText}>Open your plan</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.primary} onPress={onOpenProgress}>
                <Text style={styles.primaryText}>View progress</Text>
              </Pressable>
            )}

            {today.length > 0 ? (
              <Text style={styles.meta}>
                Today’s completion (system-derived): {today.length - remaining}{" "}
                of {today.length} home exercises.
              </Text>
            ) : null}
          </View>
        </>
      ) : null}

      {!loading && !error ? (
        <>
          <View style={styles.section}>
            <Text style={styles.h2}>Next appointment</Text>
            {nextAppt ? (
              <>
                <Text style={styles.body}>
                  {new Date(nextAppt.scheduled_at).toLocaleString(undefined, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {nextAppt.reason ? ` · ${nextAppt.reason}` : ""}
                </Text>
                <Pressable onPress={() => onOpenConsult(nextAppt.id)}>
                  <Text style={styles.link}>Join consultation</Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.body}>No appointment is currently scheduled.</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.h2}>Your physiotherapist</Text>
            {therapist ? (
              <>
                <Text style={styles.body}>
                  {therapist.full_name}
                  {therapist.clinic_name ? ` · ${therapist.clinic_name}` : ""}
                </Text>
                {therapist.phone ? (
                  <Text style={styles.meta}>{therapist.phone}</Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.body}>
                Physiotherapist details are not available yet. Ask the clinic if
                you need to confirm who is supervising your plan.
              </Text>
            )}
            <Pressable onPress={onOpenAppointments} style={{ marginTop: 12 }}>
              <Text style={styles.link}>Appointments</Text>
            </Pressable>
            <Pressable onPress={onOpenProgress} style={{ marginTop: 12 }}>
              <Text style={styles.link}>View progress</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, paddingBottom: 32 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    gap: 12,
  },
  kicker: { fontSize: 16, fontWeight: "600", color: C.muted, marginBottom: 4 },
  name: { fontSize: 32, fontWeight: "800", color: C.text, letterSpacing: -0.4 },
  status: { fontSize: 17, color: C.muted, marginBottom: 20 },
  errorBox: {
    backgroundColor: C.dangerSoft,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  errorText: {
    color: C.danger,
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 12,
  },
  banner: {
    backgroundColor: C.successSoft,
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  bannerText: { color: C.success, fontWeight: "600", fontSize: 15 },
  program: { fontSize: 17, lineHeight: 24, color: C.text, marginBottom: 28 },
  section: { marginBottom: 36 },
  h2: { fontSize: 22, fontWeight: "800", color: C.text, marginBottom: 12 },
  lede: { fontSize: 17, color: C.muted, marginBottom: 16, lineHeight: 24 },
  body: { fontSize: 17, color: C.text, lineHeight: 26, marginBottom: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  exercise: { fontSize: 18, fontWeight: "700", color: C.text, marginBottom: 4 },
  meta: { fontSize: 15, color: C.muted },
  flag: { fontSize: 13, fontWeight: "700", color: C.muted, marginTop: 4 },
  flagDone: { color: C.teal },
  primary: {
    minHeight: 56,
    backgroundColor: C.primary,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  primaryText: { color: "white", fontSize: 17, fontWeight: "700" },
  link: { color: C.primary, fontWeight: "700", fontSize: 16, marginTop: 6 },
});
