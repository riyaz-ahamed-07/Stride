import { useState, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { C, colors, type as typography } from "../../theme";

type Props = TextInputProps & {
  label: string;
  leftIcon: ReactNode;
  rightIcon?: ReactNode;
  onRightPress?: () => void;
  error?: boolean;
  errorMessage?: string;
};

export function IconField({
  label,
  leftIcon,
  rightIcon,
  onRightPress,
  error,
  errorMessage,
  editable = true,
  style,
  onFocus,
  onBlur,
  ...inputProps
}: Props) {
  const [focused, setFocused] = useState(false);
  const showError = Boolean(errorMessage) || error;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          showError && styles.fieldError,
          !editable && styles.fieldDisabled,
        ]}
      >
        <View style={styles.leftIcon}>{leftIcon}</View>
        <TextInput
          {...inputProps}
          editable={editable}
          style={[styles.input, style]}
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
        {rightIcon ? (
          onRightPress ? (
            <Pressable
              style={styles.rightIcon}
              onPress={onRightPress}
              hitSlop={8}
            >
              {rightIcon}
            </Pressable>
          ) : (
            <View style={styles.rightIcon}>{rightIcon}</View>
          )
        ) : null}
      </View>
      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text.primary,
    fontFamily: typography.fontFamilyBold,
  },
  field: {
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
  fieldFocused: {
    borderColor: C.primary,
  },
  fieldError: {
    borderColor: colors.semantic.error,
    backgroundColor: colors.semantic.errorSoft,
  },
  fieldDisabled: { opacity: 0.7 },
  leftIcon: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  rightIcon: {
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
  errorText: {
    marginTop: -2,
    fontSize: 13,
    fontWeight: "600",
    color: colors.semantic.error,
    lineHeight: 18,
  },
});
