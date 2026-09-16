import { useState } from "react";

import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCameraPermissions } from "expo-camera";

import {
  StridePoseCamera,
  type PoseMetricsPayload,
} from "../components/StridePoseCamera";

import { DemoFigurePanel } from "../components/DemoFigurePanel";

import type { PlanItem } from "../types";

import { C } from "../theme";
import { dosageLabel, exercisePurpose, setupCues } from "../lib/planSchedule";

type Props = {
  item: PlanItem | null;

  saving: boolean;

  error: string;

  onBack: () => void;

  onFinish: (reps: number, notes: string) => void;
};

type CameraLayout = "full" | "mini";

function SessionLogForm({
  reps,

  notes,

  saving,

  error,

  targetReps,

  onRepsChange,

  onNotesChange,

  onFinish,

  onBack,

  compact,
}: {
  reps: string;

  notes: string;

  saving: boolean;

  error: string;

  targetReps: number;

  onRepsChange: (v: string) => void;

  onNotesChange: (v: string) => void;

  onFinish: () => void;

  onBack: () => void;

  compact?: boolean;
}) {
  return (
    <View style={[styles.formCard, compact && styles.formCardCompact]}>
      <Text style={styles.formTitle}>Log your session</Text>

      <Text style={styles.label}>How many repetitions did you complete?</Text>

      <TextInput
        style={styles.input}
        value={reps}
        onChangeText={onRepsChange}
        keyboardType="number-pad"
        placeholder={String(targetReps)}
        placeholderTextColor={C.muted}
      />

      <Text style={styles.label}>Notes for your therapist (optional)</Text>

      <TextInput
        style={[styles.input, styles.textArea]}
        value={notes}
        onChangeText={onNotesChange}
        multiline
        placeholder="e.g. Last two were slower"
        placeholderTextColor={C.muted}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.btnPrimary, saving && styles.btnDisabled]}
        onPress={onFinish}
        disabled={saving}
      >
        <Text style={styles.btnPrimaryText}>
          {saving ? "Saving…" : "I have finished"}
        </Text>
      </Pressable>

      <Pressable style={styles.btnOutline} onPress={onBack}>
        <Text style={styles.btnOutlineText}>Not today</Text>
      </Pressable>
    </View>
  );
}

function CameraStage({
  permissionGranted,

  facing,

  layout,

  poseRecipeKey,

  onMetrics,

  onRequestPermission,

  onFlip,

  onToggleLayout,
}: {
  permissionGranted: boolean;

  facing: "front" | "back";

  layout: CameraLayout;

  poseRecipeKey?: string | null;

  onMetrics?: (metrics: PoseMetricsPayload) => void;

  onRequestPermission: () => void;

  onFlip: () => void;

  onToggleLayout: () => void;
}) {
  const full = layout === "full";

  if (!permissionGranted) {
    return (
      <View style={[styles.permBox, full && styles.permBoxFull]}>
        <Text style={styles.permText}>
          Allow camera access for live movement guidance. If you already denied
          permission, open phone Settings → Apps → Stride → Permissions and enable
          Camera, then return here.
        </Text>

        <Pressable style={styles.btnPrimary} onPress={onRequestPermission}>
          <Text style={styles.btnPrimaryText}>Enable camera</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.cameraWrap,
        full ? styles.cameraWrapFull : styles.cameraWrapMini,
      ]}
    >
      <StridePoseCamera
        facing={facing}
        recipeKey={poseRecipeKey}
        style={styles.cameraFill}
        onMetrics={onMetrics}
      />

      <DemoFigurePanel
        poseRecipeKey={poseRecipeKey}
        style={[styles.demoFigurePanel, full && styles.demoFigurePanelFull]}
        compact={!full}
      />

      <View style={styles.cameraControls} pointerEvents="box-none">
        <Pressable style={styles.chipBtn} onPress={onFlip}>
          <Text style={styles.chipText}>Flip</Text>
        </Pressable>

        <Pressable style={styles.chipBtn} onPress={onToggleLayout}>
          <Text style={styles.chipText}>
            {full ? "Mini view" : "Full screen"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export function MoveScreen({ item, saving, error, onBack, onFinish }: Props) {
  const insets = useSafeAreaInsets();

  const [permission, requestPermission] = useCameraPermissions();

  const [reps, setReps] = useState(
    item ? String(item.target_repetitions) : "8",
  );

  const [notes, setNotes] = useState("");

  const [facing, setFacing] = useState<"front" | "back">("front");

  const [layout, setLayout] = useState<CameraLayout>("full");

  const [showLogSheet, setShowLogSheet] = useState(false);

  const [poseMetrics, setPoseMetrics] = useState<PoseMetricsPayload | null>(
    null,
  );
  const [sessionStarted, setSessionStarted] = useState(false);

  if (!item) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>
          This exercise is not on your current plan. It may have been updated by your
          physiotherapist.
        </Text>

        <Pressable onPress={onBack}>
          <Text style={styles.back}>← Back to plan</Text>
        </Pressable>
      </View>
    );
  }

  const permissionGranted = Boolean(permission?.granted);

  const fullscreen = layout === "full";

  const hasPoseAssist = Boolean(item.pose_recipe_key);

  const finish = () => onFinish(Number(reps), notes);

  function handlePoseMetrics(metrics: PoseMetricsPayload) {
    setPoseMetrics(metrics);
    if (hasPoseAssist && metrics.reliable) {
      setReps(String(Math.max(metrics.reps, 0)));
    }
  }

  const purpose = exercisePurpose(item, undefined);
  const cues = setupCues(item.demo_cue);

  function requestBack() {
    if (!sessionStarted) {
      onBack();
      return;
    }
    Alert.alert(
      "Leave this exercise?",
      "Your session is not saved yet. Leave without saving?",
      [
        { text: "Stay", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: onBack },
      ],
    );
  }

  if (!sessionStarted) {
    return (
      <ScrollView
        contentContainerStyle={[
          styles.briefPage,
          { paddingTop: insets.top + 16 },
        ]}
      >
        <Pressable onPress={requestBack}>
          <Text style={styles.back}>← Program</Text>
        </Pressable>
        <Text style={styles.kicker}>Home exercise</Text>
        <Text style={styles.h1}>{item.exercise_name}</Text>
        {purpose ? (
          <>
            <Text style={styles.sectionLabel}>Purpose</Text>
            <Text style={styles.body}>{purpose}</Text>
          </>
        ) : null}
        <View style={styles.briefFigure}>
          <DemoFigurePanel poseRecipeKey={item.pose_recipe_key} />
        </View>
        {cues.length ? (
          <>
            <Text style={styles.sectionLabel}>Setup and demonstration</Text>
            {cues.map((cue) => (
              <Text key={cue} style={styles.body}>
                {cue}
              </Text>
            ))}
          </>
        ) : null}
        <Text style={styles.sectionLabel}>Movement</Text>
        <Text style={styles.body}>{item.instructions}</Text>
        <View style={styles.alert}>
          <Text style={styles.alertTitle}>
            Stop if you feel pain, dizziness, or unsteadiness
          </Text>
          <Text style={styles.alertBody}>{item.safety_notes}</Text>
        </View>
        <Text style={styles.dosage}>{dosageLabel(item)}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          style={styles.btnPrimary}
          onPress={() => setSessionStarted(true)}
        >
          <Text style={styles.btnPrimaryText}>Start exercise</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (fullscreen) {
    return (
      <View style={styles.fullRoot}>
        <CameraStage
          permissionGranted={permissionGranted}
          facing={facing}
          layout={layout}
          poseRecipeKey={item.pose_recipe_key}
          onMetrics={handlePoseMetrics}
          onRequestPermission={() => void requestPermission()}
          onFlip={() => setFacing((f) => (f === "front" ? "back" : "front"))}
          onToggleLayout={() => setLayout("mini")}
        />

        {poseMetrics && permissionGranted ? (
          <View
            style={[styles.metricsHud, { bottom: insets.bottom + 96 }]}
            pointerEvents="none"
          >
            <Text style={styles.metricsHudText}>
              {hasPoseAssist
                ? `Reps ${poseMetrics.reps} · ${poseMetrics.phase} · ${Math.round(poseMetrics.kneeAngle)}°`
                : `${Math.round(poseMetrics.kneeAngle)}° knee · ${Math.round(poseMetrics.confidence * 100)}%`}
            </Text>
          </View>
        ) : null}

        <View
          style={[styles.fullTopBar, { paddingTop: insets.top + 8 }]}
          pointerEvents="box-none"
        >
          <Pressable onPress={requestBack} hitSlop={12} style={styles.fullBackBtn}>
            <Text style={styles.fullLink}>← Back</Text>
          </Pressable>

          <Text style={styles.fullTitle} numberOfLines={1}>
            {item.exercise_name}
          </Text>

          <View style={styles.fullTopSpacer} />
        </View>

        <View
          style={[styles.fullBottomBar, { paddingBottom: insets.bottom + 12 }]}
          pointerEvents="box-none"
        >
          <Pressable
            style={styles.logFab}
            onPress={() => setShowLogSheet(true)}
          >
            <Text style={styles.logFabText}>Log session</Text>
          </Pressable>
        </View>

        {showLogSheet ? (
          <View style={styles.sheetBackdrop}>
            <Pressable
              style={styles.sheetDismiss}
              onPress={() => setShowLogSheet(false)}
            />

            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={[
                styles.sheet,
                { paddingBottom: insets.bottom + 16 },
              ]}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.sheetHandle} />

              <Text style={styles.sheetHint}>{item.instructions}</Text>

              <SessionLogForm
                reps={reps}
                notes={notes}
                saving={saving}
                error={error}
                targetReps={item.target_repetitions}
                onRepsChange={setReps}
                onNotesChange={setNotes}
                onFinish={() => {
                  finish();

                  setShowLogSheet(false);
                }}
                onBack={requestBack}
                compact
              />
            </ScrollView>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      <Pressable onPress={requestBack}>
        <Text style={styles.back}>← Exercises</Text>
      </Pressable>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {hasPoseAssist
            ? "Guided · live skeleton on you"
            : "Live skeleton on you · form guide in corner"}
        </Text>
      </View>

      <Text style={styles.h1}>{item.exercise_name}</Text>

      <Text style={styles.body}>{item.instructions}</Text>

      <View style={styles.alert}>
        <Text style={styles.alertTitle}>Stop immediately if you feel pain</Text>

        <Text style={styles.alertBody}>
          Dizziness or unsteadiness means stop and rest. {item.safety_notes}
        </Text>
      </View>

      <View style={styles.cameraCard}>
        <View style={styles.cameraCardHead}>
          <Text style={styles.formTitle}>Your camera</Text>

          <Pressable onPress={() => setLayout("full")}>
            <Text style={styles.expandLink}>Full screen</Text>
          </Pressable>
        </View>

        <CameraStage
          permissionGranted={permissionGranted}
          facing={facing}
          layout="mini"
          poseRecipeKey={item.pose_recipe_key}
          onMetrics={handlePoseMetrics}
          onRequestPermission={() => void requestPermission()}
          onFlip={() => setFacing((f) => (f === "front" ? "back" : "front"))}
          onToggleLayout={() => setLayout("full")}
        />
      </View>

      <SessionLogForm
        reps={reps}
        notes={notes}
        saving={saving}
        error={error}
        targetReps={item.target_repetitions}
        onRepsChange={setReps}
        onNotesChange={setNotes}
        onFinish={finish}
        onBack={requestBack}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 32 },

  missing: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  missingText: { fontSize: 17, color: C.muted, marginBottom: 12 },

  back: { color: C.primary, fontWeight: "700", marginBottom: 16, fontSize: 16 },

  badge: {
    alignSelf: "flex-start",

    backgroundColor: C.warningSoft,

    paddingHorizontal: 12,

    paddingVertical: 6,

    borderRadius: 999,

    marginBottom: 12,
  },

  badgeText: { fontSize: 13, fontWeight: "700", color: "#B45309" },

  h1: { fontSize: 28, fontWeight: "800", color: C.text, marginBottom: 12 },

  body: { fontSize: 17, color: C.text, lineHeight: 26, marginBottom: 16 },

  alert: {
    backgroundColor: C.dangerSoft,

    borderRadius: 14,

    padding: 16,

    borderLeftWidth: 4,

    borderLeftColor: C.danger,

    marginBottom: 20,
  },

  alertTitle: {
    fontWeight: "800",
    color: C.danger,
    marginBottom: 6,
    fontSize: 16,
  },

  alertBody: { fontSize: 15, color: C.text, lineHeight: 22 },

  cameraCard: {
    backgroundColor: C.surface,

    borderRadius: 20,

    padding: 16,

    borderWidth: 1,

    borderColor: C.border,

    marginBottom: 16,
  },

  cameraCardHead: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    marginBottom: 12,
  },

  expandLink: { color: C.primary, fontWeight: "700", fontSize: 14 },

  cameraWrap: {
    borderRadius: 16,

    overflow: "hidden",

    backgroundColor: "#0F172A",

    position: "relative",
  },

  cameraWrapMini: { height: 320 },

  cameraWrapFull: {
    ...StyleSheet.absoluteFillObject,

    borderRadius: 0,
  },

  cameraFill: { ...StyleSheet.absoluteFillObject },

  demoFigurePanel: {
    position: "absolute",
    right: 12,
    bottom: 12,
    zIndex: 5,
  },

  demoFigurePanelFull: { bottom: 96 },

  metricsHud: {
    position: "absolute",
    left: 12,
    zIndex: 4,
    backgroundColor: "rgba(15, 23, 42, 0.78)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.45)",
  },

  metricsHudText: {
    color: "#fde047",
    fontWeight: "700",
    fontSize: 12,
  },

  cameraControls: {
    position: "absolute",

    left: 12,

    bottom: 12,

    flexDirection: "row",

    gap: 8,

    zIndex: 3,
  },

  chipBtn: {
    backgroundColor: "rgba(15, 23, 42, 0.72)",

    paddingHorizontal: 14,

    paddingVertical: 8,

    borderRadius: 999,

    borderWidth: 1,

    borderColor: "rgba(216, 255, 88, 0.35)",
  },

  chipText: { color: "#d8ff58", fontWeight: "700", fontSize: 13 },

  permBox: { gap: 12, paddingVertical: 8 },

  permBoxFull: { flex: 1, justifyContent: "center", padding: 24 },

  permText: { fontSize: 15, color: "#CBD5E1", lineHeight: 22 },

  formCard: {
    backgroundColor: C.surface,

    borderRadius: 20,

    padding: 20,

    borderWidth: 1,

    borderColor: C.border,
  },

  formCardCompact: { borderWidth: 0, paddingHorizontal: 0, paddingTop: 8 },

  formTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.text,
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
    marginBottom: 8,
    marginTop: 8,
  },

  input: {
    minHeight: 52,

    borderWidth: 1.5,

    borderColor: C.border,

    borderRadius: 14,

    backgroundColor: "#F8FAFC",

    paddingHorizontal: 16,

    fontSize: 17,

    color: C.text,
  },

  textArea: { minHeight: 96, paddingTop: 14, textAlignVertical: "top" },

  error: { color: C.danger, fontWeight: "600", marginTop: 10 },

  btnPrimary: {
    minHeight: 54,

    backgroundColor: C.primary,

    borderRadius: 999,

    alignItems: "center",

    justifyContent: "center",

    marginTop: 12,
  },

  btnDisabled: { opacity: 0.7 },

  btnPrimaryText: { color: "white", fontSize: 17, fontWeight: "700" },

  btnOutline: {
    minHeight: 48,

    borderWidth: 1.5,

    borderColor: C.border,

    borderRadius: 999,

    alignItems: "center",

    justifyContent: "center",

    marginTop: 12,

    backgroundColor: C.surface,
  },

  btnOutlineText: { color: C.text, fontWeight: "700", fontSize: 16 },

  fullRoot: { flex: 1, backgroundColor: "#0F172A" },

  fullTopBar: {
    position: "absolute",

    top: 0,

    left: 0,

    right: 0,

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 16,

    paddingBottom: 8,

    zIndex: 4,

    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },

  fullBackBtn: { minWidth: 72 },

  fullLink: { color: "#d8ff58", fontWeight: "700", fontSize: 16 },

  fullTitle: {
    flex: 1,

    textAlign: "center",

    color: "white",

    fontWeight: "800",

    fontSize: 17,
  },

  fullTopSpacer: { minWidth: 72 },

  fullBottomBar: {
    position: "absolute",

    left: 0,

    right: 0,

    bottom: 0,

    alignItems: "center",

    zIndex: 4,
  },

  logFab: {
    backgroundColor: C.primary,

    paddingHorizontal: 28,

    paddingVertical: 14,

    borderRadius: 999,

    shadowColor: "#000",

    shadowOpacity: 0.25,

    shadowRadius: 8,

    elevation: 4,
  },

  logFabText: { color: "white", fontWeight: "800", fontSize: 16 },

  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,

    zIndex: 5,

    justifyContent: "flex-end",
  },

  sheetDismiss: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  sheetScroll: { maxHeight: "72%" },

  sheet: {
    backgroundColor: C.surface,

    borderTopLeftRadius: 24,

    borderTopRightRadius: 24,

    paddingHorizontal: 20,

    paddingTop: 12,
  },

  sheetHandle: {
    alignSelf: "center",

    width: 40,

    height: 4,

    borderRadius: 2,

    backgroundColor: C.border,

    marginBottom: 12,
  },

  sheetHint: { fontSize: 14, color: C.muted, lineHeight: 20, marginBottom: 8 },

  briefPage: { paddingHorizontal: 24, paddingBottom: 40 },
  kicker: {
    fontSize: 15,
    fontWeight: "600",
    color: C.muted,
    marginBottom: 6,
    marginTop: 12,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: "800",
    color: C.text,
    marginTop: 20,
    marginBottom: 8,
  },
  briefFigure: { alignItems: "flex-start", marginVertical: 12 },
  dosage: {
    fontSize: 18,
    fontWeight: "800",
    color: C.text,
    marginBottom: 20,
    marginTop: 8,
  },
});
