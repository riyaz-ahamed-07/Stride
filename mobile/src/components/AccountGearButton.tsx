import { Pressable, StyleSheet } from "react-native";
import { Settings } from "lucide-react-native";
import { C, shadow } from "../theme";

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
      <Settings size={20} color={C.text} strokeWidth={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.sm,
  },
});
