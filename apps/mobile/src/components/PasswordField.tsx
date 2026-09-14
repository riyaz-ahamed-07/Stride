import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { C } from "../theme";

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  editable?: boolean;
  style?: object;
};

export function PasswordField({ value, onChangeText, editable = true, style }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.wrap, style]}>
      <TextInput
        style={[styles.input, !editable && styles.disabled]}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        editable={editable}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        placeholderTextColor={C.muted}
        selectionColor={C.primary}
      />
      <Pressable
        style={styles.eyeBtn}
        onPress={() => setVisible((v) => !v)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={visible ? "Hide password" : "Show password"}
      >
        <Text style={styles.eyeIcon}>{visible ? "🙈" : "👁"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    marginBottom: 4,
  },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingRight: 52,
    fontSize: 17,
    color: C.text,
  },
  disabled: { opacity: 0.7 },
  eyeBtn: {
    position: "absolute",
    right: 8,
    top: 0,
    bottom: 0,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  eyeIcon: { fontSize: 18 },
});
