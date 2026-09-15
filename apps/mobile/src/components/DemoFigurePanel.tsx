import { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { KinoveaHumanModelView } from "./KinoveaHumanModelView";
import { variantForRecipe, kinoveaPointsForVariant } from "../lib/kinovea/postureVariants";
import { C } from "../theme";

type Props = {
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  /** Exercise pose recipe — picks Kinovea demo posture variant. */
  poseRecipeKey?: string | null;
};

/**
 * Kinovea human-model form guide — separate from live PoseSkeletonCamera overlay.
 * Uses joint topology from Kinovea/Kinovea (see lib/kinovea/ATTRIBUTION.md).
 */
export function DemoFigurePanel({ style, compact, poseRecipeKey }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const variant = variantForRecipe(poseRecipeKey);
  const points = useMemo(
    () => kinoveaPointsForVariant(variant),
    [variant],
  );

  if (collapsed) {
    return (
      <Pressable
        style={[styles.collapsedChip, style]}
        onPress={() => setCollapsed(false)}
        accessibilityLabel="Expand Kinovea form guide"
        accessibilityRole="button"
      >
        <Text style={styles.collapsedText}>Form guide</Text>
      </Pressable>
    );
  }

  const figureW = compact ? 72 : 88;
  const figureH = compact ? 96 : 118;

  return (
    <View
      style={[styles.panel, compact && styles.panelCompact, style]}
      accessibilityLabel="Kinovea form guide demo figure"
      pointerEvents="box-none"
    >
      <Pressable
        style={styles.headerRow}
        onPress={() => setCollapsed(true)}
        accessibilityLabel="Minimize form guide"
        accessibilityRole="button"
      >
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Form guide</Text>
          <Text style={styles.headerSub}>Kinovea model · not live tracking</Text>
        </View>
        <Text style={styles.minimize}>−</Text>
      </Pressable>

      <View style={[styles.figureStage, compact && styles.figureStageCompact]}>
        <KinoveaHumanModelView points={points} width={figureW} height={figureH} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: 118,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(37, 99, 235, 0.35)",
    paddingBottom: 8,
    shadowColor: "#0F172A",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  panelCompact: {
    width: 100,
    borderRadius: 14,
    paddingBottom: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerCopy: { flex: 1, paddingRight: 4 },
  headerTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: C.text,
    letterSpacing: 0.2,
  },
  headerSub: {
    marginTop: 2,
    fontSize: 8,
    fontWeight: "600",
    color: C.muted,
    lineHeight: 11,
  },
  minimize: {
    fontSize: 18,
    fontWeight: "700",
    color: C.muted,
    lineHeight: 18,
    marginTop: -2,
  },
  figureStage: {
    height: 124,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  figureStageCompact: {
    height: 102,
  },
  collapsedChip: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.4)",
    elevation: 6,
  },
  collapsedText: {
    fontSize: 11,
    fontWeight: "800",
    color: C.primary,
  },
});
