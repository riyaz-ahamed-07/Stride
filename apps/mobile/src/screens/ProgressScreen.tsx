import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { EmptyState, ErrorState, LoadingBlock } from "../components/AsyncState";
import {
  confirmedObservationTrends,
  formatObservationWhen,
  latestPatientReported,
  planAdherence,
  todayAdherence,
  type ObservationLike,
} from "../lib/rehabProgress";
import type { ExerciseSession, Plan } from "../types";
import { C } from "../theme";

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

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      <Pressable onPress={onBack}>
        <Text style={styles.back}>← Home</Text>
      </Pressable>
      <Text style={styles.eyebrow}>Your recovery record</Text>
      <Text style={styles.h1}>Progress</Text>
      <Text style={styles.intro}>
        Session completion is system-derived. Confirmed movement numbers only
        appear after your physiotherapist reviews them.
      </Text>

      {loading ? <LoadingBlock label="Loading progress…" /> : null}
      {error ? <ErrorState message={error} onRetry={onRetry} /> : null}

      {!loading && !error && !plan ? (
        <EmptyState
          title="No plan yet"
          body="Progress appears after your physiotherapist assigns a rehabilitation plan and you complete sessions."
          actionLabel="Open your plan"
          onAction={onOpenPlan}
        />
      ) : null}

      {!loading && !error && plan && adherence ? (
        <View style={styles.card}>
          <Text style={styles.kicker}>System-derived</Text>
          <Text style={styles.cardTitle}>Exercise completion</Text>
          <Text style={styles.stat}>
            {adherence.completed} / {adherence.prescribed}
          </Text>
          <Text style={styles.body}>{adherence.label}</Text>
          {today ? <Text style={styles.meta}>{today.label}</Text> : null}
        </View>
      ) : null}

      {!loading && !error ? (
        <>
          <View style={styles.card}>
            <Text style={styles.kicker}>Therapist-confirmed</Text>
            <Text style={styles.cardTitle}>Reviewed movement observations</Text>
            {trends.length === 0 ? (
              <Text style={styles.body}>
                No confirmed observations yet. After your physiotherapist
                approves a session metric, it will show here.
              </Text>
            ) : (
              trends.map((trend) => (
                <View key={trend.key} style={styles.trend}>
                  <Text style={styles.trendTitle}>
                    {trend.exerciseName} · {trend.metric}
                  </Text>
                  <Text style={styles.statSm}>
                    {trend.previous != null && trend.current != null
                      ? `${trend.previous} → ${trend.current}`
                      : String(trend.current ?? "—")}
                  </Text>
                  <Text style={styles.meta}>
                    {formatObservationWhen(
                      trend.points[trend.points.length - 1]?.when,
                    )}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.kicker}>Patient-reported</Text>
            <Text style={styles.cardTitle}>Latest session notes</Text>
            {reported ? (
              <>
                <Text style={styles.body}>
                  Reported repetitions: {reported.reported_repetitions ?? "—"}
                </Text>
                <Text style={styles.meta}>
                  {reported.patient_notes || "No written notes."}
                </Text>
                <Text style={styles.meta}>
                  {formatObservationWhen(
                    reported.ended_at || reported.started_at,
                  )}
                </Text>
              </>
            ) : (
              <Text style={styles.body}>
                No patient-reported session notes yet.
              </Text>
            )}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 32 },
  back: { color: C.primary, fontWeight: "700", marginBottom: 16, fontSize: 16 },
  eyebrow: { fontSize: 14, color: C.muted, marginBottom: 4 },
  h1: { fontSize: 28, fontWeight: "800", color: C.text, marginBottom: 10 },
  intro: { fontSize: 16, color: C.muted, lineHeight: 24, marginBottom: 20 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "700",
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.text,
    marginBottom: 10,
  },
  body: { fontSize: 16, color: C.text, lineHeight: 24, marginBottom: 6 },
  meta: { fontSize: 14, color: C.muted, lineHeight: 20, marginTop: 4 },
  stat: { fontSize: 32, fontWeight: "800", color: C.primary, marginBottom: 6 },
  statSm: { fontSize: 22, fontWeight: "800", color: C.text, marginBottom: 4 },
  trend: {
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  trendTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
    marginBottom: 4,
  },
});
