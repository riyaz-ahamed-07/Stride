import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AccountGearButton } from "../components/AccountGearButton";
import type { PatientSummary } from "../api";
import type { Appointment } from "../types";
import { C } from "../theme";

type Props = {
  fullName: string;
  patients: PatientSummary[];
  appointments: Appointment[];
  banner: string;
  error: string;
  onOpenAccount: () => void;
  onOpenAppointments: () => void;
  onOpenConsult: (appointmentId: string) => void;
};

export function TherapistHomeScreen({
  fullName,
  patients,
  appointments,
  banner,
  error,
  onOpenAccount,
  onOpenAppointments,
  onOpenConsult,
}: Props) {
  const initials = fullName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const upcoming = appointments.filter((a) => a.status === "scheduled");
  const nextAppt = upcoming[0] ?? appointments[0];

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View style={styles.greetRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View>
            <Text style={styles.greetSub}>Physiotherapist</Text>
            <Text style={styles.greetName}>{fullName}</Text>
          </View>
        </View>
        <AccountGearButton onOpenAccount={onOpenAccount} />
      </View>

      {banner ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{banner}</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{patients.length}</Text>
          <Text style={styles.statLabel}>Patients</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{upcoming.length}</Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Next appointment</Text>
        {nextAppt ? (
          <>
            <Text style={styles.body}>
              {new Date(nextAppt.scheduled_at).toLocaleString()}
            </Text>
            <Text style={styles.muted}>{nextAppt.reason ?? "Follow-up"}</Text>
            {nextAppt.status === "scheduled" ? (
              <Pressable
                style={styles.btnPrimary}
                onPress={() => onOpenConsult(nextAppt.id)}
              >
                <Text style={styles.btnPrimaryText}>Join video call</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.btnOutline} onPress={onOpenAppointments}>
              <Text style={styles.btnOutlineText}>All appointments</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.body}>No appointments scheduled yet.</Text>
            <Pressable style={styles.btnOutline} onPress={onOpenAppointments}>
              <Text style={styles.btnOutlineText}>View schedule</Text>
            </Pressable>
          </>
        )}
      </View>

      <Text style={styles.sectionTitle}>Your patients</Text>
      {patients.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.body}>
            No patients linked yet. After admin approval, share your invite code
            so patients can join from phone or web.
          </Text>
        </View>
      ) : (
        patients.map((p) => (
          <View key={p.id} style={styles.patientRow}>
            <View style={styles.patientAvatar}>
              <Text style={styles.patientAvatarText}>
                {p.full_name
                  .split(" ")
                  .map((x) => x[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.patientName}>{p.full_name}</Text>
              <Text style={styles.muted}>{p.email}</Text>
            </View>
            <Text style={styles.status}>{p.status.replace(/_/g, " ")}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 40, gap: 12 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  greetRow: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "white", fontWeight: "800", fontSize: 16 },
  greetSub: { fontSize: 13, color: C.muted, fontWeight: "600" },
  greetName: { fontSize: 20, fontWeight: "800", color: C.text },
  banner: {
    backgroundColor: C.successSoft,
    borderRadius: 14,
    padding: 12,
  },
  bannerText: { color: C.teal, fontWeight: "600" },
  error: { color: C.danger, fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  statValue: { fontSize: 28, fontWeight: "800", color: C.text },
  statLabel: { fontSize: 13, color: C.muted, fontWeight: "600", marginTop: 4 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: C.text,
    marginTop: 8,
  },
  body: { fontSize: 15, color: C.text, lineHeight: 22 },
  muted: { fontSize: 13, color: C.muted },
  btnPrimary: {
    marginTop: 8,
    minHeight: 48,
    backgroundColor: C.primary,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: { color: "white", fontWeight: "700", fontSize: 16 },
  btnOutline: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  btnOutlineText: { color: C.primary, fontWeight: "700", fontSize: 15 },
  patientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  patientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.blueGrad,
    alignItems: "center",
    justifyContent: "center",
  },
  patientAvatarText: { color: C.primary, fontWeight: "800", fontSize: 13 },
  patientName: { fontSize: 16, fontWeight: "700", color: C.text },
  status: {
    fontSize: 12,
    color: C.muted,
    fontWeight: "600",
    textTransform: "capitalize",
  },
});
