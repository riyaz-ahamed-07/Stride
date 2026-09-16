import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { C } from "../theme";

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <View style={styles.loading} accessibilityRole="progressbar">
      <ActivityIndicator color={C.primary} />
      <Text style={styles.loadingText}>{label}</Text>
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
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {actionLabel && onAction ? (
        <Pressable style={styles.primary} onPress={onAction}>
          <Text style={styles.primaryText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
  retryLabel = "Try again",
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <View style={styles.errorBox} accessibilityRole="alert">
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? (
        <Pressable style={styles.primary} onPress={onRetry}>
          <Text style={styles.primaryText}>{retryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 24,
  },
  loadingText: { fontSize: 16, color: C.muted },
  empty: { marginBottom: 24 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.text,
    marginBottom: 8,
  },
  emptyBody: { fontSize: 16, color: C.text, lineHeight: 24, marginBottom: 12 },
  errorBox: {
    backgroundColor: C.dangerSoft,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  errorText: {
    color: C.danger,
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 12,
    lineHeight: 22,
  },
  banner: {
    backgroundColor: C.successSoft,
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  bannerText: { color: C.success, fontWeight: "600", fontSize: 15 },
  primary: {
    minHeight: 48,
    backgroundColor: C.primary,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  primaryText: { color: "white", fontSize: 16, fontWeight: "700" },
});
