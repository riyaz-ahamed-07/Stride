import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { C } from "../theme";

export function SplashScreenView() {
  return (
    <View style={styles.page}>
      <View style={styles.logoMark}>
        <Text style={styles.logoMarkText}>S</Text>
      </View>
      <Text style={styles.brand}>Stride</Text>
      <ActivityIndicator size="large" color="white" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoMarkText: { color: C.primary, fontWeight: "800", fontSize: 32 },
  brand: { color: "white", fontSize: 34, fontWeight: "800", marginBottom: 28 },
  spinner: { marginTop: 8 },
});
