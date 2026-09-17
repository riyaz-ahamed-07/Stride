import { useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInput as TextInputType,
} from "react-native";
import { AlertCircle } from "lucide-react-native";
import { O } from "./OnboardingShell";
import { colors, type as typography } from "../../theme";

export const THERAPIST_CODE_LEN = 8;
const PLACEHOLDERS = ["T", "H", "E", "R", "A", "P", "0", "0"] as const;

type Props = {
  value: string;
  onChange: (code: string) => void;
  error?: string;
  disabled?: boolean;
};

export function TherapistCodeStep({ value, onChange, error, disabled }: Props) {
  const seed = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, THERAPIST_CODE_LEN);
  const [chars, setChars] = useState<string[]>(() => {
    const arr = Array.from({ length: THERAPIST_CODE_LEN }, () => "");
    for (let i = 0; i < seed.length; i++) arr[i] = seed[i]!;
    return arr;
  });
  const [active, setActive] = useState(
    Math.min(seed.length, THERAPIST_CODE_LEN - 1),
  );
  const inputs = useRef<(TextInputType | null)[]>([]);

  function commit(next: string[]) {
    setChars(next);
    onChange(next.join(""));
  }

  function setCharAt(index: number, raw: string) {
    const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!cleaned) {
      const next = [...chars];
      next[index] = "";
      commit(next);
      return;
    }
    const pieces = cleaned.slice(0, THERAPIST_CODE_LEN - index).split("");
    const next = [...chars];
    pieces.forEach((ch, offset) => {
      next[index + offset] = ch;
    });
    commit(next);
    const focusAt = Math.min(index + pieces.length, THERAPIST_CODE_LEN - 1);
    setActive(focusAt);
    inputs.current[focusAt]?.focus();
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {chars.map((ch, index) => {
          const isActive = active === index;
          return (
            <TextInput
              key={index}
              ref={(ref) => {
                inputs.current[index] = ref;
              }}
              style={[
                styles.box,
                isActive && styles.boxActive,
                !!ch && !isActive && styles.boxFilled,
              ]}
              value={ch}
              placeholder={PLACEHOLDERS[index]}
              placeholderTextColor={O.gray30}
              onChangeText={(text) => setCharAt(index, text)}
              onFocus={() => setActive(index)}
              onKeyPress={({ nativeEvent }) => {
                if (
                  nativeEvent.key === "Backspace" &&
                  !chars[index] &&
                  index > 0
                ) {
                  inputs.current[index - 1]?.focus();
                  setActive(index - 1);
                }
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={THERAPIST_CODE_LEN}
              editable={!disabled}
              selectTextOnFocus
              accessibilityLabel={`Therapist code character ${index + 1}`}
            />
          );
        })}
      </View>

      {error ? (
        <View style={styles.errorBanner} accessibilityRole="alert">
          <View style={styles.errorIcon}>
            <AlertCircle size={16} color="#fff" strokeWidth={2.5} />
          </View>
          <Text style={styles.errorText}>ERROR: {error}</Text>
        </View>
      ) : null}

      <View style={styles.helpBlock}>
        <Text style={styles.helpMuted}>Don't have a therapist code?</Text>
        <Text style={styles.helpLink}>
          Ask your physiotherapist for theirs.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    width: "100%",
    gap: 6,
    justifyContent: "center",
    marginBottom: 16,
  },
  box: {
    flex: 1,
    maxWidth: 44,
    aspectRatio: 0.78,
    maxHeight: 56,
    borderRadius: 14,
    backgroundColor: colors.surface.subtle,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: O.gray80,
    fontFamily: typography.fontFamilyExtraBold,
    paddingHorizontal: 0,
  },
  boxFilled: {
    color: O.gray80,
  },
  boxActive: {
    backgroundColor: O.green,
    color: O.white,
    shadowColor: O.green,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "stretch",
    backgroundColor: colors.semantic.errorSoft,
    borderWidth: 1,
    borderColor: colors.semantic.error,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  errorIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.semantic.error,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    flex: 1,
    color: O.gray80,
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 20,
  },
  helpBlock: {
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  helpMuted: {
    textAlign: "center",
    color: O.gray60,
    fontSize: 13,
  },
  helpLink: {
    textAlign: "center",
    color: O.green,
    fontWeight: "700",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
