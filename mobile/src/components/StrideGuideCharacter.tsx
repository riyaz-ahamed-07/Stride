import { useEffect } from "react";
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";
import { colors } from "../theme";

type Props = {
  width?: number;
  height?: number;
  /** Optional sheet exports — when both set, crossfades stand ↔ squat. */
  standingImage?: ImageSourcePropType;
  squattingImage?: ImageSourcePropType;
};

/**
 * Stride brand character form guide — loops standing ↔ squat.
 * Drop transparent PNGs from the character sheet (Functional: Standing + Squatting)
 * via standingImage / squattingImage for pixel-perfect art.
 */
export function StrideGuideCharacter({
  width = 88,
  height = 118,
  standingImage,
  squattingImage,
}: Props) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [t]);

  const standStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.45, 1], [1, 0.35, 0]),
  }));

  const squatStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.55, 1], [0, 0.4, 1]),
  }));

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(t.value, [0, 1], [0, 6]) },
      { scaleY: interpolate(t.value, [0, 1], [1, 0.9]) },
      { scaleX: interpolate(t.value, [0, 1], [1, 1.04]) },
    ],
  }));

  if (standingImage && squattingImage) {
    return (
      <View style={[styles.wrap, { width, height }]}>
        <Animated.View style={[styles.layer, standStyle]}>
          <Image
            source={standingImage}
            style={styles.image}
            resizeMode="contain"
          />
        </Animated.View>
        <Animated.View style={[styles.layer, squatStyle]}>
          <Image
            source={squattingImage}
            style={styles.image}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    );
  }

  const blue = colors.brand.primary;
  const mid = colors.brand.primaryHover;
  const deep = colors.brand.primaryPressed;

  return (
    <Animated.View style={[styles.wrap, { width, height }, bounceStyle]}>
      <Svg width={width} height={height} viewBox="0 0 100 140">
        <Ellipse cx="28" cy="56" rx="7" ry="15" fill={mid} />
        <Ellipse cx="72" cy="56" rx="7" ry="15" fill={mid} />
        <Circle cx="28" cy="74" r="5" fill={blue} />
        <Circle cx="72" cy="74" r="5" fill={blue} />
        <Ellipse cx="50" cy="50" rx="16" ry="22" fill={blue} />
        <Path
          d="M34 40c4-10 12-14 16-14s12 4 16 14c-6 2-11 3-16 3s-10-1-16-3z"
          fill={deep}
        />
        <Ellipse cx="50" cy="36" rx="11" ry="13" fill={mid} />
        <Path
          d="M42 28c3-8 8-11 12-8 2 2 3 6 2 10-5-1-10-1-14-2z"
          fill={deep}
        />
        <Rect x="40" y="70" width="8" height="30" rx="4" fill={deep} />
        <Rect x="52" y="70" width="8" height="30" rx="4" fill={deep} />
        <Ellipse cx="44" cy="104" rx="7" ry="4" fill={blue} />
        <Ellipse cx="56" cy="104" rx="7" ry="4" fill={blue} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
