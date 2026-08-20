import { Pressable, StyleSheet, Text, View } from "react-native";
import type { PatientTab } from "../types";
import { C } from "../theme";

type TabDef = { id: PatientTab; label: string; icon: string };

const TABS: TabDef[] = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "plan", label: "Plan", icon: "🏃" },
  { id: "help", label: "Help", icon: "💬" },
];

type Props = {
  active: PatientTab;
  onChange: (tab: PatientTab) => void;
};

export function BottomNav({ active, onChange }: Props) {
  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <Pressable key={tab.id} style={styles.item} onPress={() => onChange(tab.id)}>
            <Text style={[styles.icon, selected && styles.iconActive]}>{tab.icon}</Text>
            <Text style={[styles.label, selected && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
    paddingBottom: 10,
  },
  item: { flex: 1, alignItems: "center", gap: 4, minHeight: 52, justifyContent: "center" },
  icon: { fontSize: 22, opacity: 0.55 },
  iconActive: { opacity: 1 },
  label: { fontSize: 13, fontWeight: "600", color: C.muted },
  labelActive: { color: C.primary, fontWeight: "700" },
});
