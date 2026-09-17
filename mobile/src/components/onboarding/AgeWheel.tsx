import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Platform,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { O } from "./OnboardingShell";

const VISIBLE = 9;
const ITEM_H = 84;
/** Selected digit size — must fit inside ITEM_H for true vertical center. */
const SELECTED_SIZE = 72;
/** Selected ↔ nearest neighbors. */
const GAP_NEAR = 48;
/** Extra push for ±2. */
const GAP_MID = 26;
const GAP_FAR = 10;
/** 20% tighter ±2↔±3. */
const GAP_23 = 0.8 * (ITEM_H + GAP_FAR) - ITEM_H;
const VIEW_H = ITEM_H * VISIBLE;
const PILL_W = 200;
const PILL_H = 140;
const PAD = ((VISIBLE - 1) / 2) * ITEM_H;

type Props = {
  value: number;
  min?: number;
  max?: number;
  onChange: (age: number) => void;
};

function AgeRow({
  age,
  index,
  scrollY,
}: {
  age: number;
  index: number;
  scrollY: SharedValue<number>;
}) {
  const slotStyle = useAnimatedStyle(() => {
    const center = index * ITEM_H;
    const dist = (scrollY.value - center) / ITEM_H;
    const abs = Math.abs(dist);

    const translateY = interpolate(
      dist,
      [-4, -3, -2, -1, 0, 1, 2, 3, 4],
      [
        GAP_NEAR + GAP_MID + GAP_23 + GAP_FAR,
        GAP_NEAR + GAP_MID + GAP_23,
        GAP_NEAR + GAP_MID,
        GAP_NEAR,
        0,
        -GAP_NEAR,
        -(GAP_NEAR + GAP_MID),
        -(GAP_NEAR + GAP_MID + GAP_23),
        -(GAP_NEAR + GAP_MID + GAP_23 + GAP_FAR),
      ],
      Extrapolation.CLAMP,
    );

    return {
      opacity: interpolate(
        abs,
        [0, 1.5, 2.5, 3.5, 4.2],
        [1, 1, 0.78, 0.5, 0.28],
        Extrapolation.CLAMP,
      ),
      transform: [
        { translateY },
        {
          scale: interpolate(
            abs,
            [0, 1, 2, 3, 4],
            [1, 0.98, 0.88, 0.84, 0.8],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const textStyle = useAnimatedStyle(() => {
    const center = index * ITEM_H;
    const dist = (scrollY.value - center) / ITEM_H;
    const abs = Math.abs(dist);
    const fontSize = interpolate(
      abs,
      [0, 1, 2, 3, 4],
      [SELECTED_SIZE, 54, 30, 24, 20],
      Extrapolation.CLAMP,
    );

    return {
      fontSize,
      lineHeight: fontSize,
      letterSpacing: interpolate(
        abs,
        [0, 1, 4],
        [0, -1.2, -0.3],
        Extrapolation.CLAMP,
      ),
      color: interpolateColor(
        abs,
        [0, 0.45, 1, 2, 3, 4],
        [O.white, O.white, O.gray60, O.gray40, O.gray30, O.gray30],
      ),
    };
  });

  return (
    <View style={styles.row}>
      <Animated.View style={[styles.ageSlot, slotStyle]}>
        <Animated.Text style={[styles.ageBase, textStyle]}>{age}</Animated.Text>
      </Animated.View>
    </View>
  );
}

export function AgeWheel({ value, min = 12, max = 100, onChange }: Props) {
  const ages = useMemo(
    () => Array.from({ length: max - min + 1 }, (_, i) => min + i),
    [min, max],
  );
  const snapOffsets = useMemo(() => ages.map((_, i) => i * ITEM_H), [ages]);
  const listRef = useRef<Animated.FlatList<number>>(null);
  const scrollY = useSharedValue(
    Math.max(0, Math.min(max - min, value - min)) * ITEM_H,
  );
  const valueRef = useRef(value);
  valueRef.current = value;

  const scrollToIndex = useCallback(
    (index: number, animated: boolean) => {
      const clamped = Math.max(0, Math.min(ages.length - 1, index));
      listRef.current?.scrollToOffset({
        offset: clamped * ITEM_H,
        animated,
      });
    },
    [ages.length],
  );

  useEffect(() => {
    const index = Math.max(0, Math.min(ages.length - 1, value - min));
    scrollY.value = index * ITEM_H;
    const id = requestAnimationFrame(() => {
      scrollToIndex(index, false);
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ages.length, min]);

  function commitAge(offsetY: number) {
    const next = Math.round(offsetY / ITEM_H);
    const clamped = Math.max(0, Math.min(ages.length - 1, next));
    const age = ages[clamped]!;
    if (age !== valueRef.current) onChange(age);
  }

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
    onEndDrag: (event) => {
      const vy = event.velocity?.y ?? 0;
      if (Math.abs(vy) < 0.08) {
        runOnJS(commitAge)(event.contentOffset.y);
      }
    },
    onMomentumEnd: (event) => {
      runOnJS(commitAge)(event.contentOffset.y);
    },
  });

  const getItemLayout = useCallback(
    (_: ArrayLike<number> | null | undefined, index: number) => ({
      length: ITEM_H,
      offset: ITEM_H * index,
      index,
    }),
    [],
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<number>) => (
      <AgeRow age={item} index={index} scrollY={scrollY} />
    ),
    [scrollY],
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.pillLayer} pointerEvents="none">
        <View style={styles.pillGlow}>
          <View style={styles.pill} />
        </View>
      </View>
      <Animated.FlatList
        ref={listRef}
        data={ages}
        keyExtractor={(item) => String(item)}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        showsVerticalScrollIndicator={false}
        snapToOffsets={snapOffsets}
        snapToAlignment="start"
        disableIntervalMomentum={false}
        decelerationRate={Platform.OS === "ios" ? "normal" : 0.985}
        bounces
        overScrollMode="never"
        scrollEventThrottle={16}
        onScroll={onScroll}
        contentContainerStyle={styles.content}
        initialNumToRender={VISIBLE + 8}
        windowSize={15}
        maxToRenderPerBatch={12}
        removeClippedSubviews={false}
        nestedScrollEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: VIEW_H,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    alignSelf: "center",
    flexGrow: 1,
    maxHeight: VIEW_H + 24,
  },
  pillLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 0,
  },
  pillGlow: {
    width: PILL_W + 8,
    height: PILL_H + 8,
    borderRadius: 60,
    backgroundColor: O.ring,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    width: PILL_W,
    height: PILL_H,
    borderRadius: 56,
    backgroundColor: O.green,
    borderWidth: 1.5,
    borderColor: O.greenSoft,
  },
  content: {
    paddingVertical: PAD,
  },
  row: {
    height: ITEM_H,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  ageSlot: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  ageBase: {
    fontWeight: "800",
    textAlign: "center",
    includeFontPadding: false,
    textAlignVertical: "center",
    width: "100%",
  },
});
