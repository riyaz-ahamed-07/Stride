import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { ChevronsRight, CircleHelp } from "lucide-react-native";
import { O } from "./OnboardingShell";
import { colors, type as typography } from "../../theme";

export type FitnessLevel = {
  id: string;
  label: string;
  detail: string;
};

export const FITNESS_LEVELS: FitnessLevel[] = [
  { id: "sedentary", label: "Sedentary", detail: "Rarely" },
  { id: "light", label: "Light", detail: "1x Weekly" },
  { id: "moderate", label: "Moderate", detail: "2–3x Weekly" },
  { id: "active", label: "Active", detail: "4–5x Weekly" },
  { id: "frequent", label: "Frequent", detail: "6x Weekly" },
  { id: "athlete", label: "Athlete", detail: "Daily" },
];

type Props = {
  value: number;
  onChange: (index: number) => void;
  disabled?: boolean;
};

const THUMB = 80;
const TRACK_H = 80;
const FILL = colors.brand.primaryHover;
const TICK = "#8EC8F8";
const LEVEL_COUNT = FITNESS_LEVELS.length;

function clampIndex(n: number) {
  return Math.max(0, Math.min(LEVEL_COUNT - 1, n));
}

export function FitnessLevelStep({ value, onChange, disabled }: Props) {
  const [trackW, setTrackW] = useState(0);
  const [liveIndex, setLiveIndex] = useState(value);

  const thumbX = useRef(new Animated.Value(0)).current;
  const dragStartX = useRef(0);
  const trackWRef = useRef(0);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const disabledRef = useRef(!!disabled);
  const draggingRef = useRef(false);

  valueRef.current = value;
  onChangeRef.current = onChange;
  disabledRef.current = !!disabled;

  function xForIndex(index: number, width: number) {
    const max = Math.max(0, width - THUMB);
    const step = LEVEL_COUNT > 1 ? max / (LEVEL_COUNT - 1) : 0;
    return clampIndex(index) * step;
  }

  useEffect(() => {
    if (draggingRef.current) return;
    setLiveIndex(value);
    if (trackWRef.current > 0) {
      thumbX.setValue(xForIndex(value, trackWRef.current));
    }
  }, [value, thumbX]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onStartShouldSetPanResponderCapture: () => !disabledRef.current,
      onMoveShouldSetPanResponder: (_, g) =>
        !disabledRef.current && Math.abs(g.dx) > 2,
      onMoveShouldSetPanResponderCapture: (_, g) =>
        !disabledRef.current && Math.abs(g.dx) > 2,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        draggingRef.current = true;
        const width = trackWRef.current;
        const max = Math.max(0, width - THUMB);
        const step = LEVEL_COUNT > 1 ? max / (LEVEL_COUNT - 1) : 0;
        const locX = evt.nativeEvent.locationX;
        const touchX = Math.max(0, Math.min(max, locX - THUMB / 2));
        dragStartX.current = touchX;
        thumbX.setValue(touchX);
        const idx = clampIndex(Math.round(touchX / Math.max(step, 1)));
        setLiveIndex(idx);
      },
      onPanResponderMove: (_, g) => {
        const width = trackWRef.current;
        const max = Math.max(0, width - THUMB);
        const step = LEVEL_COUNT > 1 ? max / (LEVEL_COUNT - 1) : 0;
        const next = Math.max(0, Math.min(max, dragStartX.current + g.dx));
        thumbX.setValue(next);
        const idx = clampIndex(Math.round(next / Math.max(step, 1)));
        setLiveIndex(idx);
      },
      onPanResponderRelease: (_, g) => {
        const width = trackWRef.current;
        const max = Math.max(0, width - THUMB);
        const step = LEVEL_COUNT > 1 ? max / (LEVEL_COUNT - 1) : 0;
        const next = Math.max(0, Math.min(max, dragStartX.current + g.dx));
        const idx = clampIndex(Math.round(next / Math.max(step, 1)));
        const snapped = idx * step;
        Animated.spring(thumbX, {
          toValue: snapped,
          useNativeDriver: false,
          bounciness: 4,
          speed: 20,
        }).start(() => {
          draggingRef.current = false;
        });
        setLiveIndex(idx);
        if (idx !== valueRef.current) onChangeRef.current(idx);
        else draggingRef.current = false;
      },
      onPanResponderTerminate: () => {
        const width = trackWRef.current;
        const idx = valueRef.current;
        thumbX.setValue(xForIndex(idx, width));
        setLiveIndex(idx);
        draggingRef.current = false;
      },
    }),
  ).current;

  function onTrackLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    if (w <= 0) return;
    if (Math.abs(w - trackWRef.current) < 1) return;
    trackWRef.current = w;
    setTrackW(w);
    if (!draggingRef.current) {
      thumbX.setValue(xForIndex(valueRef.current, w));
    }
  }

  const level = FITNESS_LEVELS[liveIndex] ?? FITNESS_LEVELS[2]!;
  const tickPositions =
    trackW > 0 ? [1, 2, 3, 4].map((i) => (trackW * i) / 6) : [];
  const fillWidth = Animated.add(thumbX, THUMB);

  return (
    <View style={styles.wrap}>
      <View style={styles.artWrap} pointerEvents="none">
        <Image
          source={require("../../../assets/onboarding/fitness-level.png")}
          style={styles.art}
          resizeMode="contain"
        />
      </View>

      <View style={styles.sliderBlock}>
        <View
          style={styles.trackOuter}
          onLayout={onTrackLayout}
          {...panResponder.panHandlers}
        >
          <View style={styles.track}>
            <Animated.View
              style={[styles.fill, { width: fillWidth, backgroundColor: FILL }]}
              pointerEvents="none"
            >
              {tickPositions.map((x) => (
                <View
                  key={x}
                  style={[styles.tick, { left: x - 2 }]}
                  pointerEvents="none"
                />
              ))}
            </Animated.View>
            <Animated.View
              style={[styles.thumb, { transform: [{ translateX: thumbX }] }]}
              pointerEvents="none"
            >
              <ChevronsRight size={28} color="#fff" strokeWidth={2.6} />
            </Animated.View>
          </View>
        </View>

        <View style={styles.labels}>
          <View style={styles.labelLeft}>
            <Text style={styles.labelPrimary}>{level.label}</Text>
            <CircleHelp size={18} color={O.gray30} strokeWidth={2.2} />
          </View>
          <Text style={styles.labelDetail}>{level.detail}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    width: "100%",
    justifyContent: "space-between",
    paddingBottom: 0,
  },
  artWrap: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
    overflow: "hidden",
  },
  art: {
    width: "108%",
    height: 240,
    transform: [{ scale: 0.952 }],
  },
  sliderBlock: {
    gap: 12,
    width: "100%",
    marginTop: -28,
    marginBottom: 8,
  },
  trackOuter: {
    width: "100%",
    height: TRACK_H + 16,
    justifyContent: "center",
  },
  track: {
    width: "100%",
    height: TRACK_H,
    borderRadius: 30,
    backgroundColor: O.white,
    overflow: "hidden",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 30,
    overflow: "hidden",
  },
  tick: {
    position: "absolute",
    top: 20,
    width: 4,
    height: 40,
    borderRadius: 2,
    backgroundColor: TICK,
  },
  thumb: {
    position: "absolute",
    left: 0,
    top: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: 30,
    backgroundColor: O.green,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: O.green,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
    zIndex: 2,
  },
  labels: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 24,
  },
  labelLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  labelPrimary: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
    color: O.gray80,
    fontFamily: typography.fontFamilyExtraBold,
    letterSpacing: -0.13,
  },
  labelDetail: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    color: O.gray60,
    fontFamily: typography.fontFamilySemiBold,
    letterSpacing: -0.13,
  },
});
