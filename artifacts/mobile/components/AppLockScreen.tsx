import { useAppLock } from "@/context/AppLockContext";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PIN_LENGTH = 4;

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "⌫"],
];

export default function AppLockScreen() {
  const insets = useSafeAreaInsets();
  const { unlock } = useAppLock();
  const [digits, setDigits] = useState<string[]>([]);
  const [error, setError] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const glitchAnim = useRef(new Animated.Value(1)).current;
  const dotAnims = useRef(
    Array.from({ length: PIN_LENGTH }, () => new Animated.Value(0))
  ).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.timing(glitchAnim, { toValue: 0.2, duration: 80, useNativeDriver: true }),
      Animated.timing(glitchAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
      Animated.timing(glitchAnim, { toValue: 0.5, duration: 60, useNativeDriver: true }),
      Animated.timing(glitchAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const animateDot = (index: number) => {
    Animated.spring(dotAnims[index], {
      toValue: 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 8,
    }).start();
  };

  const handleKey = (key: string) => {
    if (key === "⌫") {
      if (digits.length > 0) {
        const next = digits.slice(0, -1);
        dotAnims[digits.length - 1].setValue(0);
        setDigits(next);
        setError(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      return;
    }
    if (key === "") return;
    if (digits.length >= PIN_LENGTH) return;

    const next = [...digits, key];
    animateDot(next.length - 1);
    setDigits(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (next.length === PIN_LENGTH) {
      setTimeout(() => {
        const ok = unlock(next.join(""));
        if (!ok) {
          shake();
          setError(true);
          // Reset dots
          dotAnims.forEach((a) => a.setValue(0));
          setDigits([]);
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
        } else {
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      }, 120);
    }
  };

  // Cursor blink for header
  const [cursor, setCursor] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setCursor((c) => !c), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Feather name="lock" size={28} color="#00FF41" />
        <Animated.Text style={[styles.title, { opacity: glitchAnim }]}>
          CRYPTIC
        </Animated.Text>
        <Text style={styles.subtitle}>
          AUTHENTICATION REQUIRED{cursor ? "_" : " "}
        </Text>
      </View>

      {/* PIN dots */}
      <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => {
          const filled = i < digits.length;
          return (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: error
                    ? "#FF0040"
                    : filled
                    ? "#00FF41"
                    : "transparent",
                  borderColor: error ? "#FF0040" : "#00FF41",
                  transform: [{ scale: filled ? dotAnims[i] : 1 }],
                },
              ]}
            />
          );
        })}
      </Animated.View>

      {error && (
        <Text style={styles.errorText}>ACCESS DENIED — WRONG PIN</Text>
      )}

      {/* Numpad */}
      <View style={styles.numpad}>
        {KEYS.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((key, ki) => (
              <TouchableOpacity
                key={ki}
                style={[
                  styles.key,
                  key === "" && styles.keyEmpty,
                  key === "⌫" && styles.keyDelete,
                ]}
                onPress={() => handleKey(key)}
                disabled={key === ""}
                activeOpacity={0.6}
              >
                {key === "⌫" ? (
                  <Feather name="delete" size={22} color="#00AA29" />
                ) : (
                  <Text style={[styles.keyText, key === "" && { opacity: 0 }]}>
                    {key || "0"}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      <Text style={styles.hint}>ENTER YOUR {PIN_LENGTH}-DIGIT PIN</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 32,
  },
  header: {
    alignItems: "center",
    gap: 10,
    marginTop: 40,
  },
  title: {
    color: "#00FF41",
    fontFamily: "monospace",
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: 6,
  },
  subtitle: {
    color: "#00AA29",
    fontFamily: "monospace",
    fontSize: 11,
    letterSpacing: 1,
    textAlign: "center",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 20,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 32,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  errorText: {
    color: "#FF0040",
    fontFamily: "monospace",
    fontSize: 11,
    letterSpacing: 1,
    marginTop: -20,
    marginBottom: 8,
  },
  numpad: {
    width: "100%",
    gap: 12,
    maxWidth: 300,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  key: {
    flex: 1,
    aspectRatio: 1.6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1A3A1A",
    borderRadius: 4,
    backgroundColor: "#050F05",
  },
  keyEmpty: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  keyDelete: {
    borderColor: "#1A3A1A",
  },
  keyText: {
    color: "#00FF41",
    fontFamily: "monospace",
    fontSize: 22,
    fontWeight: "bold",
  },
  hint: {
    color: "#1A3A1A",
    fontFamily: "monospace",
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 8,
  },
});
