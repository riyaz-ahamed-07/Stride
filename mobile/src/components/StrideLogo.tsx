import { Image, StyleSheet, View, type ImageStyle, type ViewStyle } from "react-native";

type Props = {
  size?: number;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
};

const logoSource = require("../../assets/icon.png");

export function StrideLogo({ size = 64, style, imageStyle }: Props) {
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size * 0.28 }, style]}>
      <Image
        source={logoSource}
        style={[styles.image, { width: size, height: size, borderRadius: size * 0.28 }, imageStyle]}
        resizeMode="contain"
        accessibilityLabel="Stride logo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden" },
  image: {},
});
