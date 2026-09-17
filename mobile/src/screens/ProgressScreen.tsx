import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { EmptyState, ErrorState, LoadingBlock } from "../components/AsyncState";
import {
  confirmedObservationTrends,
  latestPatientReported,
  planAdherence,
  todayAdherence,
  type ObservationLike,
} from "../lib/rehabProgress";
import type { ExerciseSession, Plan } from "../types";
import { C, colors, shadow } from "../theme";

type Props = {
  plan: Plan | null;
  sessions: ExerciseSession[];
  observations: ObservationLike[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  onBack: () => void;
  onOpenPlan: () => void;
};

export function ProgressScreen({
  plan,
  sessions,
  observations,
  loading,
  error,
  onRetry,
  onBack,
  onOpenPlan,
}: Props) {
  const adherence = plan ? planAdherence(plan, sessions) : null;
  const today = plan ? todayAdherence(plan, sessions) : null;
  const trends = useMemo(
    () => confirmedObservationTrends(observations),
    [observations],
  );
  const reported = latestPatientReported(sessions);
  const pct =
    adherence && adherence.prescribed > 0
      ? Math.round((adherence.completed / adherence.prescribed) * 100)
      : 0;

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      <Pressable onPress={onBack} hitSlop={8}>
        <Text style={styles.back}>← Back</Text>
      </Pressable>
      <Text style={styles.h1}>Progress</Text>

      {loading ? <LoadingBlock label="Loading…" /> : null}
      {error ? <ErrorState message={error} onRetry={onRetry} /> : null}

      {!loading && !error && !plan ? (
        <EmptyState
          title="No plan yet"
          body="Complete sessions after your plan is assigned."
          actionLabel="Open plan"
          onAction={onOpenPlan}
        />
      ) : null}

      {!loading && !error && plan && adherence ? (
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Completion</Text>
          <Text style={styles.stat}>
            {adherence.completed}
            <Text style={styles.statSlash}> / {adherence.prescribed}</Text>
          </Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${pct}%` }]} />
          </View>
          {today ? (
            <Text style={styles.meta}>Today · {today.label}</Text>
          ) : null}
        </View>
      ) : null}

      {!loading && !error ? (
        <>
          <Text style={styles.section}>Reviewed</Text>
          <View style={styles.card}>
            {trends.length === 0 ? (
              <Text style={styles.muted}>Waiting for therapist review</Text>
            ) : (
              trends.map((trend, index) => (
                <View
                  key={trend.key}
                  style={[styles.trend, index > 0 && styles.trendBorder]}
                >
                  <Text style={styles.trendTitle} numberOfLines={1}>
                    {trend.exerciseName}
                  </Text>
                  <Text style={styles.statSm}>
                    {trend.previous != null && trend.current != null
                      ? `${trend.previous} → ${trend.current}`
                      : String(trend.current ?? "—")}
                  </Text>
                  <Text style={styles.meta}>{trend.metric}</Text>
                </View>
              ))
            )}
          </View>

          <Text style={styles.section}>Your notes</Text>
          <View style={styles.card}>
            {reported ? (
              <>
                <Text style={styles.statSm}>
                  {reported.reported_repetitions ?? "—"} reps
                </Text>
                {reported.patient_notes ? (
                  <Text style={styles.body} numberOfLines={3}>
                    {reported.patient_notes}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.muted}>No notes yet</Text>
            )}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 110, gap: 12 },
  back: { color: C.primary, fontWeight: "700", fontSize: 15 },
  h1: {
    fontSize: 30,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.5,
  },
  hero: {
    backgroundColor: colors.brand.primarySoft,
    borderRadius: 28,
    padding: 20,
    ...shadow.sm,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.brand.primary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  stat: {
    fontSize: 40,
    fontWeight: "800",
    color: C.primary,
    letterSpacing: -1,
  },
  statSlash: { fontSize: 22, color: C.muted, fontWeight: "700" },
  barTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#fff",
    marginTop: 14,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.brand.accent,
  },
  section: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "800",
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 16,
    ...shadow.sm,
  },
  muted: { fontSize: 14, color: C.muted },
  body: { fontSize: 14, color: C.text, lineHeight: 20, marginTop: 6 },
  meta: { fontSize: 12, color: C.muted, marginTop: 6 },
  statSm: { fontSize: 22, fontWeight: "800", color: C.text },
  trend: { paddingVertical: 8 },
  trendBorder: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 4,
    paddingTop: 12,
  },
  trendTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
    marginBottom: 4,
  },
});
