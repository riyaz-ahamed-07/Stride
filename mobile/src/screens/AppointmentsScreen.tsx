import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { EmptyState, ErrorState, LoadingBlock } from "../components/AsyncState";
import type { Appointment } from "../types";
import { C } from "../theme";

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
      <Pressable onPress={onBack}>
        <Text style={styles.back}>← Home</Text>
      </Pressable>
      <Text style={styles.eyebrow}>Schedule</Text>
      <Text style={styles.h1}>Appointments</Text>
      <Text style={styles.intro}>
        Join video consultations from your phone or tablet. Booking is managed
        by your physiotherapist in the clinic portal.
      </Text>

      {loading ? <LoadingBlock label="Loading appointments…" /> : null}
      {error ? <ErrorState message={error} onRetry={onRetry} /> : null}

      {!loading && !error && appointments.length === 0 ? (
        <EmptyState
          title="No appointments yet"
          body="When your physiotherapist schedules an appointment, it will appear here so you can join the consultation."
          actionLabel="Back to home"
          onAction={onBack}
        />
      ) : null}

      {!loading && !error
        ? appointments.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.avatar}>PT</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Physiotherapy visit</Text>
                  <Text style={styles.detail}>
                    {new Date(item.scheduled_at).toLocaleString()}
                  </Text>
                  <Text style={styles.detail}>
                    {item.reason ?? "General follow-up"}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                {item.status === "scheduled" ? (
                  <>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Scheduled</Text>
                    </View>
                    <Pressable
                      style={styles.btnPrimary}
                      onPress={() => onJoinConsult(item.id)}
                    >
                      <Text style={styles.btnPrimaryText}>Join video call</Text>
                    </Pressable>
                  </>
                ) : (
                  <View style={styles.badgeSuccess}>
                    <Text style={styles.badgeSuccessText}>{item.status}</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        : null}
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
  row: { flexDirection: "row", gap: 14, marginBottom: 14 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    textAlign: "center",
    lineHeight: 40,
    fontSize: 14,
    fontWeight: "800",
    color: C.primary,
    backgroundColor: C.blueGrad,
  },
  title: { fontSize: 17, fontWeight: "800", color: C.text, marginBottom: 6 },
  detail: { fontSize: 14, color: C.muted, lineHeight: 20 },
  actions: { gap: 10 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: C.warningSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { fontSize: 12, fontWeight: "700", color: "#B45309" },
  badgeSuccess: {
    alignSelf: "flex-start",
    backgroundColor: C.successSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeSuccessText: { fontSize: 12, fontWeight: "700", color: C.success },
  btnPrimary: {
    minHeight: 48,
    backgroundColor: C.primary,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: { color: "white", fontWeight: "700", fontSize: 16 },
});
