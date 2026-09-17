import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Hand,
  Monitor,
  Phone,
  Type,
  Users,
} from "lucide-react-native";
import { AccountGearButton } from "../components/AccountGearButton";
import { IconBubble } from "../components/ui";
import { phoneDialUri } from "../lib/phone";
import type { TherapistContact } from "../types";
import { C, colors, shadow } from "../theme";

const TOPICS = [
  {
    title: "Pain",
    body: "Stop. Sit. Call your PT if severe.",
    Icon: Hand,
    color: colors.semantic.errorSoft,
    iconColor: colors.semantic.error,
  },
  {
    title: "Video call",
    body: "Allow camera & mic. Prefer tablet.",
    Icon: Monitor,
    color: colors.brand.primarySoft,
    iconColor: colors.brand.primary,
  },
  {
    title: "Text size",
    body: "Ask a helper to tap buttons.",
    Icon: Type,
    color: colors.semantic.infoSoft,
    iconColor: colors.semantic.info,
  },
  {
    title: "Helpers",
    body: "Help tap — don’t change the plan.",
    Icon: Users,
    color: colors.brand.accentSoft,
    iconColor: colors.brand.accent,
  },
] as const;

type Props = {
  therapist: TherapistContact | null;
  onOpenAccount: () => void;
};

export function HelpScreen({ therapist, onOpenAccount }: Props) {
  const dial = therapist?.phone ? phoneDialUri(therapist.phone) : "";

  function callTherapist() {
    if (!dial) return;
    Linking.openURL(`tel:${dial}`);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <Text style={styles.h1}>Help</Text>
        <AccountGearButton onOpenAccount={onOpenAccount} />
      </View>

      {TOPICS.map((topic) => {
        const Icon = topic.Icon;
        return (
          <View key={topic.title} style={styles.card}>
            <IconBubble color={topic.color}>
              <Icon size={20} color={topic.iconColor} />
            </IconBubble>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{topic.title}</Text>
              <Text style={styles.cardBody}>{topic.body}</Text>
            </View>
          </View>
        );
      })}

      <View style={styles.urgent}>
        <IconBubble color="#fff">
          <Phone size={20} color={C.danger} />
        </IconBubble>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Urgent</Text>
          <Text style={styles.cardBody}>
            Severe pain → stop & call
            {therapist ? ` ${therapist.full_name}` : " your clinic"}
          </Text>
        </View>
      </View>

      {dial ? (
        <Pressable style={styles.btnPrimary} onPress={callTherapist}>
          <Text style={styles.btnPrimaryText}>
            Call {therapist?.full_name ?? "clinic"}
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 110, gap: 10 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  h1: {
    fontSize: 30,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.5,
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
  urgent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.dangerSoft,
    borderRadius: 22,
    padding: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: "800", color: C.text },
  cardBody: { fontSize: 13, color: C.muted, marginTop: 2, lineHeight: 18 },
  btnPrimary: {
    marginTop: 4,
    minHeight: 50,
    backgroundColor: C.danger,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: { color: "white", fontWeight: "800", fontSize: 15 },
});
