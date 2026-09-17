import { Pressable, StyleSheet, Text, View } from "react-native";
import { HeartPulse, Stethoscope, type LucideProps } from "lucide-react-native";
import type { ComponentType } from "react";
import { O } from "./OnboardingShell";
import { type as typography } from "../../theme";

export type AccountRole = "patient" | "therapist";

type Props = {
  value: AccountRole | "";
  onChange: (value: AccountRole) => void;
  disabled?: boolean;
};

const ROLES: {
  id: AccountRole;
  label: string;
  hint: string;
  Icon: ComponentType<LucideProps>;
}[] = [
  {
    id: "patient",
    label: "I'm a patient",
    hint: "Follow a plan and do guided home exercises",
    Icon: HeartPulse,
  },
  {
    id: "therapist",
    label: "I'm a physiotherapist",
    hint: "Manage patients and review their progress",
    Icon: Stethoscope,
  },
];

export function AccountTypeCards({ value, onChange, disabled }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Account Type</Text>
      <View style={styles.stack}>
        {ROLES.map((role) => {
          const selected = value === role.id;
          const { Icon } = role;
          return (
            <Pressable
              key={role.id}
              onPress={() => onChange(role.id)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={role.label}
              style={[styles.card, selected && styles.cardOn]}
            >
              <View style={[styles.iconBox, selected && styles.iconBoxOn]}>
                <Icon
                  size={22}
                  color={selected ? O.white : O.green}
                  strokeWidth={2.2}
                />
              </View>
              <View style={styles.copy}>
                <Text style={[styles.label, selected && styles.labelOn]}>
                  {role.label}
                </Text>
                <Text style={styles.hint}>{role.hint}</Text>
              </View>
              <View style={[styles.radio, selected && styles.radioOn]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
    alignSelf: "stretch",
    width: "100%",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: O.gray80,
  },
  stack: {
    gap: 10,
    width: "100%",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: O.white,
    borderWidth: 1.5,
    borderColor: O.gray20,
  },
  cardOn: {
    borderColor: O.green,
    backgroundColor: O.greenMuted,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: O.greenSoft,
  },
  iconBoxOn: {
    backgroundColor: O.green,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
    color: O.gray80,
    fontFamily: typography.fontFamilyExtraBold,
  },
  labelOn: {
    color: O.green,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    color: O.gray60,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: O.gray30,
  },
  radioOn: {
    borderWidth: 0,
    backgroundColor: O.green,
  },
});
