import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20),
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => router.replace("/(auth)/login")}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Back to sign in"
      >
        <Feather name="arrow-left" size={18} color={colors.primary} />
        <Text style={[styles.backText, { color: colors.primary }]}>SIGN IN</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={[styles.iconWrap, { borderColor: colors.border }]}>
          <Feather name="key" size={26} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.primary }]}>
          PASSWORD RECOVERY
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          ACCOUNT ACCESS
        </Text>

        <View
          style={[
            styles.notice,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <Feather name="info" size={16} color={colors.primary} />
          <Text style={[styles.noticeText, { color: colors.cardForeground }]}>
            Password resets are not available yet. Cryptic accounts do not have a
            verified recovery email, so we can’t securely confirm account
            ownership or send a reset link.
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.replace("/(auth)/login")}
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Feather name="log-in" size={16} color={colors.primaryForeground} />
          <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
            RETURN TO SIGN IN
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/register")}
          style={styles.secondaryButton}
          accessibilityRole="button"
        >
          <Text style={[styles.secondaryButtonText, { color: colors.mutedForeground }]}>
            CREATE A NEW ACCOUNT
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        KEEP YOUR PASSKEY IN A SAFE PLACE
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "space-between",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingVertical: 10,
  },
  backText: {
    fontSize: 11,
    fontFamily: "monospace",
    letterSpacing: 2,
  },
  content: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontFamily: "monospace",
    fontWeight: "bold",
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: "monospace",
    letterSpacing: 2,
    marginTop: 8,
    marginBottom: 24,
  },
  notice: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "monospace",
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 24,
  },
  primaryButtonText: {
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "monospace",
    letterSpacing: 1.5,
  },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: 18,
  },
  secondaryButtonText: {
    fontSize: 10,
    fontFamily: "monospace",
    letterSpacing: 1.2,
  },
  footer: {
    textAlign: "center",
    fontSize: 9,
    fontFamily: "monospace",
    letterSpacing: 1.3,
  },
});
