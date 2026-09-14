import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { changeTherapist, deleteAccount, updateProfile } from "../api";
import type { Plan, TherapistContact, UserProfile } from "../types";
import { C } from "../theme";

type Props = {
  profile: UserProfile;
  therapist: TherapistContact | null;
  plan: Plan | null;
  accessToken: string;
  onBack: () => void;
  onLogout: () => void;
  onViewPlan: () => void;
  onProfileUpdated: (profile: UserProfile) => void;
  onTherapistChanged: (therapist: TherapistContact) => void;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(iso: string | null) {
  if (!iso) return "Not set";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

export function AccountScreen({
  profile,
  therapist,
  plan,
  accessToken,
  onBack,
  onLogout,
  onViewPlan,
  onProfileUpdated,
  onTherapistChanged,
}: Props) {
  const isPatient = profile.role === "patient";
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [notes, setNotes] = useState(profile.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  const [showTherapistForm, setShowTherapistForm] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [therapistBusy, setTherapistBusy] = useState(false);
  const [therapistError, setTherapistError] = useState("");

  async function handleSaveProfile() {
    if (saving) return;
    setProfileError("");
    setProfileSuccess("");
    setSaving(true);
    try {
      const updated = await updateProfile(accessToken, {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        notes: notes.trim() || null,
      });
      onProfileUpdated(updated);
      setEditing(false);
      setProfileSuccess("Profile saved.");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setFullName(profile.full_name);
    setPhone(profile.phone ?? "");
    setNotes(profile.notes ?? "");
    setEditing(false);
    setProfileError("");
  }

  async function handleChangeTherapist() {
    if (therapistBusy || !inviteCode.trim()) return;
    setTherapistError("");
    setTherapistBusy(true);
    try {
      const next = await changeTherapist(accessToken, inviteCode);
      onTherapistChanged(next);
      setInviteCode("");
      setShowTherapistForm(false);
      Alert.alert("Physiotherapist updated", `You are now linked to ${next.full_name}.`);
    } catch (err) {
      setTherapistError(err instanceof Error ? err.message : "Could not change physiotherapist.");
    } finally {
      setTherapistBusy(false);
    }
  }

  function confirmLogout() {
    Alert.alert("Log out?", "You can sign in again anytime.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: onLogout },
    ]);
  }

  function confirmDelete() {
    Alert.alert(
      "Delete account?",
      "Your account will be deactivated and you will be signed out. Contact your clinic if you need it restored.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount(accessToken);
              onLogout();
            } catch (err) {
              Alert.alert(
                "Could not delete",
                err instanceof Error ? err.message : "Please try again later.",
              );
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
      </View>

      <Text style={styles.eyebrow}>Account</Text>
      <Text style={styles.h1}>My account</Text>

      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(profile.full_name || profile.email)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroName}>{profile.full_name || "Patient"}</Text>
          <Text style={styles.heroEmail}>{profile.email}</Text>
        </View>
      </View>

      {profileSuccess ? (
        <View style={styles.bannerOk}>
          <Text style={styles.bannerOkText}>{profileSuccess}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Your details</Text>
          {!editing ? (
            <Pressable onPress={() => setEditing(true)}>
              <Text style={styles.link}>Edit</Text>
            </Pressable>
          ) : null}
        </View>

        {editing ? (
          <View style={styles.card}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <Text style={styles.label}>Notes for your therapist</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
            {profileError ? <Text style={styles.error}>{profileError}</Text> : null}
            <View style={styles.editActions}>
              <Pressable style={styles.btnGhost} onPress={cancelEdit} disabled={saving}>
                <Text style={styles.btnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.btnPrimary} onPress={handleSaveProfile} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Row label="Email" value={profile.email} />
            <Row label="Phone" value={profile.phone || "Not set"} />
            <Row label="Date of birth" value={formatDate(profile.date_of_birth)} />
            <Row label="Notes" value={profile.notes || "None"} last />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your physiotherapist</Text>
        <View style={styles.card}>
          {therapist ? (
            <>
              <Row label="Name" value={therapist.full_name} />
              <Row label="Clinic" value={therapist.clinic_name || "Not listed"} />
              <Row label="Phone" value={therapist.phone || "Not on file"} last />
            </>
          ) : (
            <Text style={styles.muted}>No physiotherapist linked yet.</Text>
          )}
          {!showTherapistForm ? (
            <Pressable style={styles.btnOutline} onPress={() => setShowTherapistForm(true)}>
              <Text style={styles.btnOutlineText}>Change physiotherapist</Text>
            </Pressable>
          ) : (
            <View style={styles.therapistForm}>
              <Text style={styles.label}>Therapist invite code</Text>
              <TextInput
                style={styles.input}
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="characters"
                placeholder="e.g. STRIDE-AB12"
                placeholderTextColor={C.muted}
              />
              {therapistError ? <Text style={styles.error}>{therapistError}</Text> : null}
              <View style={styles.editActions}>
                <Pressable
                  style={styles.btnGhost}
                  onPress={() => {
                    setShowTherapistForm(false);
                    setInviteCode("");
                    setTherapistError("");
                  }}
                  disabled={therapistBusy}
                >
                  <Text style={styles.btnGhostText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.btnPrimary}
                  onPress={handleChangeTherapist}
                  disabled={therapistBusy || !inviteCode.trim()}
                >
                  {therapistBusy ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.btnPrimaryText}>Link therapist</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rehabilitation</Text>
        <View style={styles.card}>
          {plan ? (
            <>
              <Row label="Active plan" value={plan.title} />
              <Row
                label="Duration"
                value={`${plan.duration_weeks} weeks · ${plan.items.length} exercises`}
                last
              />
            </>
          ) : (
            <Text style={styles.muted}>No active plan assigned yet.</Text>
          )}
          <Pressable style={styles.btnOutline} onPress={onViewPlan}>
            <Text style={styles.btnOutlineText}>View exercise plan</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Session</Text>
        <Pressable style={styles.actionRow} onPress={confirmLogout}>
          <Text style={styles.actionText}>Log out</Text>
          <Text style={styles.actionChevron}>→</Text>
        </Pressable>
        <Pressable style={[styles.actionRow, styles.actionDanger]} onPress={confirmDelete}>
          <Text style={styles.actionDangerText}>Delete account</Text>
          <Text style={styles.actionChevron}>→</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 32 },
  topRow: { marginBottom: 8 },
  backBtn: { alignSelf: "flex-start", paddingVertical: 4 },
  backText: { color: C.primary, fontWeight: "700", fontSize: 16 },
  eyebrow: { fontSize: 14, color: C.muted, marginBottom: 4 },
  h1: { fontSize: 28, fontWeight: "800", color: C.text, marginBottom: 20 },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.blueGrad,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  avatarText: { fontWeight: "800", fontSize: 22, color: C.primary },
  heroName: { fontSize: 22, fontWeight: "800", color: C.text },
  heroEmail: { fontSize: 15, color: C.muted, marginTop: 2 },
  bannerOk: {
    backgroundColor: C.successSoft,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  bannerOkText: { color: C.success, fontWeight: "600" },
  section: { marginBottom: 22 },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: C.text, marginBottom: 10 },
  link: { color: C.primary, fontWeight: "700", fontSize: 15 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  row: { paddingVertical: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  rowLabel: { fontSize: 13, color: C.muted, marginBottom: 4, fontWeight: "600" },
  rowValue: { fontSize: 16, color: C.text, lineHeight: 22 },
  muted: { fontSize: 15, color: C.muted, lineHeight: 22 },
  label: { fontSize: 14, fontWeight: "600", color: C.text, marginBottom: 8, marginTop: 8 },
  input: {
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 4,
  },
  textArea: { minHeight: 88, textAlignVertical: "top", paddingTop: 12 },
  editActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  btnPrimary: {
    flex: 1,
    minHeight: 48,
    backgroundColor: C.primary,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: { color: "white", fontWeight: "700", fontSize: 16 },
  btnGhost: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  btnGhostText: { color: C.text, fontWeight: "700", fontSize: 16 },
  btnOutline: {
    marginTop: 14,
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: C.primary,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  btnOutlineText: { color: C.primary, fontWeight: "700", fontSize: 16 },
  therapistForm: { marginTop: 12 },
  error: { color: C.danger, fontWeight: "600", marginTop: 8, lineHeight: 20 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.surface,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  actionText: { fontSize: 16, fontWeight: "700", color: C.text },
  actionChevron: { fontSize: 18, color: C.muted },
  actionDanger: { borderColor: "#FECACA", backgroundColor: C.dangerSoft },
  actionDangerText: { fontSize: 16, fontWeight: "700", color: C.danger },
});
