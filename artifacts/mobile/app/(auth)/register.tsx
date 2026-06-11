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

export default function RegisterScreen() {
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const formAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(formAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const handleRegister = async () => {
    setError("");
    setLoading(true);
    const result = await register(username, password, displayName);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "REGISTRATION FAILED");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <View style={styles.container}>
      <MatrixRain />
      <View style={styles.overlay} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.inner, {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
          paddingBottom: insets.bottom + 20,
        }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Feather name="arrow-left" size={20} color="#00FF41" />
          </TouchableOpacity>

          <Animated.View style={[styles.content, { opacity: formAnim }]}>
            <Text style={styles.title}>REGISTER NODE</Text>
            <Text style={styles.subtitle}>CREATE NEW ENCRYPTED IDENTITY</Text>

            <View style={styles.form}>
              <Text style={styles.label}>{">"} DISPLAY NAME</Text>
              <View style={styles.inputWrapper}>
                <Feather name="user" size={16} color="#00AA29" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="YOUR NAME"
                  placeholderTextColor="#1A3A1A"
                  autoCorrect={false}
                />
              </View>

              <Text style={[styles.label, { marginTop: 14 }]}>{">"} USERNAME</Text>
              <View style={styles.inputWrapper}>
                <Feather name="at-sign" size={16} color="#00AA29" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="UNIQUE IDENTIFIER"
                  placeholderTextColor="#1A3A1A"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Text style={[styles.label, { marginTop: 14 }]}>{">"} PASSKEY</Text>
              <View style={styles.inputWrapper}>
                <Feather name="lock" size={16} color="#00AA29" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="MIN 6 CHARACTERS"
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

              <View style={styles.keyInfo}>
                <Feather name="shield" size={12} color="#00AA29" />
                <Text style={styles.keyInfoText}>
                  RSA-4096 key pair will be generated for your identity
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnLoading]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.btnText}>
                  {loading ? "GENERATING KEYS..." : "INITIALIZE NODE"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.loginLink}
              >
                <Text style={styles.loginText}>
                  HAVE AN IDENTITY? <Text style={styles.loginLinkText}>AUTHENTICATE</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  keyboardView: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 28 },
  backBtn: { alignSelf: "flex-start", marginBottom: 24 },
  content: { flex: 1, justifyContent: "center" },
  title: {
    fontSize: 22,
    fontFamily: "monospace",
    color: "#00FF41",
    fontWeight: "bold" as const,
    letterSpacing: 4,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: "monospace",
    color: "#00AA29",
    letterSpacing: 1,
    marginBottom: 28,
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
  keyInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: "#050F05",
    borderRadius: 4,
    padding: 10,
    borderWidth: 1,
    borderColor: "#1A3A1A",
  },
  keyInfoText: {
    color: "#00AA29",
    fontSize: 11,
    fontFamily: "monospace",
    flex: 1,
  },
  btn: {
    backgroundColor: "#00FF41",
    borderRadius: 4,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  btnLoading: { opacity: 0.7 },
  btnText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "bold" as const,
    fontFamily: "monospace",
    letterSpacing: 2,
  },
  loginLink: { marginTop: 16, alignItems: "center" },
  loginText: {
    color: "#00AA29",
    fontSize: 12,
    fontFamily: "monospace",
  },
  loginLinkText: {
    color: "#00FF41",
    textDecorationLine: "underline",
  },
});
