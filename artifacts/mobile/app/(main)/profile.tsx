import { useAuth } from "@/context/AuthContext";
import { useAppLock } from "@/context/AppLockContext";
import { useMessages } from "@/context/MessagesContext";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import QRCode from "react-native-qrcode-svg";
import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ENCRYPTION_SPECS = [
  { label: "MESSAGE ENCRYPTION", value: "AES-256-GCM" },
  { label: "KEY EXCHANGE", value: "ECDH-P256" },
  { label: "IDENTITY KEYS", value: "RSA-4096" },
  { label: "SIGNATURE", value: "ECDSA-SHA256" },
  { label: "PROTOCOL", value: "SIGNAL-BASED" },
  { label: "FORWARD SECRECY", value: "ENABLED" },
];

type PinMode = "idle" | "setup" | "disable" | "change";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { wipeAllMessages } = useMessages();
  const { isPinEnabled, setupPin, disablePin, changePin } = useAppLock();

  const [keyVisible, setKeyVisible] = useState(false);

  // ── Wipe state ──
  const [wiping, setWiping] = useState(false);
  const [wipeConfirm, setWipeConfirm] = useState(false);
  const [wipeDone, setWipeDone] = useState(false);
  const wipeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const wipeConfirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── PIN state ──
  const [pinMode, setPinMode] = useState<PinMode>("idle");
  const [pinA, setPinA] = useState("");   // new / current
  const [pinB, setPinB] = useState("");   // confirm / new (for change)
  const [pinC, setPinC] = useState("");   // confirm new (for change)
  const [pinError, setPinError] = useState("");
  const [pinSuccess, setPinSuccess] = useState("");

  const resetPinForm = () => {
    setPinMode("idle");
    setPinA(""); setPinB(""); setPinC("");
    setPinError("");
  };

  const handlePinSubmit = async () => {
    if (pinMode === "setup") {
      if (pinA.length < 4) { setPinError("PIN must be at least 4 digits"); return; }
      if (pinA !== pinB) { setPinError("PINs don't match"); return; }
      await setupPin(pinA);
      setPinSuccess("PIN LOCK ENABLED");
      resetPinForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setPinSuccess(""), 2500);
    } else if (pinMode === "disable") {
      const ok = disablePin(pinA);
      if (!ok) { setPinError("WRONG PIN"); return; }
      setPinSuccess("PIN LOCK DISABLED");
      resetPinForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setPinSuccess(""), 2500);
    } else if (pinMode === "change") {
      if (pinB.length < 4) { setPinError("New PIN must be at least 4 digits"); return; }
      if (pinB !== pinC) { setPinError("New PINs don't match"); return; }
      const ok = changePin(pinA, pinB);
      if (!ok) { setPinError("CURRENT PIN IS INCORRECT"); return; }
      setPinSuccess("PIN CHANGED");
      resetPinForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setPinSuccess(""), 2500);
    }
  };

  // ── Logout ──
  const handleLogout = () => {
    if (Platform.OS === "web") { logout(); return; }
    Alert.alert("TERMINATE SESSION", "Are you sure you want to log out?", [
      { text: "CANCEL", style: "cancel" },
      { text: "TERMINATE", style: "destructive", onPress: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        logout();
      }},
    ]);
  };

  // ── Wipe ──
  const startPulse = () => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 0.4, duration: 300, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ])).start();
  };

  const handleWipePress = () => {
    if (wiping) return;
    if (!wipeConfirm) {
      setWipeConfirm(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      wipeConfirmTimer.current = setTimeout(() => setWipeConfirm(false), 3000);
      return;
    }
    if (wipeConfirmTimer.current) clearTimeout(wipeConfirmTimer.current);
    setWipeConfirm(false);
    const execute = async () => {
      setWiping(true);
      startPulse();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Animated.timing(wipeAnim, { toValue: 1, duration: 1800, useNativeDriver: false }).start();
      await wipeAllMessages();
      setTimeout(() => {
        pulseAnim.stopAnimation(); pulseAnim.setValue(1);
        setWiping(false); setWipeDone(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => { setWipeDone(false); wipeAnim.setValue(0); }, 3000);
      }, 2000);
    };
    if (Platform.OS === "web") {
      execute();
    } else {
      Alert.alert("⚠ WIPE PROTOCOL", "Permanently destroy ALL messages? Cannot be undone.", [
        { text: "ABORT", style: "cancel" },
        { text: "EXECUTE WIPE", style: "destructive", onPress: execute },
      ]);
    }
  };

  const paddingTop = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: paddingTop + 12, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>IDENTITY</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 90 }]}>

        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatarLarge, { borderColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {user?.displayName.slice(0, 2).toUpperCase() ?? "??"}
            </Text>
          </View>
          <Text style={[styles.displayName, { color: colors.foreground }]}>{user?.displayName}</Text>
          <Text style={[styles.username, { color: colors.mutedForeground }]}>@{user?.username}</Text>
          <View style={[styles.onlinePill, { borderColor: colors.primary }]}>
            <View style={[styles.onlineDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.onlineText, { color: colors.primary }]}>ONLINE · SECURE</Text>
          </View>
        </View>

        {/* QR Code */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>MY QR CODE</Text>
        <View style={[styles.qrCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.qrHint, { color: colors.mutedForeground }]}>
            Let others scan this to add you instantly
          </Text>
          <View style={[styles.qrWrapper, { borderColor: colors.border }]}>
            <View style={{ backgroundColor: "#fff", padding: 8, borderRadius: 2 }}>
              <QRCode
                value={JSON.stringify({ cryptic: "1", u: user?.username ?? "", d: user?.displayName ?? "" })}
                size={160}
                color="#000000"
                backgroundColor="#ffffff"
              />
            </View>
          </View>
          <Text style={[styles.qrUsername, { color: colors.primary }]}>@{user?.username}</Text>
        </View>

        {/* Encryption specs */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ENCRYPTION SPECS</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {ENCRYPTION_SPECS.map((spec, i) => (
            <View key={spec.label} style={[
              styles.specRow,
              i < ENCRYPTION_SPECS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
            ]}>
              <Text style={[styles.specLabel, { color: colors.mutedForeground }]}>{spec.label}</Text>
              <Text style={[styles.specValue, { color: colors.primary }]}>{spec.value}</Text>
            </View>
          ))}
        </View>

        {/* Public key */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PUBLIC KEY</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity onPress={() => setKeyVisible(!keyVisible)} style={styles.keyRow}>
            <Feather name={keyVisible ? "eye-off" : "eye"} size={14} color={colors.mutedForeground} />
            <Text style={[styles.keyToggle, { color: colors.mutedForeground }]}>
              {keyVisible ? "HIDE" : "REVEAL"} PUBLIC KEY
            </Text>
          </TouchableOpacity>
          {keyVisible && (
            <Text style={[styles.keyText, { color: colors.primary, borderTopColor: colors.border }]}>
              {user?.publicKey}
            </Text>
          )}
        </View>

        {/* Account info */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ACCOUNT INFO</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>NODE ID</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={1}>
              {user?.id.slice(0, 16)}...
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>REGISTERED</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
            </Text>
          </View>
        </View>

        {/* ── PIN LOCK ── */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>APP LOCK</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Status row */}
          <View style={[styles.pinStatusRow, { borderBottomColor: colors.border, borderBottomWidth: pinMode !== "idle" ? 1 : 0 }]}>
            <View style={styles.pinStatusLeft}>
              <Feather name={isPinEnabled ? "lock" : "unlock"} size={16} color={isPinEnabled ? colors.primary : colors.mutedForeground} />
              <View>
                <Text style={[styles.pinStatusTitle, { color: colors.foreground }]}>PIN LOCK</Text>
                <Text style={[styles.pinStatusSub, { color: colors.mutedForeground }]}>
                  {isPinEnabled ? "Active — locks after backgrounding" : "Disabled"}
                </Text>
              </View>
            </View>
            {pinMode === "idle" && (
              isPinEnabled ? (
                <View style={styles.pinActions}>
                  <TouchableOpacity
                    onPress={() => { setPinMode("change"); setPinError(""); }}
                    style={[styles.pinActionBtn, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.pinActionText, { color: colors.mutedForeground }]}>CHANGE</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { setPinMode("disable"); setPinError(""); }}
                    style={[styles.pinActionBtn, { borderColor: colors.destructive }]}
                  >
                    <Text style={[styles.pinActionText, { color: colors.destructive }]}>DISABLE</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => { setPinMode("setup"); setPinError(""); }}
                  style={[styles.pinEnableBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.pinEnableBtnText, { color: "#000" }]}>ENABLE</Text>
                </TouchableOpacity>
              )
            )}
          </View>

          {/* PIN form */}
          {pinMode !== "idle" && (
            <View style={styles.pinForm}>
              {pinMode === "setup" && (
                <>
                  <PinField label="NEW PIN" value={pinA} onChange={setPinA} placeholder="4+ digits" />
                  <PinField label="CONFIRM PIN" value={pinB} onChange={setPinB} placeholder="Repeat PIN" />
                </>
              )}
              {pinMode === "disable" && (
                <PinField label="ENTER CURRENT PIN" value={pinA} onChange={setPinA} placeholder="Your PIN" />
              )}
              {pinMode === "change" && (
                <>
                  <PinField label="CURRENT PIN" value={pinA} onChange={setPinA} placeholder="Current PIN" />
                  <PinField label="NEW PIN" value={pinB} onChange={setPinB} placeholder="4+ digits" />
                  <PinField label="CONFIRM NEW PIN" value={pinC} onChange={setPinC} placeholder="Repeat new PIN" />
                </>
              )}
              {!!pinError && (
                <Text style={styles.pinErrorText}>{pinError}</Text>
              )}
              <View style={styles.pinFormBtns}>
                <TouchableOpacity onPress={resetPinForm} style={[styles.pinCancelBtn, { borderColor: colors.border }]}>
                  <Text style={[styles.pinCancelText, { color: colors.mutedForeground }]}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handlePinSubmit} style={[styles.pinSubmitBtn, { backgroundColor: colors.primary }]}>
                  <Text style={styles.pinSubmitText}>
                    {pinMode === "setup" ? "ENABLE LOCK" : pinMode === "disable" ? "DISABLE" : "SAVE"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!!pinSuccess && (
            <View style={[styles.pinSuccessBanner, { borderTopColor: colors.border }]}>
              <Feather name="check-circle" size={13} color={colors.primary} />
              <Text style={[styles.pinSuccessText, { color: colors.primary }]}>{pinSuccess}</Text>
            </View>
          )}
        </View>

        {/* ── DANGER ZONE ── */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>DANGER ZONE</Text>
        <Animated.View style={[
          styles.panicCard,
          {
            borderColor: wipeConfirm ? colors.destructive : "rgba(255,0,64,0.3)",
            backgroundColor: wipeConfirm ? "rgba(255,0,64,0.12)" : "rgba(255,0,64,0.05)",
            opacity: wiping ? pulseAnim : 1,
          },
        ]}>
          <View style={styles.panicHeader}>
            <Feather name="alert-triangle" size={16} color={colors.destructive} />
            <Text style={[styles.panicTitle, { color: colors.destructive }]}>WIPE PROTOCOL</Text>
          </View>
          <Text style={[styles.panicDesc, { color: colors.mutedForeground }]}>
            Instantly destroys ALL messages across every conversation. Irreversible.
          </Text>
          {wiping && (
            <View style={styles.wipeProgressTrack}>
              <Animated.View style={[styles.wipeProgressBar, {
                backgroundColor: colors.destructive,
                width: wipeAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
              }]} />
              <Text style={[styles.wipeProgressLabel, { color: colors.destructive }]}>WIPING DATA...</Text>
            </View>
          )}
          {wipeDone && (
            <View style={[styles.wipeDoneBanner, { borderColor: colors.primary }]}>
              <Feather name="check-circle" size={13} color={colors.primary} />
              <Text style={[styles.wipeDoneText, { color: colors.primary }]}>ALL MESSAGES DESTROYED</Text>
            </View>
          )}
          {!wiping && !wipeDone && (
            <TouchableOpacity
              onPress={handleWipePress}
              style={[styles.panicBtn, {
                borderColor: colors.destructive,
                backgroundColor: wipeConfirm ? colors.destructive : "transparent",
              }]}
              activeOpacity={0.7}
            >
              <Feather name={wipeConfirm ? "zap" : "trash-2"} size={16} color={wipeConfirm ? "#000" : colors.destructive} />
              <Text style={[styles.panicBtnText, { color: wipeConfirm ? "#000" : colors.destructive }]}>
                {wipeConfirm ? "TAP AGAIN TO CONFIRM WIPE" : "INITIATE WIPE PROTOCOL"}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        <TouchableOpacity onPress={handleLogout} style={[styles.logoutBtn, { borderColor: colors.destructive }]} activeOpacity={0.7}>
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>TERMINATE SESSION</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function PinField({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={pinFieldStyles.wrap}>
      <Text style={pinFieldStyles.label}>{label}</Text>
      <TextInput
        style={pinFieldStyles.input}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(0, 8))}
        placeholder={placeholder}
        placeholderTextColor="#1A3A1A"
        secureTextEntry
        keyboardType="number-pad"
        autoCorrect={false}
      />
    </View>
  );
}

const pinFieldStyles = StyleSheet.create({
  wrap: { gap: 4 },
  label: { color: "#00AA29", fontFamily: "monospace", fontSize: 10, letterSpacing: 2 },
  input: {
    backgroundColor: "#050F05",
    borderWidth: 1,
    borderColor: "#1A3A1A",
    borderRadius: 4,
    color: "#00FF41",
    fontFamily: "monospace",
    fontSize: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    letterSpacing: 8,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: "bold" as const, fontFamily: "monospace", letterSpacing: 3 },
  content: { padding: 16, gap: 8 },
  profileCard: { borderRadius: 4, borderWidth: 1, padding: 24, alignItems: "center", gap: 8, marginBottom: 12 },
  avatarLarge: { width: 72, height: 72, borderRadius: 4, borderWidth: 2, alignItems: "center", justifyContent: "center", backgroundColor: "#050F05" },
  avatarText: { fontSize: 26, fontFamily: "monospace", fontWeight: "bold" as const },
  displayName: { fontSize: 20, fontWeight: "bold" as const, fontFamily: "monospace" },
  username: { fontSize: 13, fontFamily: "monospace" },
  onlinePill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginTop: 4 },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  onlineText: { fontSize: 10, fontFamily: "monospace", letterSpacing: 1 },
  sectionLabel: { fontSize: 10, fontFamily: "monospace", letterSpacing: 2, marginTop: 8, marginBottom: 4, paddingLeft: 4 },
  card: { borderRadius: 4, borderWidth: 1, overflow: "hidden", marginBottom: 4 },
  specRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 11 },
  specLabel: { fontSize: 11, fontFamily: "monospace" },
  specValue: { fontSize: 11, fontFamily: "monospace", fontWeight: "bold" as const },
  keyRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14 },
  keyToggle: { fontSize: 11, fontFamily: "monospace", letterSpacing: 1 },
  keyText: { fontSize: 10, fontFamily: "monospace", padding: 14, borderTopWidth: 1, lineHeight: 16, letterSpacing: 1 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, alignItems: "center" },
  infoLabel: { fontSize: 11, fontFamily: "monospace" },
  infoValue: { fontSize: 11, fontFamily: "monospace", flex: 1, textAlign: "right" },
  qrCard: { borderRadius: 4, borderWidth: 1, padding: 16, alignItems: "center", gap: 12, marginBottom: 4 },
  qrHint: { fontSize: 11, fontFamily: "monospace", textAlign: "center" },
  qrWrapper: { borderRadius: 4, borderWidth: 1, padding: 4 },
  qrUsername: { fontSize: 14, fontFamily: "monospace", fontWeight: "bold" as const, letterSpacing: 2 },
  // PIN lock
  pinStatusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14 },
  pinStatusLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  pinStatusTitle: { fontSize: 13, fontFamily: "monospace", fontWeight: "bold" as const, letterSpacing: 1 },
  pinStatusSub: { fontSize: 10, fontFamily: "monospace", marginTop: 2 },
  pinActions: { flexDirection: "row", gap: 6 },
  pinActionBtn: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 6 },
  pinActionText: { fontSize: 10, fontFamily: "monospace", fontWeight: "bold" as const, letterSpacing: 1 },
  pinEnableBtn: { borderRadius: 4, paddingHorizontal: 14, paddingVertical: 8 },
  pinEnableBtnText: { fontSize: 11, fontFamily: "monospace", fontWeight: "bold" as const, letterSpacing: 1 },
  pinForm: { padding: 14, gap: 12 },
  pinErrorText: { color: "#FF0040", fontFamily: "monospace", fontSize: 11, letterSpacing: 1 },
  pinFormBtns: { flexDirection: "row", gap: 8, marginTop: 4 },
  pinCancelBtn: { flex: 1, borderWidth: 1, borderRadius: 4, paddingVertical: 12, alignItems: "center" },
  pinCancelText: { fontFamily: "monospace", fontSize: 12, fontWeight: "bold" as const, letterSpacing: 1 },
  pinSubmitBtn: { flex: 1, borderRadius: 4, paddingVertical: 12, alignItems: "center" },
  pinSubmitText: { color: "#000", fontFamily: "monospace", fontSize: 12, fontWeight: "bold" as const, letterSpacing: 1 },
  pinSuccessBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  pinSuccessText: { fontFamily: "monospace", fontSize: 11, fontWeight: "bold" as const, letterSpacing: 1 },
  // Panic wipe
  panicCard: { borderRadius: 4, borderWidth: 1, padding: 16, gap: 12, marginBottom: 4 },
  panicHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  panicTitle: { fontSize: 13, fontFamily: "monospace", fontWeight: "bold" as const, letterSpacing: 2 },
  panicDesc: { fontSize: 11, fontFamily: "monospace", lineHeight: 17 },
  wipeProgressTrack: { height: 28, borderRadius: 4, backgroundColor: "rgba(255,0,64,0.1)", overflow: "hidden", justifyContent: "center", alignItems: "center" },
  wipeProgressBar: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 4 },
  wipeProgressLabel: { fontSize: 11, fontFamily: "monospace", fontWeight: "bold" as const, letterSpacing: 2, zIndex: 1 },
  wipeDoneBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 10 },
  wipeDoneText: { fontSize: 11, fontFamily: "monospace", fontWeight: "bold" as const, letterSpacing: 1 },
  panicBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderRadius: 4, paddingVertical: 14 },
  panicBtnText: { fontSize: 12, fontFamily: "monospace", fontWeight: "bold" as const, letterSpacing: 1 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderRadius: 4, paddingVertical: 16, marginTop: 12 },
  logoutText: { fontSize: 14, fontFamily: "monospace", fontWeight: "bold" as const, letterSpacing: 2 },
});
