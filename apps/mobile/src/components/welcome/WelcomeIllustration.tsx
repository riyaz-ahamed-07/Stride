import { Image, StyleSheet, View, type ImageSourcePropType } from "react-native";

export type WelcomeVariant = "video" | "exercise" | "progress";

type Props = {
  variant: WelcomeVariant;
  width: number;
  height: number;
  scale?: number;
};

const SOURCES: Record<WelcomeVariant, ImageSourcePropType> = {
  video: require("../../../assets/welcome-1-video.png"),
  exercise: require("../../../assets/welcome-2-exercise.png"),
  progress: require("../../../assets/welcome-3-progress.png"),
};

export function WelcomeIllustration({ variant, width, height, scale = 1.03 }: Props) {
  return (
    <View style={[styles.wrap, { width, height }]}>
      <Image
        source={SOURCES[variant]}
        style={[styles.image, { transform: [{ scale }] }]}
        resizeMode="contain"
        accessibilityLabel={`Stride ${variant} onboarding illustration`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
