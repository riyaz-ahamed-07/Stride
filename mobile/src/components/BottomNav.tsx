import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  CalendarDays,
  ClipboardList,
  HelpCircle,
  Home,
  MessageCircle,
} from "lucide-react-native";
import type { AppTab } from "../types";
import { C, colors, radius, shadow, type as typography } from "../theme";

type TabDef = {
  id: AppTab;
  label: string;
  Icon: typeof Home;
};

const PATIENT_TABS: TabDef[] = [
  { id: "home", label: "Today", Icon: Home },
  { id: "plan", label: "Plan", Icon: ClipboardList },
  { id: "help", label: "Help", Icon: HelpCircle },
];

const THERAPIST_TABS: TabDef[] = [
  { id: "home", label: "Patients", Icon: Home },
  { id: "appointments", label: "Appointments", Icon: CalendarDays },
  { id: "help", label: "Help", Icon: MessageCircle },
];

type Props = {
  active: AppTab;
  role: string;
  onChange: (tab: AppTab) => void;
};

export function BottomNav({ active, role, onChange }: Props) {
  const tabs = role === "patient" ? PATIENT_TABS : THERAPIST_TABS;
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.pill} accessibilityRole="tablist">
        {tabs.map((tab) => {
          const selected = tab.id === active;
          const Icon = tab.Icon;
          return (
            <Pressable
              key={tab.id}
              style={[styles.item, selected && styles.itemActive]}
              onPress={() => onChange(tab.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={tab.label}
            >
              <Icon
                size={20}
                color={selected ? colors.text.inverse : colors.text.muted}
                strokeWidth={selected ? 2.4 : 2}
              />
              <Text style={[styles.label, selected && styles.labelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingBottom: 10,
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    maxWidth: 420,
    backgroundColor: C.surface,
    borderRadius: radius.full,
    padding: 6,
    gap: 4,
    ...shadow.lg,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    minHeight: 52,
    borderRadius: radius.full,
    paddingHorizontal: 8,
  },
  itemActive: {
    backgroundColor: colors.brand.primary,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: C.muted,
    fontFamily: typography.fontFamilyBold,
  },
  labelActive: {
    color: colors.text.inverse,
  },
});
