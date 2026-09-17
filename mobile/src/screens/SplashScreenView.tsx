import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { StrideLogo } from "../components/StrideLogo";
import { C } from "../theme";

export function SplashScreenView() {
  return (
    <View style={styles.page}>
      <StrideLogo size={72} variant="icon" style={{ marginBottom: 16 }} />
      <Text style={styles.brand}>Stride</Text>
      <ActivityIndicator
        size="large"
        color={C.primary}
        style={styles.spinner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    color: "#0F172A",
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 28,
  },
  spinner: { marginTop: 8 },
});
