import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { EmptyState, ErrorState, LoadingBlock } from "../components/AsyncState";
import type { Appointment } from "../types";
import { C, shadow } from "../theme";

type Props = {
  appointments: Appointment[];
  loading?: boolean;
  error: string;
  onRetry?: () => void;
  onBack: () => void;
  onJoinConsult: (appointmentId: string) => void;
};

export function AppointmentsScreen({
  appointments,
  loading = false,
  error,
  onRetry,
  onBack,
  onJoinConsult,
}: Props) {
  return (
    <ScrollView
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      <Pressable onPress={onBack} hitSlop={8}>
        <Text style={styles.back}>← Back</Text>
      </Pressable>
      <Text style={styles.h1}>Visits</Text>

      {loading ? <LoadingBlock label="Loading…" /> : null}
      {error ? <ErrorState message={error} onRetry={onRetry} /> : null}

      {!loading && !error && appointments.length === 0 ? (
        <EmptyState
          title="No visits yet"
          body="Your physiotherapist will schedule them."
          actionLabel="Back"
          onAction={onBack}
        />
      ) : null}

      {!loading && !error
        ? appointments.map((item) => {
            const when = new Date(item.scheduled_at);
            const day = when.toLocaleDateString(undefined, {
              weekday: "short",
              day: "numeric",
              month: "short",
            });
            const time = when.toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            });
            const canJoin = item.status === "scheduled";
            return (
              <Pressable
                key={item.id}
                style={styles.card}
                onPress={
                  canJoin ? () => onJoinConsult(item.id) : undefined
                }
                disabled={!canJoin}
              >
                <View style={styles.dateCol}>
                  <Text style={styles.day}>{day}</Text>
                  <Text style={styles.time}>{time}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.reason ?? "Consultation"}
                  </Text>
                  <Text style={styles.status}>
                    {canJoin ? "Scheduled" : item.status}
                  </Text>
                </View>
                {canJoin ? (
                  <View style={styles.joinPill}>
                    <Text style={styles.joinText}>Join</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })
        : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 110, gap: 10 },
  back: { color: C.primary, fontWeight: "700", fontSize: 15 },
  h1: {
    fontSize: 30,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 14,
    ...shadow.sm,
  },
  dateCol: { minWidth: 72 },
  day: { fontSize: 13, fontWeight: "800", color: C.text },
  time: { fontSize: 12, color: C.muted, marginTop: 2 },
  title: { fontSize: 15, fontWeight: "800", color: C.text },
  status: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
    textTransform: "capitalize",
  },
  joinPill: {
    backgroundColor: C.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  joinText: { color: "#fff", fontWeight: "800", fontSize: 13 },
});
