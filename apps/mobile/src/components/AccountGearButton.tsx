import { Pressable, StyleSheet, Text, View } from "react-native";
import { C } from "../theme";

type Props = {
  onOpenAccount: () => void;
};

export function AccountGearButton({ onOpenAccount }: Props) {
  return (
    <Pressable
      style={styles.btn}
      onPress={onOpenAccount}
      accessibilityRole="button"
      accessibilityLabel="Open account settings"
    >
      <Text style={styles.icon}>⚙</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  icon: { fontSize: 22, color: C.text },
});
