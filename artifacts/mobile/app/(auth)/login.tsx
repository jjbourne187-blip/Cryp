import MatrixRain from "@/components/MatrixRain";
import { useAuth } from "@/context/AuthContext";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LoginScreen() {
  const { login, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(true);

  // Redirect as soon as user is set (handles both login and already-logged-in)
  useEffect(() => {
    if (user) {
      router.replace("/(main)/chats");
    }
  }, [user]);

  const isWeb = Platform.OS === "web";
  const titleAnim = useRef(new Animated.Value(isWeb ? 1 : 0)).current;
  const formAnim = useRef(new Animated.Value(isWeb ? 1 : 0)).current;
  const glitchAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isWeb) {
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(titleAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(formAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]).start();
    }

    const blink = setInterval(() => setCursor((c) => !c), 500);
    return () => clearInterval(blink);
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      setError("MISSING CREDENTIALS");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setLoading(true);
    setError("");

    // Glitch animation
    Animated.sequence([
      Animated.timing(glitchAnim, { toValue: 0.3, duration: 80, useNativeDriver: true }),
      Animated.timing(glitchAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
      Animated.timing(glitchAnim, { toValue: 0.5, duration: 60, useNativeDriver: true }),
      Animated.timing(glitchAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
    ]).start();

    const result = await login(username, password);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "ACCESS DENIED");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <View style={styles.container}>
      <MatrixRain />
      <View style={[styles.overlay, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.inner, { paddingBottom: insets.bottom + 20 }]}>
          <Animated.View style={[styles.titleBlock, { opacity: titleAnim }]}>
            <Animated.Text style={[styles.title, { opacity: glitchAnim }]}>
              CRYPTIC
            </Animated.Text>
            <Text style={styles.subtitle}>
              END-TO-END ENCRYPTED COMMUNICATIONS{cursor ? "_" : " "}
            </Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>SECURE CHANNEL ACTIVE</Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.form, { opacity: formAnim }]}>
            <Text style={styles.label}>{">"} IDENTITY</Text>
            <View style={styles.inputWrapper}>
              <Feather name="user" size={16} color="#00AA29" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="ENTER USERNAME"
                placeholderTextColor="#1A3A1A"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={[styles.label, { marginTop: 16 }]}>{">"} PASSKEY</Text>
            <View style={styles.inputWrapper}>
              <Feather name="lock" size={16} color="#00AA29" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="ENTER PASSKEY"
                placeholderTextColor="#1A3A1A"
                secureTextEntry={!showPass}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                <Feather name={showPass ? "eye-off" : "eye"} size={16} color="#00AA29" />
              </Pressable>
            </View>

            {!!error && (
              <View style={styles.errorBlock}>
                <Feather name="alert-triangle" size={12} color="#FF0040" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnLoading]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <Text style={styles.loginBtnText}>AUTHENTICATING...</Text>
              ) : (
                <>
                  <Feather name="log-in" size={16} color="#000000" />
                  <Text style={styles.loginBtnText}>AUTHENTICATE</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/(auth)/register")}
              style={styles.registerLink}
            >
              <Text style={styles.registerText}>
                NO IDENTITY? <Text style={styles.registerLinkText}>REGISTER NEW NODE</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.footer}>
            AES-256 · RSA-4096 · QUANTUM RESISTANT
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  keyboardView: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
    gap: 32,
  },
  titleBlock: { alignItems: "center", gap: 8 },
  title: {
    fontSize: 24,
    fontFamily: "monospace",
    color: "#00FF41",
    fontWeight: "bold" as const,
    letterSpacing: 4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 11,
    fontFamily: "monospace",
    color: "#00AA29",
    textAlign: "center",
    letterSpacing: 1,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00FF41",
  },
  statusText: {
    fontSize: 10,
    fontFamily: "monospace",
    color: "#00FF41",
    letterSpacing: 1,
  },
  form: { gap: 4 },
  label: {
    fontSize: 11,
    fontFamily: "monospace",
    color: "#00AA29",
    letterSpacing: 2,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#050F05",
    borderWidth: 1,
    borderColor: "#1A3A1A",
    borderRadius: 4,
  },
  inputIcon: { paddingLeft: 12 },
  input: {
    flex: 1,
    color: "#00FF41",
    fontSize: 14,
    fontFamily: "monospace",
    paddingHorizontal: 10,
    paddingVertical: 14,
  },
  passwordInput: { paddingRight: 0 },
  eyeBtn: { padding: 12 },
  errorBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    backgroundColor: "rgba(255,0,64,0.1)",
    borderWidth: 1,
    borderColor: "#FF0040",
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorText: {
    color: "#FF0040",
    fontSize: 11,
    fontFamily: "monospace",
    letterSpacing: 1,
  },
  loginBtn: {
    flexDirection: "row",
    backgroundColor: "#00FF41",
    borderRadius: 4,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
  },
  loginBtnLoading: { opacity: 0.7 },
  loginBtnText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "bold" as const,
    fontFamily: "monospace",
    letterSpacing: 2,
  },
  registerLink: { marginTop: 16, alignItems: "center" },
  registerText: {
    color: "#00AA29",
    fontSize: 12,
    fontFamily: "monospace",
  },
  registerLinkText: {
    color: "#00FF41",
    textDecorationLine: "underline",
  },
  footer: {
    textAlign: "center",
    color: "#1A3A1A",
    fontSize: 10,
    fontFamily: "monospace",
    letterSpacing: 1,
  },
});
