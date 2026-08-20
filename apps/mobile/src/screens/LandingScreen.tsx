import { Pressable, StyleSheet, Text, View } from "react-native";
import { C } from "../theme";

const FEATURES = [
  { icon: "🏃", label: "Home exercise plans" },
  { icon: "🛡️", label: "Clear safety notes" },
  { icon: "👩‍⚕️", label: "Therapist review" },
];

type Props = { onGetStarted: () => void };

export function LandingScreen({ onGetStarted }: Props) {
  return (
    <View style={styles.page}>
      <View style={styles.hero}>
        <View style={styles.logoMark}>
          <Text style={styles.logoMarkText}>S</Text>
        </View>
        <Text style={styles.brand}>Stride</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Trusted tele-physiotherapy</Text>
        </View>
        <Text style={styles.title}>Your trusted path to{"\n"}recovery at home</Text>
        <Text style={styles.sub}>
          Follow your physiotherapist&apos;s plan with large text, safety alerts, and progress that
          syncs to your clinic record.
        </Text>
        <View style={styles.features}>
          {FEATURES.map((item) => (
            <View key={item.label} style={styles.feature}>
              <Text style={styles.featureIcon}>{item.icon}</Text>
              <Text style={styles.featureText}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.btnPrimary} onPress={onGetStarted}>
          <Text style={styles.btnPrimaryText}>Get started</Text>
        </Pressable>
        <Pressable style={styles.btnGhost} onPress={onGetStarted}>
          <Text style={styles.btnGhostText}>I already have an account</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: C.primary,
    paddingHorizontal: 24,
    paddingBottom: 28,
    justifyContent: "space-between",
  },
  hero: { flex: 1, justifyContent: "center", paddingTop: 12 },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoMarkText: { color: C.primary, fontWeight: "800", fontSize: 28 },
  brand: { color: "white", fontSize: 32, fontWeight: "800", marginBottom: 16 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 16,
  },
  badgeText: { color: "white", fontSize: 13, fontWeight: "600" },
  title: { color: "white", fontSize: 30, fontWeight: "800", lineHeight: 38, marginBottom: 14 },
  sub: { color: "rgba(255,255,255,0.88)", fontSize: 16, lineHeight: 24, marginBottom: 24 },
  features: { gap: 10 },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  featureIcon: { fontSize: 20 },
  featureText: { color: "white", fontSize: 15, fontWeight: "600", flex: 1 },
  actions: { gap: 12 },
  btnPrimary: {
    minHeight: 54,
    backgroundColor: "white",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: { color: C.primary, fontSize: 17, fontWeight: "700" },
  btnGhost: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  btnGhostText: { color: "rgba(255,255,255,0.92)", fontSize: 16, fontWeight: "600" },
});
