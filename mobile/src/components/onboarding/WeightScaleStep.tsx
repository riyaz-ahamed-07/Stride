import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { O } from "./OnboardingShell";
import { type as typography } from "../../theme";

export type WeightUnit = "kg" | "lbs";

type Props = {
  value: number;
  unit: WeightUnit;
  onChange: (value: number) => void;
  onUnitChange: (unit: WeightUnit) => void;
  disabled?: boolean;
};

const TICK_GAP = 16;
const SCREEN_W = Dimensions.get("window").width;
const SIDE_PAD = SCREEN_W / 2 - TICK_GAP / 2;
const RULER_MIN_H = 180;

const KG_MIN = 30;
const KG_MAX = 200;
const LBS_MIN = 66;
const LBS_MAX = 440;

function rangeFor(unit: WeightUnit) {
  return unit === "kg"
    ? { min: KG_MIN, max: KG_MAX }
    : { min: LBS_MIN, max: LBS_MAX };
}

function kgToLbs(kg: number) {
  return Math.round(kg * 2.20462);
}

function lbsToKg(lbs: number) {
  return Math.round(lbs / 2.20462);
}

export function WeightScaleStep({
  value,
  unit,
  onChange,
  onUnitChange,
  disabled,
}: Props) {
  const { min, max } = rangeFor(unit);
  const ticks = useMemo(
    () => Array.from({ length: max - min + 1 }, (_, i) => min + i),
    [min, max],
  );
  const listRef = useRef<Animated.FlatList<number>>(null);
  const scrollX = useSharedValue((value - min) * TICK_GAP);
  const [display, setDisplay] = useState(value);
  const [rulerH, setRulerH] = useState(RULER_MIN_H);
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const scrollToValue = useCallback(
    (next: number, animated: boolean) => {
      const clamped = Math.max(min, Math.min(max, next));
      listRef.current?.scrollToOffset({
        offset: (clamped - min) * TICK_GAP,
        animated,
      });
    },
    [min, max],
  );

  useEffect(() => {
    const clamped = Math.max(min, Math.min(max, value));
    setDisplay(clamped);
    scrollX.value = (clamped - min) * TICK_GAP;
    const id = requestAnimationFrame(() => scrollToValue(clamped, false));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, min, max]);

  function commitFromOffset(x: number) {
    const next = Math.round(x / TICK_GAP) + min;
    const clamped = Math.max(min, Math.min(max, next));
    setDisplay(clamped);
    if (clamped !== valueRef.current) onChangeRef.current(clamped);
  }

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
      const next = Math.round(e.contentOffset.x / TICK_GAP) + min;
      runOnJS(setDisplay)(Math.max(min, Math.min(max, next)));
    },
    onEndDrag: (e) => {
      const vx = e.velocity?.x ?? 0;
      if (Math.abs(vx) < 0.08) {
        runOnJS(commitFromOffset)(e.contentOffset.x);
      }
    },
    onMomentumEnd: (e) => {
      runOnJS(commitFromOffset)(e.contentOffset.x);
    },
  });

  function switchUnit(next: WeightUnit) {
    if (next === unit || disabled) return;
    const converted = next === "lbs" ? kgToLbs(value) : lbsToKg(value);
    onUnitChange(next);
    onChange(converted);
  }

  const snapOffsets = useMemo(() => ticks.map((_, i) => i * TICK_GAP), [ticks]);

  const minorH = Math.round(rulerH * 0.28);
  const majorH = Math.round(rulerH * 0.52);
  const indicatorH = Math.round(Math.max(rulerH - 16, majorH + 24) * 0.792);

  return (
    <View style={styles.wrap}>
      <View style={styles.unitRow}>
        <Pressable
          style={[styles.unitBtn, unit === "kg" && styles.unitBtnOn]}
          onPress={() => switchUnit("kg")}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ selected: unit === "kg" }}
        >
          <Text style={[styles.unitText, unit === "kg" && styles.unitTextOn]}>
            Kilogram
          </Text>
        </Pressable>
        <Pressable
          style={[styles.unitBtn, unit === "lbs" && styles.unitBtnOn]}
          onPress={() => switchUnit("lbs")}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ selected: unit === "lbs" }}
        >
          <Text style={[styles.unitText, unit === "lbs" && styles.unitTextOn]}>
            Pounds
          </Text>
        </Pressable>
      </View>

      <View style={styles.valueBlock}>
        <View style={styles.valueRow}>
          <Text style={styles.valueNum}>{display}</Text>
          <Text style={styles.valueUnit}>{unit}</Text>
        </View>
      </View>

      <View
        style={styles.rulerWrap}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0 && Math.abs(h - rulerH) > 1) setRulerH(h);
        }}
      >
        <Animated.FlatList
          key={unit}
          ref={listRef}
          horizontal
          data={ticks}
          keyExtractor={(item) => String(item)}
          showsHorizontalScrollIndicator={false}
          snapToOffsets={snapOffsets}
          decelerationRate={Platform.OS === "ios" ? "normal" : 0.985}
          scrollEventThrottle={16}
          onScroll={onScroll}
          scrollEnabled={!disabled}
          style={{ height: rulerH }}
          initialScrollIndex={Math.max(
            0,
            Math.min(ticks.length - 1, value - min),
          )}
          getItemLayout={(_, index) => ({
            length: TICK_GAP,
            offset: TICK_GAP * index,
            index,
          })}
          contentContainerStyle={{
            paddingHorizontal: SIDE_PAD,
            alignItems: "center",
          }}
          initialNumToRender={40}
          windowSize={11}
          renderItem={({ item }) => {
            const major = item % 5 === 0;
            return (
              <View style={[styles.tickCol, { height: rulerH }]}>
                <View style={styles.tickStack}>
                  <View
                    style={[
                      styles.tick,
                      {
                        height: major ? majorH : minorH,
                        backgroundColor: major ? O.gray40 : O.gray30,
                      },
                    ]}
                  />
                  {major ? (
                    <Text style={styles.tickLabel}>{item}</Text>
                  ) : (
                    <View style={styles.tickLabelSpacer} />
                  )}
                </View>
              </View>
            );
          }}
        />
        <View
          style={[
            styles.indicator,
            {
              height: indicatorH,
              top: (rulerH - indicatorH) / 2,
            },
          ]}
          pointerEvents="none"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    width: "100%",
  },
  unitRow: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
    marginTop: 4,
  },
  unitBtn: {
    flex: 1,
    minHeight: 56,
    borderRadius: 21,
    backgroundColor: O.gray20,
    alignItems: "center",
    justifyContent: "center",
  },
  unitBtnOn: {
    backgroundColor: O.green,
    borderWidth: 1.5,
    borderColor: O.greenSoft,
    shadowColor: O.green,
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  unitText: {
    fontSize: 18,
    fontWeight: "800",
    color: O.gray60,
    fontFamily: typography.fontFamilyExtraBold,
    letterSpacing: -0.18,
  },
  unitTextOn: { color: O.white },
  valueBlock: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
    paddingTop: 18,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 10,
  },
  valueNum: {
    fontSize: 128,
    lineHeight: 138,
    fontWeight: "800",
    letterSpacing: -3.6,
    color: O.gray80,
    fontFamily: typography.fontFamilyExtraBold,
  },
  valueUnit: {
    fontSize: 58,
    lineHeight: 68,
    fontWeight: "600",
    color: O.gray40,
    paddingBottom: 16,
    fontFamily: typography.fontFamilySemiBold,
    letterSpacing: -1,
  },
  rulerWrap: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    width: SCREEN_W,
    marginHorizontal: -16,
    minHeight: RULER_MIN_H,
    justifyContent: "center",
    marginBottom: 4,
  },
  tickCol: {
    width: TICK_GAP,
    alignItems: "center",
    justifyContent: "center",
  },
  tickStack: {
    alignItems: "center",
    justifyContent: "center",
  },
  tick: {
    width: 2,
    borderRadius: 1,
  },
  tickLabel: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "600",
    color: O.gray40,
    width: 40,
    textAlign: "center",
    fontFamily: typography.fontFamilySemiBold,
  },
  tickLabelSpacer: {
    marginTop: 4,
    height: 16,
  },
  indicator: {
    position: "absolute",
    left: (SCREEN_W - 8) / 2,
    width: 8,
    borderRadius: 3,
    backgroundColor: O.green,
    shadowColor: O.green,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
});
