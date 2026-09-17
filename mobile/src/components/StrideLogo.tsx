import {
  Image,
  StyleSheet,
  View,
  type ImageStyle,
  type ImageSourcePropType,
  type ViewStyle,
} from "react-native";

export type LogoVariant = "primary" | "white" | "black" | "icon" | "icon-white";

const SOURCES: Record<LogoVariant, ImageSourcePropType> = {
  primary: require("../../assets/brand/logo-primary.png"),
  white: require("../../assets/brand/logo-white.png"),
  black: require("../../assets/brand/logo-black.png"),
  icon: require("../../assets/brand/icon.png"),
  "icon-white": require("../../assets/brand/icon-white.png"),
};

type Props = {
  size?: number;
  variant?: LogoVariant;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
};

export function StrideLogo({
  size = 64,
  variant = "primary",
  style,
  imageStyle,
}: Props) {
  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      <Image
        source={SOURCES[variant]}
        style={[
          styles.image,
          { width: size, height: size, borderRadius: size / 2 },
          imageStyle,
        ]}
        resizeMode="contain"
        accessibilityLabel="Stride logo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  image: {},
});
