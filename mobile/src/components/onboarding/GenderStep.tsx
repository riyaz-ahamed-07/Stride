import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Mars, Venus } from "lucide-react-native";
import { O } from "./OnboardingShell";

export type GenderChoice = "male" | "female" | "prefer_not_to_say";

type Props = {
  value: GenderChoice | "";
  onChange: (value: GenderChoice) => void;
  disabled?: boolean;
};

const GAP = 12;
const VERTICAL_INSET = 12;
const CARD_ASPECT = 168 / 280;

const maleColor = require("../../../assets/onboarding/gender-male.png");
const maleMuted = require("../../../assets/onboarding/gender-male-muted.png");
const femaleColor = require("../../../assets/onboarding/gender-female.png");
const femaleMuted = require("../../../assets/onboarding/gender-female-muted.png");

function GenderCard({
  selected,
  label,
  icon,
  colorImage,
  mutedImage,
  onPress,
  disabled,
  width,
  height,
}: {
  selected: boolean;
  label: string;
  icon: "male" | "female";
  colorImage: number;
  mutedImage: number;
  onPress: () => void;
  disabled?: boolean;
  width: number;
  height: number;
}) {
  const Icon = icon === "male" ? Mars : Venus;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[
        styles.card,
        { width, height },
        selected ? styles.cardOn : styles.cardOff,
      ]}
    >
      <View style={styles.artPane}>
        <Image
          source={selected ? colorImage : mutedImage}
          style={styles.artImage}
          resizeMode="contain"
        />
      </View>
      <View
        style={[
          styles.footerBar,
          selected ? styles.footerOn : styles.footerOff,
        ]}
      >
        <Icon
          size={20}
          color={selected ? "#fff" : "#CBD5E1"}
          strokeWidth={2.4}
        />
        <Text
          style={[styles.footerLabel, selected ? styles.footerLabelOn : null]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function GenderStep({ value, onChange, disabled }: Props) {
  const [areaH, setAreaH] = useState(280);
  const cardH = Math.max(200, areaH - VERTICAL_INSET * 2);
  const cardW = Math.round(cardH * CARD_ASPECT);
  const step = cardW + GAP;
  const selectedMale = value === "male";
  const selectedFemale = value === "female";

  function selectFromScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (disabled) return;
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / step);
    const next: GenderChoice = index <= 0 ? "male" : "female";
    if (next !== value) onChange(next);
  }

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => {
        const h = Math.floor(e.nativeEvent.layout.height);
        if (h > 0 && h !== areaH) setAreaH(h);
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={step}
        disableIntervalMomentum
        style={styles.scroll}
        contentContainerStyle={styles.row}
        onMomentumScrollEnd={selectFromScroll}
        onScrollEndDrag={selectFromScroll}
      >
        <GenderCard
          selected={selectedMale}
          label="I am Male"
          icon="male"
          colorImage={maleColor}
          mutedImage={maleMuted}
          onPress={() => onChange("male")}
          disabled={disabled}
          width={cardW}
          height={cardH}
        />
        <GenderCard
          selected={selectedFemale}
          label="I am Female"
          icon="female"
          colorImage={femaleColor}
          mutedImage={femaleMuted}
          onPress={() => onChange("female")}
          disabled={disabled}
          width={cardW}
          height={cardH}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, marginTop: 4 },
  scroll: { flex: 1 },
  row: {
    flexGrow: 1,
    gap: GAP,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  card: {
    borderRadius: 36,
    overflow: "hidden",
  },
  cardOn: {
    backgroundColor: O.green,
    borderWidth: 3,
    borderColor: O.blue,
  },
  cardOff: {
    backgroundColor: "#4B5563",
    borderWidth: 3,
    borderColor: "#6B7280",
  },
  artPane: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
    paddingTop: 8,
  },
  artImage: {
    width: "100%",
    height: "100%",
  },
  footerBar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  footerOn: { backgroundColor: O.blue },
  footerOff: { backgroundColor: "#6B7280" },
  footerLabel: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    color: "#CBD5E1",
  },
  footerLabelOn: { color: "#fff" },
});
