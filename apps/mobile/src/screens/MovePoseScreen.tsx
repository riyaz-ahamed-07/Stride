import { Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import type { PlanItem } from "../types";
import { C } from "../theme";

const WEB =
  process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/$/, "") ?? "http://10.201.4.144:3001";

type Props = {
  item: PlanItem;
  accessToken: string;
  onBack: () => void;
  onDone: () => void;
};

/** Full guided session: live camera + skeleton overlay via web MediaPipe page. */
export function MovePoseScreen({ item, accessToken, onBack, onDone }: Props) {
  const uri = `${WEB}/patient/move/${item.id}?embed=1&token=${encodeURIComponent(accessToken)}`;

  return (
    <View style={styles.fill}>
      <View style={styles.bar}>
        <Pressable onPress={onBack}>
          <Text style={styles.link}>Exit</Text>
        </Pressable>
        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>
            {item.exercise_name}
          </Text>
          <Text style={styles.target}>Target {item.target_repetitions} reps</Text>
        </View>
        <Pressable onPress={onDone}>
          <Text style={styles.link}>Done</Text>
        </Pressable>
      </View>
      <WebView
        source={{ uri }}
        style={styles.fill}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.bg },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  center: { flex: 1, marginHorizontal: 8 },
  link: { color: C.primary, fontWeight: "700", fontSize: 15 },
  title: { textAlign: "center", fontWeight: "800", fontSize: 16, color: C.text },
  target: { textAlign: "center", fontSize: 12, color: C.muted, marginTop: 2 },
});
