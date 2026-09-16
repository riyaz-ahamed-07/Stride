import { Pressable, StyleSheet, Text, View } from "react-native";
import { C } from "../theme";

type Props = {
  onDone: () => void;
  onViewProgress?: () => void;
};

export function MoveSuccessScreen({ onDone, onViewProgress }: Props) {
  return (
    <View style={styles.page}>
      <View style={styles.icon}>
        <Text style={styles.iconText}>✓</Text>
      </View>
      <Text style={styles.h1}>Well done!</Text>
      <Text style={styles.body}>
        Your session is saved. Your physiotherapist will review it and add it to your record.
      </Text>
      {onViewProgress ? (
        <Pressable style={styles.btnSecondary} onPress={onViewProgress}>
          <Text style={styles.btnSecondaryText}>View progress</Text>
        </Pressable>
      ) : null}
      <Pressable style={styles.btnPrimary} onPress={onDone}>
        <Text style={styles.btnPrimaryText}>Back to dashboard</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  icon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: C.successSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  iconText: { fontSize: 40, fontWeight: "800", color: C.success },
  h1: { fontSize: 30, fontWeight: "800", color: C.text, marginBottom: 12, textAlign: "center" },
  body: {
    fontSize: 17,
    color: C.muted,
    lineHeight: 26,
    textAlign: "center",
    marginBottom: 28,
  },
  btnSecondary: {
    minHeight: 54,
    minWidth: "100%",
    backgroundColor: C.surface,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },
  btnSecondaryText: { color: C.primary, fontSize: 17, fontWeight: "700" },
  btnPrimary: {
    minHeight: 54,
    minWidth: "100%",
    backgroundColor: C.primary,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: { color: "white", fontSize: 17, fontWeight: "700" },
});
