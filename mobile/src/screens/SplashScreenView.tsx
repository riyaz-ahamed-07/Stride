import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { StrideLogo } from "../components/StrideLogo";
import { C } from "../theme";

export function SplashScreenView() {
  return (
    <View style={styles.page}>
      <StrideLogo size={72} style={{ marginBottom: 16 }} />
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
  brand: { color: "white", fontSize: 34, fontWeight: "800", marginBottom: 28 },
  spinner: { marginTop: 8 },
});
