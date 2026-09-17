/** Stride design system — logo-derived blue primary, teal accent. Keep in sync with shared/design-tokens.json */

export const colors = {
  brand: {
    primary: "#0058B8",
    primaryHover: "#007BFF",
    primaryPressed: "#004098",
    primarySoft: "#E6F4FF",
    primarySubtle: "#F0F7FC",
    accent: "#00C6A7",
    accentHover: "#14D8B5",
    accentSoft: "#E6FBF7",
    accentSubtle: "#F0FDF9",
  },
  text: {
    primary: "#0F172A",
    secondary: "#334155",
    muted: "#64748B",
    disabled: "#94A3B8",
    inverse: "#FFFFFF",
  },
  surface: {
    page: "#F5F8FC",
    card: "#FFFFFF",
    elevated: "#FFFFFF",
    subtle: "#F1F5F9",
    interactive: "#E6F4FF",
    inverse: "#0F172A",
  },
  border: {
    default: "#E2E8F0",
    strong: "#CBD5E1",
    focus: "#0058B8",
  },
  semantic: {
    success: "#16A34A",
    successSoft: "#DCFCE7",
    warning: "#F59E0B",
    warningSoft: "#FEF3C7",
    error: "#EF4444",
    errorSoft: "#FEE2E2",
    info: "#0284C7",
    infoSoft: "#E0F2FE",
  },
} as const;

export const type = {
  fontFamily: "Nunito_400Regular",
  fontFamilyMedium: "Nunito_500Medium",
  fontFamilySemiBold: "Nunito_600SemiBold",
  fontFamilyBold: "Nunito_700Bold",
  fontFamilyExtraBold: "Nunito_800ExtraBold",
  displayLg: { fontSize: 40, fontWeight: "800" as const, lineHeight: 46 },
  displayMd: { fontSize: 32, fontWeight: "800" as const, lineHeight: 38 },
  displaySm: { fontSize: 28, fontWeight: "700" as const, lineHeight: 34 },
  h1: { fontSize: 28, fontWeight: "800" as const, lineHeight: 34 },
  h2: { fontSize: 24, fontWeight: "700" as const, lineHeight: 30 },
  h3: { fontSize: 20, fontWeight: "700" as const, lineHeight: 26 },
  h4: { fontSize: 18, fontWeight: "600" as const, lineHeight: 24 },
  bodyLarge: { fontSize: 18, fontWeight: "400" as const, lineHeight: 28 },
  body: { fontSize: 16, fontWeight: "400" as const, lineHeight: 24 },
  bodySmall: { fontSize: 14, fontWeight: "400" as const, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: "600" as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: "500" as const, lineHeight: 16 },
} as const;

export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

export const shadow = {
  color: "rgba(15, 23, 42, 0.08)",
  sm: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  lg: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
} as const;

export const control = {
  heightSm: 36,
  heightMd: 44,
  heightLg: 52,
} as const;

/** Legacy flat map — screens still importing `C` keep working during migration. */
export const C = {
  primary: colors.brand.primary,
  primaryDark: colors.brand.primaryPressed,
  primarySoft: colors.brand.primarySoft,
  primaryMuted: colors.brand.primaryHover,
  primaryHover: colors.brand.primaryHover,
  teal: colors.brand.accent,
  tealDeep: colors.brand.accentHover,
  mint: colors.brand.accentSubtle,
  mintSoft: colors.brand.accentSoft,
  mintGrad: colors.brand.accentSubtle,
  blueGrad: colors.brand.primarySoft,
  bg: colors.surface.page,
  surface: colors.surface.card,
  surfaceMuted: colors.surface.subtle,
  text: colors.text.primary,
  textSecondary: colors.text.secondary,
  muted: colors.text.muted,
  border: colors.border.default,
  borderSoft: colors.surface.subtle,
  success: colors.semantic.success,
  successSoft: colors.semantic.successSoft,
  warning: colors.semantic.warning,
  warningSoft: colors.semantic.warningSoft,
  danger: colors.semantic.error,
  dangerSoft: colors.semantic.errorSoft,
  info: colors.semantic.info,
  infoSoft: colors.semantic.infoSoft,
  shadow: shadow.color,
  radiusSm: radius.sm,
  radiusMd: radius.md,
  radiusLg: radius.lg,
  radiusXl: radius.xl,
  radiusPill: radius.full,
  inverse: colors.surface.inverse,
  accent: colors.brand.accent,
};
