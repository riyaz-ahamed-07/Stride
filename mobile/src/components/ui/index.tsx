import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react-native";
import {
  C,
  colors,
  control,
  radius,
  shadow,
  space,
  type as typography,
} from "../../theme";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive";

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const tone =
    variant === "primary"
      ? styles.primary
      : variant === "secondary" || variant === "outline"
        ? styles.outline
        : variant === "ghost"
          ? styles.ghost
          : styles.destructive;
  const labelTone =
    variant === "primary" || variant === "destructive"
      ? styles.labelOnPrimary
      : styles.labelOnSurface;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.btn,
        tone,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : C.primary} />
      ) : (
        <Text style={[styles.label, labelTone]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function TextField({
  label,
  error,
  ...rest
}: { label: string; error?: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholderTextColor={colors.text.disabled}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function PasswordInput({
  label,
  error,
  ...rest
}: { label: string; error?: string } & Omit<
  TextInputProps,
  "secureTextEntry"
>) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.passwordWrap, error ? styles.inputError : null]}>
        <TextInput
          style={styles.passwordInput}
          placeholderTextColor={colors.text.disabled}
          secureTextEntry={!visible}
          {...rest}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={visible ? "Hide password" : "Show password"}
          hitSlop={8}
          style={styles.eyeBtn}
        >
          {visible ? (
            <EyeOff size={20} color={C.muted} />
          ) : (
            <Eye size={20} color={C.muted} />
          )}
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty} accessibilityRole="summary">
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          style={{ marginTop: space[4] }}
        />
      ) : null}
    </View>
  );
}

export function SoftCard({
  children,
  style,
  tone = "default",
}: {
  children: ReactNode;
  style?: ViewStyle;
  tone?: "default" | "mint" | "blue" | "inverse";
}) {
  return (
    <View
      style={[
        styles.softCard,
        tone === "mint" && styles.softCardMint,
        tone === "blue" && styles.softCardBlue,
        tone === "inverse" && styles.softCardInverse,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionLabel({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function MetricTile({
  label,
  value,
  hint,
  accent = "primary",
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "primary" | "accent" | "success";
}) {
  const valueColor =
    accent === "accent"
      ? colors.brand.accent
      : accent === "success"
        ? colors.semantic.success
        : colors.brand.primary;
  return (
    <SoftCard style={styles.metricTile}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: valueColor }]}>{value}</Text>
      {hint ? <Text style={styles.metricHint}>{hint}</Text> : null}
    </SoftCard>
  );
}

export function IconBubble({
  children,
  color = colors.brand.primarySoft,
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <View style={[styles.iconBubble, { backgroundColor: color }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: control.heightMd,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space[5],
  },
  primary: { backgroundColor: colors.brand.primary },
  outline: {
    backgroundColor: colors.surface.card,
    borderWidth: 1.5,
    borderColor: colors.border.default,
  },
  ghost: { backgroundColor: "transparent" },
  destructive: { backgroundColor: colors.semantic.error },
  disabled: { opacity: 0.5 },
  label: {
    fontSize: typography.body.fontSize,
    fontWeight: "700",
    fontFamily: typography.fontFamilyBold,
  },
  labelOnPrimary: { color: colors.text.inverse },
  labelOnSurface: { color: colors.text.primary },
  field: { marginBottom: space[4] },
  fieldLabel: {
    fontSize: typography.label.fontSize,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: space[2],
    fontFamily: typography.fontFamilySemiBold,
  },
  input: {
    minHeight: control.heightLg,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: radius.lg,
    paddingHorizontal: space[4],
    backgroundColor: colors.surface.card,
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: typography.fontFamily,
  },
  inputError: { borderColor: colors.semantic.error },
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: control.heightLg,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
    paddingRight: space[2],
  },
  passwordInput: {
    flex: 1,
    minHeight: control.heightLg,
    paddingHorizontal: space[4],
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: typography.fontFamily,
  },
  eyeBtn: { padding: space[2] },
  error: {
    marginTop: space[1],
    color: colors.semantic.error,
    fontSize: typography.caption.fontSize,
    fontWeight: "600",
  },
  empty: { paddingVertical: space[6] },
  emptyTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: "800",
    color: colors.text.primary,
    marginBottom: space[2],
    fontFamily: typography.fontFamilyExtraBold,
  },
  emptyBody: {
    fontSize: typography.body.fontSize,
    color: colors.text.muted,
    lineHeight: typography.body.lineHeight,
  },
  softCard: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.xl,
    padding: space[5],
    ...shadow.md,
  },
  softCardMint: {
    backgroundColor: colors.brand.accentSoft,
  },
  softCardBlue: {
    backgroundColor: colors.brand.primarySoft,
  },
  softCardInverse: {
    backgroundColor: colors.brand.primary,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space[3],
    marginTop: space[2],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text.primary,
    fontFamily: typography.fontFamilyExtraBold,
    letterSpacing: -0.3,
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.brand.primary,
    fontFamily: typography.fontFamilyBold,
  },
  metricTile: {
    flex: 1,
    paddingVertical: space[4],
    paddingHorizontal: space[4],
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text.muted,
    marginBottom: space[2],
    fontFamily: typography.fontFamilyBold,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "800",
    fontFamily: typography.fontFamilyExtraBold,
    letterSpacing: -0.6,
  },
  metricHint: {
    marginTop: space[1],
    fontSize: 13,
    color: colors.text.muted,
    fontFamily: typography.fontFamily,
  },
  iconBubble: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
