import { useAuth } from "@/context/AuthContext";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const ENCRYPTION_SPECS = [
  { label: "MESSAGE ENCRYPTION", value: "AES-256-GCM" },
  { label: "KEY EXCHANGE", value: "ECDH-P256" },
  { label: "IDENTITY KEYS", value: "RSA-4096" },
  { label: "SIGNATURE", value: "ECDSA-SHA256" },
  { label: "PROTOCOL", value: "SIGNAL-BASED" },
  { label: "FORWARD SECRECY", value: "ENABLED" },
];

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [keyVisible, setKeyVisible] = useState(false);

  const handleLogout = () => {
    if (Platform.OS === "web") {
      logout();
      return;
    }
    Alert.alert(
      "TERMINATE SESSION",
      "Are you sure you want to log out?",
      [
        { text: "CANCEL", style: "cancel" },
        {
          text: "TERMINATE",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            logout();
          },
        },
      ]
    );
  };

  const paddingTop = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: paddingTop + 12, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>IDENTITY</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 90 }]}
      >
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

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ENCRYPTION SPECS</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {ENCRYPTION_SPECS.map((spec, i) => (
            <View
              key={spec.label}
              style={[
                styles.specRow,
                i < ENCRYPTION_SPECS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <Text style={[styles.specLabel, { color: colors.mutedForeground }]}>{spec.label}</Text>
              <Text style={[styles.specValue, { color: colors.primary }]}>{spec.value}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PUBLIC KEY</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => setKeyVisible(!keyVisible)}
            style={styles.keyRow}
          >
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

        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.logoutBtn, { borderColor: colors.destructive }]}
          activeOpacity={0.7}
        >
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>TERMINATE SESSION</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold" as const,
    fontFamily: "monospace",
    letterSpacing: 3,
  },
  content: { padding: 16, gap: 8 },
  profileCard: {
    borderRadius: 4,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#050F05",
  },
  avatarText: { fontSize: 26, fontFamily: "monospace", fontWeight: "bold" as const },
  displayName: { fontSize: 20, fontWeight: "bold" as const, fontFamily: "monospace" },
  username: { fontSize: 13, fontFamily: "monospace" },
  onlinePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4,
  },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  onlineText: { fontSize: 10, fontFamily: "monospace", letterSpacing: 1 },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "monospace",
    letterSpacing: 2,
    marginTop: 8,
    marginBottom: 4,
    paddingLeft: 4,
  },
  card: {
    borderRadius: 4,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 4,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  specLabel: { fontSize: 11, fontFamily: "monospace" },
  specValue: { fontSize: 11, fontFamily: "monospace", fontWeight: "bold" as const },
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
  },
  keyToggle: { fontSize: 11, fontFamily: "monospace", letterSpacing: 1 },
  keyText: {
    fontSize: 10,
    fontFamily: "monospace",
    padding: 14,
    borderTopWidth: 1,
    lineHeight: 16,
    letterSpacing: 1,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  infoLabel: { fontSize: 11, fontFamily: "monospace" },
  infoValue: { fontSize: 11, fontFamily: "monospace", flex: 1, textAlign: "right" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 16,
    marginTop: 12,
  },
  logoutText: {
    fontSize: 14,
    fontFamily: "monospace",
    fontWeight: "bold" as const,
    letterSpacing: 2,
  },
});
