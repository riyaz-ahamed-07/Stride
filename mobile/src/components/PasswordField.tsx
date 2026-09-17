import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import {
  EyeHiddenIcon,
  EyeShownIcon,
  LockFieldIcon,
} from "./icons/AuthFieldIcons";
import { C, colors } from "../theme";

type Props = Omit<TextInputProps, "secureTextEntry"> & {
  error?: boolean;
  showLock?: boolean;
};

export function PasswordField({
  value,
  onChangeText,
  editable = true,
  style,
  error,
  showLock = true,
  placeholder = "Enter your password...",
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.wrap,
        focused && styles.wrapFocused,
        error && styles.wrapError,
        !editable && styles.disabled,
        style,
      ]}
    >
      {showLock ? (
        <View style={styles.leftIcon}>
          <LockFieldIcon />
        </View>
      ) : null}
      <TextInput
        {...rest}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        editable={editable}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        placeholder={placeholder}
        placeholderTextColor={colors.text.disabled}
        selectionColor={C.primary}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
      />
      <Pressable
        style={styles.eyeBtn}
        onPress={() => setVisible((v) => !v)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeShownIcon /> : <EyeHiddenIcon />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: colors.surface.card,
    borderWidth: 1.5,
    borderColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  wrapFocused: { borderColor: C.primary },
  wrapError: {
    borderColor: colors.semantic.error,
    backgroundColor: colors.semantic.errorSoft,
  },
  disabled: { opacity: 0.7 },
  leftIcon: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minHeight: 56,
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.primary,
    paddingVertical: 0,
  },
  eyeBtn: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
