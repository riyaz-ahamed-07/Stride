import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AccountGearButton } from "../components/AccountGearButton";
import {
  DAY_LABELS,
  dayLabel,
  dosageLabel,
  groupByDay,
  isExerciseCompleted,
  planWeek,
  weekOptions,
} from "../lib/planSchedule";
import type {
  ExerciseSession,
  Plan,
  PlanItem,
  TherapistContact,
} from "../types";
import { C } from "../theme";

type Props = {
  plan: Plan | null;
  sessions: ExerciseSession[];
  therapist: TherapistContact | null;
  loading: boolean;
  error: string;
  onStartExercise: (exerciseId: string) => void;
  onOpenAccount: () => void;
  onRetry?: () => void;
};

function ExerciseCard({
  item,
  done,
  onStart,
}: {
  item: PlanItem;
  done: boolean;
  onStart: () => void;
}) {
  const sessionLabel =
    item.session_type === "supervised" ? "Supervised" : "Home";
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{sessionLabel}</Text>
        </View>
        {done ? (
          <View style={styles.donePill}>
            <Text style={styles.donePillText}>Completed</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.dayMeta}>
        Week {item.week_number} · {dayLabel(item.day_of_week)}
      </Text>
      <Text style={styles.exerciseName}>{item.exercise_name}</Text>
      <Text style={styles.body} numberOfLines={4}>
        {item.instructions}
      </Text>
      <Text style={styles.meta}>{dosageLabel(item)}</Text>
      <View style={styles.alert}>
        <Text style={styles.alertTitle}>Stop if you feel pain</Text>
        <Text style={styles.alertBody}>{item.safety_notes}</Text>
      </View>
      <Pressable style={styles.btnPrimary} onPress={onStart}>
        <Text style={styles.btnPrimaryText}>
          {done ? "Do again" : "Start exercise"}
        </Text>
      </Pressable>
    </View>
  );
}

export function PlanScreen({
  plan,
  sessions,
  therapist,
  loading,
  error,
  onStartExercise,
  onOpenAccount,
  onRetry,
}: Props) {
  const defaultWeek = plan ? planWeek(plan.start_date, plan.duration_weeks) : 1;
  const [weekFilter, setWeekFilter] = useState<number>(defaultWeek);

  useEffect(() => {
    if (plan) setWeekFilter(planWeek(plan.start_date, plan.duration_weeks));
  }, [plan]);

  const weeks = useMemo(() => (plan ? weekOptions(plan) : [1]), [plan]);

  const weekItems = useMemo(() => {
    if (!plan) return [];
    return plan.items.filter((item) => item.week_number === weekFilter);
  }, [plan, weekFilter]);

  const grouped = useMemo(() => groupByDay(weekItems), [weekItems]);

  const daySections = useMemo(() => {
    const order: Array<number | "any"> = [0, 1, 2, 3, 4, 5, 6, "any"];
    return order
      .filter((key) => grouped.has(key))
      .map((key) => ({
        key,
        label: key === "any" ? "Any day" : DAY_LABELS[key as number],
        items: grouped.get(key) ?? [],
      }));
  }, [grouped]);

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <View style={{ flex: 1 }} />
        <AccountGearButton onOpenAccount={onOpenAccount} />
      </View>
      <Text style={styles.eyebrow}>Rehabilitation plan</Text>
      <Text style={styles.h1}>{plan?.title ?? "Your plan"}</Text>

      {loading ? <Text style={styles.body}>Loading your rehabilitation plan…</Text> : null}
      {error ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.error}>{error}</Text>
          {onRetry ? (
            <Pressable style={styles.btnPrimary} onPress={onRetry}>
              <Text style={styles.btnPrimaryText}>Try again</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {!loading && !error && !plan ? (
        <View style={styles.card}>
          <Text style={styles.body}>
            No active rehabilitation plan yet. Your physiotherapist will assign exercises
            here.
          </Text>
        </View>
      ) : null}

      {plan ? (
        <>
          <Text style={styles.heroMeta}>
            {therapist
              ? `Prescribed by ${therapist.full_name}`
              : "Prescribing physiotherapist details are not available."}
            {plan.duration_weeks ? ` · ${plan.duration_weeks} weeks` : ""}
          </Text>
          {plan.goal ? <Text style={styles.heroGoal}>{plan.goal}</Text> : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weekRow}
          >
            {weeks.map((week) => {
              const active = weekFilter === week;
              const isCurrent = week === defaultWeek;
              return (
                <Pressable
                  key={week}
                  style={[styles.weekChip, active && styles.weekChipActive]}
                  onPress={() => setWeekFilter(week)}
                >
                  <Text
                    style={[
                      styles.weekChipText,
                      active && styles.weekChipTextActive,
                    ]}
                  >
                    Week {week}
                    {isCurrent ? " · now" : ""}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {daySections.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.body}>
                No exercises assigned for week {weekFilter}.
              </Text>
            </View>
          ) : (
            daySections.map((section) => (
              <View key={String(section.key)} style={styles.dayBlock}>
                <Text style={styles.dayHeading}>{section.label}</Text>
                {section.items.map((item) => (
                  <ExerciseCard
                    key={item.id}
                    item={item}
                    done={isExerciseCompleted(item.id, sessions)}
                    onStart={() => onStartExercise(item.id)}
                  />
                ))}
              </View>
            ))
          )}
        </>
      ) : null}
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
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.text,
    marginBottom: 6,
  },
  heroMeta: { fontSize: 15, color: C.muted, marginBottom: 4 },
  heroGoal: { fontSize: 14, color: C.text, lineHeight: 20, marginTop: 6 },
  weekRow: { gap: 8, paddingBottom: 16 },
  weekChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  weekChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  weekChipText: { fontSize: 14, fontWeight: "700", color: C.text },
  weekChipTextActive: { color: "white" },
  dayBlock: { marginBottom: 8 },
  dayHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: C.text,
    marginBottom: 10,
    marginTop: 4,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: C.warningSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { fontSize: 13, fontWeight: "700", color: "#B45309" },
  donePill: {
    backgroundColor: C.successSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  donePillText: { fontSize: 12, fontWeight: "700", color: C.success },
  dayMeta: { fontSize: 13, color: C.muted, fontWeight: "600", marginBottom: 6 },
  exerciseName: {
    fontSize: 20,
    fontWeight: "800",
    color: C.text,
    marginBottom: 8,
  },
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
  alertTitle: {
    fontWeight: "800",
    color: C.danger,
    marginBottom: 4,
    fontSize: 15,
  },
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
