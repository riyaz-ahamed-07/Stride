import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { C, colors, type as typography } from "../../theme";

/** Brand-aligned onboarding tokens (legacy `O` name kept for screen imports). */
export const O = {
  bg: colors.surface.page,
  white: colors.surface.card,
  gray20: colors.border.default,
  gray30: colors.border.strong,
  gray40: colors.text.disabled,
  gray60: colors.text.muted,
  gray80: colors.text.primary,
  green: colors.brand.primary,
  greenSoft: colors.brand.primarySoft,
  greenMuted: colors.brand.primarySubtle,
  blueSoft: colors.brand.primarySoft,
  blue: colors.brand.primaryHover,
  violetSoft: colors.semantic.infoSoft,
  violet: colors.semantic.info,
  yellowSoft: colors.semantic.warningSoft,
  yellow: colors.semantic.warning,
  ring: "rgba(0, 88, 184, 0.25)",
  shadow: "rgba(15, 23, 42, 0.06)",
};

type Props = {
  step: number;
  total: number;
  onBack?: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  footerStyle?: StyleProp<ViewStyle>;
  copyStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  bodyAlign?: "top" | "center";
  titleAlign?: "left" | "center";
  /** Centered stack: title + body + continue grouped mid-screen. */
  layout?: "default" | "centered";
  copyExtra?: ReactNode;
};

export function OnboardingShell({
  step,
  total,
  onBack,
  title,
  subtitle,
  children,
  footer,
  footerStyle,
  copyStyle,
  style,
  bodyAlign = "top",
  titleAlign = "left",
  layout = "default",
  copyExtra,
}: Props) {
  const centered = layout === "centered";
  const alignCenter = centered || titleAlign === "center";

  const copyBlock = (
    <View style={[styles.copy, centered && styles.copyCentered, copyStyle]}>
      <Text
        style={[
          styles.title,
          alignCenter && styles.titleCenter,
          centered && styles.titleHero,
        ]}
        numberOfLines={centered ? 1 : undefined}
        adjustsFontSizeToFit={centered}
        minimumFontScale={0.85}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, alignCenter && styles.subtitleCenter]}>
          {subtitle}
        </Text>
      ) : null}
      {copyExtra}
    </View>
  );

  return (
    <View style={[styles.root, style]}>
      <View style={styles.topNav}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={styles.backBtn}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={20} color={O.gray80} strokeWidth={2.5} />
          </Pressable>
        ) : (
          <View style={styles.backBtnSpacer} />
        )}
        <Text style={styles.navTitle} pointerEvents="none" numberOfLines={1}>
          Profile Setup
        </Text>
        <View
          style={styles.stepTag}
          accessibilityLabel={`Step ${step + 1} of ${total}`}
        >
          <Text style={styles.stepCurrent}>{step + 1}</Text>
          <Text style={styles.stepSep}>/</Text>
          <Text style={styles.stepTotal}>{total}</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${((step + 1) / total) * 100}%` },
          ]}
        />
      </View>

      {centered ? (
        <View style={styles.centeredStack}>
          {copyBlock}
          <View style={styles.centeredBody}>{children}</View>
          {footer ? (
            <View style={[styles.footerInline, footerStyle]}>{footer}</View>
          ) : null}
        </View>
      ) : (
        <>
          {copyBlock}
          <View
            style={[
              styles.body,
              bodyAlign === "center" ? styles.bodyCenter : styles.bodyTop,
            ]}
          >
            {children}
          </View>
          {footer ? (
            <View style={[styles.footer, footerStyle]}>{footer}</View>
          ) : null}
        </>
      )}
    </View>
  );
}

export function ContinueButton({
  label = "Continue",
  onPress,
  busy,
  disabled,
}: {
  label?: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.continue, (busy || disabled) && styles.continueDisabled]}
      onPress={onPress}
      disabled={busy || disabled}
      accessibilityRole="button"
    >
      <Text style={styles.continueText}>{busy ? "Saving…" : label}</Text>
      {!busy ? <Text style={styles.continueArrow}>→</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: O.bg,
  },
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 2,
    minHeight: 48,
    position: "relative",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: O.white,
    borderWidth: 1,
    borderColor: O.gray20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    zIndex: 2,
  },
  backBtnSpacer: { width: 40, height: 40, zIndex: 2 },
  navTitle: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: O.gray80,
    fontFamily: typography.fontFamilyExtraBold,
    zIndex: 1,
  },
  stepTag: {
    minWidth: 40,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: O.white,
    borderWidth: 1,
    borderColor: O.gray20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    zIndex: 2,
  },
  stepCurrent: {
    fontSize: 14,
    fontWeight: "800",
    color: O.green,
    fontFamily: typography.fontFamilyExtraBold,
  },
  stepSep: {
    fontSize: 13,
    fontWeight: "600",
    color: O.gray40,
    marginHorizontal: 1,
  },
  stepTotal: {
    fontSize: 13,
    fontWeight: "700",
    color: O.gray60,
  },
  progressTrack: {
    height: 3,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 999,
    backgroundColor: O.greenMuted,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: O.green,
  },
  copy: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
  },
  copyCentered: {
    alignItems: "center",
    paddingBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 32,
    letterSpacing: -0.4,
    color: O.gray80,
    textAlign: "left",
    fontFamily: typography.fontFamilyExtraBold,
  },
  titleCenter: {
    textAlign: "center",
  },
  titleHero: {
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.5,
    width: "100%",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: O.gray60,
    textAlign: "left",
    paddingHorizontal: 0,
  },
  subtitleCenter: {
    textAlign: "center",
  },
  centeredStack: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  centeredBody: {
    width: "100%",
    alignItems: "center",
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
  },
  bodyTop: {
    justifyContent: "flex-start",
  },
  bodyCenter: {
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
    gap: 8,
  },
  footerInline: {
    width: "100%",
    paddingTop: 20,
    gap: 8,
  },
  continue: {
    minHeight: 54,
    width: "100%",
    alignSelf: "stretch",
    borderRadius: 18,
    backgroundColor: C.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
  continueDisabled: { opacity: 0.45 },
  continueText: {
    color: O.white,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  continueArrow: {
    color: O.white,
    fontSize: 18,
    fontWeight: "700",
  },
});
