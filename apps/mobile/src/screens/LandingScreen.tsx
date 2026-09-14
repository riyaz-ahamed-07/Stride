import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StrideLogo } from "../components/StrideLogo";
import { WelcomeIllustration, type WelcomeVariant } from "../components/welcome/WelcomeIllustration";
import { C } from "../theme";

const AUTO_ADVANCE_MS = 4500;

type Slide = {
  variant: WelcomeVariant;
  titleDark: string;
  titleAccent: string;
  subtitle: string;
};

const SLIDES: Slide[] = [
  {
    variant: "video",
    titleDark: "Expert care,",
    titleAccent: "right at home",
    subtitle: "Connect with your physiotherapist and recover better, from home.",
  },
  {
    variant: "exercise",
    titleDark: "Guided movement,",
    titleAccent: "your own pace",
    subtitle: "Follow clear exercises with camera assist and safety notes every session.",
  },
  {
    variant: "progress",
    titleDark: "Track progress,",
    titleAccent: "stay motivated",
    subtitle: "See your rehab plan, daily tasks, and journey sync with your clinic.",
  },
];

const FEATURES = [
  { icon: "🏠", label: "Care from the comfort of home" },
  { icon: "🛡️", label: "Guidance from trusted experts" },
  { icon: "📈", label: "Track progress and stay motivated" },
] as const;

type Props = { onGetStarted: () => void };

export function LandingScreen({ onGetStarted }: Props) {
  const { width, height: windowHeight } = Dimensions.get("window");
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);
  const userInteracting = useRef(false);
  const programmaticScroll = useRef(false);

  const illustrationWidth = width - 16;
  const illustrationHeight = Math.min(300, windowHeight * 0.36);
  const slideHeight = Math.max(windowHeight - 332, 300);

  function goToPage(index: number) {
    const current = pageRef.current;
    const wrapToStart = current === SLIDES.length - 1 && index === 0;
    programmaticScroll.current = true;
    scrollRef.current?.scrollTo({ x: width * index, animated: !wrapToStart });
    setPage(index);
    pageRef.current = index;
    setTimeout(
      () => {
        programmaticScroll.current = false;
      },
      wrapToStart ? 80 : 450,
    );
  }

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (programmaticScroll.current) return;
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next >= 0 && next < SLIDES.length) {
      setPage(next);
      pageRef.current = next;
    }
    userInteracting.current = false;
  }

  useEffect(() => {
    const timer = setInterval(() => {
      if (userInteracting.current) return;
      const next = (pageRef.current + 1) % SLIDES.length;
      goToPage(next);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [width]);

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <StrideLogo size={40} />
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => {
          userInteracting.current = true;
        }}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.carousel}
        contentContainerStyle={[styles.carouselContent, { height: slideHeight }]}
      >
        {SLIDES.map((item) => (
          <View key={item.variant} style={[styles.slide, { width, height: slideHeight }]}>
            <View style={styles.copyBlock}>
              <Text style={styles.titleDark}>{item.titleDark}</Text>
              <Text style={styles.titleAccent}>{item.titleAccent}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
            <View style={styles.artWrap}>
              <WelcomeIllustration
                variant={item.variant}
                width={illustrationWidth}
                height={illustrationHeight}
                scale={1.03}
              />
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottomDock}>
        <View style={styles.dots}>
          {SLIDES.map((item, index) => (
            <Pressable
              key={item.variant}
              onPress={() => {
                userInteracting.current = true;
                goToPage(index);
              }}
              hitSlop={8}
            >
              <View style={[styles.dot, page === index && styles.dotActive]} />
            </Pressable>
          ))}
        </View>

        <View style={styles.featuresRow}>
          {FEATURES.map((item) => (
            <View key={item.label} style={styles.featureCard}>
              <View style={styles.featureIconWrap}>
                <Text style={styles.featureIcon}>{item.icon}</Text>
              </View>
              <Text style={styles.featureLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.btnPrimary} onPress={onGetStarted}>
          <Text style={styles.btnPrimaryText}>
            Begin your recovery journey
            <Text style={styles.btnArrow}> →</Text>
          </Text>
        </Pressable>

        <Pressable style={styles.signInRow} onPress={onGetStarted}>
          <Text style={styles.signInText}>
            I&apos;m already on <Text style={styles.signInAccent}>my way</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  carousel: {
    flex: 1,
  },
  carouselContent: {
    alignItems: "stretch",
  },
  slide: {
    paddingHorizontal: 20,
  },
  copyBlock: {
    paddingTop: 20,
    paddingBottom: 4,
  },
  artWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 10,
    overflow: "visible",
  },
  titleDark: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1E293B",
    lineHeight: 38,
  },
  titleAccent: {
    fontSize: 32,
    fontWeight: "800",
    color: C.primary,
    lineHeight: 38,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: C.muted,
    lineHeight: 22,
    paddingRight: 4,
  },
  bottomDock: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    paddingTop: 6,
    gap: 12,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#CBD5E1",
  },
  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primary,
  },
  featuresRow: {
    flexDirection: "row",
    gap: 8,
  },
  featureCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8EEF7",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  featureIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  featureIcon: { fontSize: 18 },
  featureLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#334155",
    textAlign: "center",
    lineHeight: 14,
  },
  btnPrimary: {
    minHeight: 56,
    backgroundColor: C.primary,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.primary,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  btnPrimaryText: { color: "white", fontSize: 17, fontWeight: "700" },
  btnArrow: { fontSize: 18, fontWeight: "700" },
  signInRow: { alignItems: "center", paddingVertical: 2 },
  signInText: { fontSize: 16, color: C.muted, fontWeight: "600" },
  signInAccent: { color: C.teal, fontWeight: "700", textDecorationLine: "underline" },
});
