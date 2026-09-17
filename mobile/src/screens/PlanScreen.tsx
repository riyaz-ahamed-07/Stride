import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Play } from "lucide-react-native";
import { AccountGearButton } from "../components/AccountGearButton";
import {
  DAY_LABELS,
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
import { C, colors, radius, shadow } from "../theme";

type Props = {
  plan: Plan | null;
  sessions: ExerciseSession[];
  therapist: TherapistContact | null;
  loading: boolean;
  refreshing?: boolean;
  error: string;
  onStartExercise: (exerciseId: string) => void;
  onOpenAccount: () => void;
  onRefresh?: () => void;
  onRetry?: () => void;
};

function ExerciseRow({
  item,
  done,
  onStart,
}: {
  item: PlanItem;
  done: boolean;
  onStart: () => void;
}) {
  const supervised = item.session_type === "supervised";
  return (
    <Pressable
      style={[styles.row, done && styles.rowDone]}
      onPress={supervised ? undefined : onStart}
      disabled={supervised}
    >
      <View style={[styles.playDot, done && styles.playDotDone]}>
        {done ? (
          <Text style={styles.check}>✓</Text>
        ) : (
          <Play
            size={12}
            color={colors.brand.primary}
            fill={colors.brand.primary}
          />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.exerciseName} numberOfLines={1}>
          {item.exercise_name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {supervised ? "In clinic" : "Home"} · {dosageLabel(item)}
        </Text>
      </View>
      {!supervised ? (
        <Text style={styles.startLabel}>{done ? "Again" : "Start"}</Text>
      ) : (
        <Text style={styles.clinicLabel}>Clinic</Text>
      )}
    </Pressable>
  );
}

export function PlanScreen({
  plan,
  sessions,
  therapist,
  loading,
  refreshing = false,
  error,
  onStartExercise,
  onOpenAccount,
  onRefresh,
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
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
    >
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1} numberOfLines={1}>
            {plan?.title ?? "Plan"}
          </Text>
          {plan ? (
            <Text style={styles.sub} numberOfLines={1}>
              Week {weekFilter}
              {therapist ? ` · ${therapist.full_name}` : ""}
            </Text>
          ) : null}
        </View>
        <AccountGearButton onOpenAccount={onOpenAccount} />
      </View>

      {loading ? <Text style={styles.body}>Loading…</Text> : null}
      {error ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.error}>{error}</Text>
          {onRetry ? (
            <Pressable style={styles.btnPrimary} onPress={onRetry}>
              <Text style={styles.btnPrimaryText}>Retry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {!loading && !error && !plan ? (
        <View style={styles.emptyCard}>
          <Text style={styles.body}>No plan assigned yet</Text>
        </View>
      ) : null}

      {plan ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weekRow}
          >
            {weeks.map((week) => {
              const active = weekFilter === week;
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
                    W{week}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {daySections.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.body}>No exercises this week</Text>
            </View>
          ) : (
            daySections.map((section) => (
              <View key={String(section.key)} style={styles.dayBlock}>
                <Text style={styles.dayHeading}>{section.label}</Text>
                <View style={styles.dayList}>
                  {section.items.map((item) => (
                    <ExerciseRow
                      key={item.id}
                      item={item}
                      done={isExerciseCompleted(item.id, sessions)}
                      onStart={() => onStartExercise(item.id)}
                    />
                  ))}
                </View>
              </View>
            ))
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 110, gap: 12 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  h1: {
    fontSize: 28,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.5,
  },
  sub: { fontSize: 13, color: C.muted, marginTop: 2 },
  error: { color: C.danger, fontWeight: "600", marginBottom: 12 },
  weekRow: { gap: 8, paddingBottom: 4 },
  weekChip: {
    minWidth: 48,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.sm,
  },
  weekChipActive: { backgroundColor: C.primary },
  weekChipText: { fontSize: 14, fontWeight: "800", color: C.text },
  weekChipTextActive: { color: "white" },
  dayBlock: { gap: 8 },
  dayHeading: {
    fontSize: 13,
    fontWeight: "800",
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  dayList: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 14,
    ...shadow.sm,
  },
  rowDone: {
    backgroundColor: C.successSoft,
    shadowOpacity: 0,
    elevation: 0,
  },
  playDot: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: colors.brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  playDotDone: { backgroundColor: C.success },
  check: { color: "#fff", fontWeight: "800", fontSize: 14 },
  exerciseName: { fontSize: 15, fontWeight: "800", color: C.text },
  meta: { fontSize: 12, color: C.muted, marginTop: 2 },
  startLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.brand.primary,
  },
  clinicLabel: { fontSize: 12, fontWeight: "700", color: C.muted },
  body: { fontSize: 15, color: C.text },
  emptyCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 18,
    ...shadow.sm,
  },
  btnPrimary: {
    minHeight: 48,
    backgroundColor: C.primary,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: { color: "white", fontSize: 15, fontWeight: "700" },
});
