import { useMessages } from "@/context/MessagesContext";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function ContactsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { contacts, addContact, startConversation } = useMessages();
  const [searchText, setSearchText] = useState("");
  const [addUsername, setAddUsername] = useState("");
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const filtered = contacts.filter(
    (c) =>
      c.displayName.toLowerCase().includes(searchText.toLowerCase()) ||
      c.username.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleAdd = async () => {
    if (!addUsername.trim()) return;
    setAdding(true);
    setAddError("");
    setAddSuccess("");
    const result = await addContact(addUsername.trim());
    setAdding(false);
    if (!result.success) {
      setAddError(result.error ?? "FAILED");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      setAddSuccess("NODE ADDED SUCCESSFULLY");
      setAddUsername("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => { setAddSuccess(""); setShowAdd(false); }, 1500);
    }
  };

  const handleMessage = async (contactUserId: string) => {
    const convoId = await startConversation(contactUserId);
    router.push(`/chat/${convoId}`);
  };

  const paddingTop = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: paddingTop + 12, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>NETWORK NODES</Text>
        <TouchableOpacity
          onPress={() => { setShowAdd(!showAdd); setAddError(""); setAddSuccess(""); }}
          style={[styles.addBtn, { borderColor: showAdd ? colors.primary : colors.border, backgroundColor: colors.card }]}
        >
          <Feather name={showAdd ? "x" : "user-plus"} size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {showAdd && (
        <View style={[styles.addPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.addLabel, { color: colors.mutedForeground }]}>{">"} ADD NODE BY USERNAME</Text>
          <View style={[styles.addRow]}>
            <View style={[styles.addInputWrapper, { borderColor: colors.border, backgroundColor: colors.background, flex: 1 }]}>
              <TextInput
                style={[styles.addInput, { color: colors.foreground }]}
                value={addUsername}
                onChangeText={setAddUsername}
                placeholder="ENTER USERNAME"
                placeholderTextColor={colors.border}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <TouchableOpacity
              onPress={handleAdd}
              disabled={adding}
              style={[styles.addConfirmBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name={adding ? "loader" : "check"} size={18} color={colors.primaryForeground} />
            </TouchableOpacity>
          </View>
          {!!addError && (
            <Text style={[styles.addError, { color: colors.destructive }]}>{addError}</Text>
          )}
          {!!addSuccess && (
            <Text style={[styles.addSuccess, { color: colors.primary }]}>{addSuccess}</Text>
          )}
        </View>
      )}

      <View style={[styles.searchRow, { borderColor: colors.border }]}>
        <Feather name="search" size={14} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="SEARCH NODES..."
          placeholderTextColor={colors.border}
          autoCapitalize="none"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.contactRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.avatar, { borderColor: colors.primary, backgroundColor: colors.card }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {item.displayName.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.contactInfo}>
              <Text style={[styles.contactName, { color: colors.foreground }]}>{item.displayName}</Text>
              <Text style={[styles.contactUsername, { color: colors.mutedForeground }]}>
                @{item.username}
              </Text>
              <Text style={[styles.contactKey, { color: colors.border }]} numberOfLines={1}>
                PK: {item.publicKey}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleMessage(item.userId)}
              style={[styles.messageBtn, { borderColor: colors.primary }]}
            >
              <Feather name="message-circle" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={40} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>NO NODES FOUND</Text>
            <Text style={[styles.emptyText, { color: colors.border }]}>
              {searchText ? "No matching nodes" : 'Tap "+" to add a node by username'}
            </Text>
          </View>
        }
        contentContainerStyle={filtered.length === 0 ? styles.emptyContent : undefined}
        style={{ flex: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
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
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  addPanel: {
    margin: 12,
    borderRadius: 4,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  addLabel: { fontSize: 10, fontFamily: "monospace", letterSpacing: 2 },
  addRow: { flexDirection: "row", gap: 8 },
  addInputWrapper: {
    borderWidth: 1,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  addInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "monospace",
  },
  addConfirmBtn: {
    width: 44,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  addError: { fontSize: 11, fontFamily: "monospace" },
  addSuccess: { fontSize: 11, fontFamily: "monospace", letterSpacing: 1 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: "monospace",
    paddingVertical: 0,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontFamily: "monospace", fontWeight: "bold" as const },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 15, fontWeight: "600" as const },
  contactUsername: { fontSize: 12, fontFamily: "monospace", marginTop: 1 },
  contactKey: { fontSize: 9, fontFamily: "monospace", marginTop: 2 },
  messageBtn: {
    width: 38,
    height: 38,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyContent: { flex: 1 },
  emptyTitle: {
    fontSize: 14,
    fontFamily: "monospace",
    fontWeight: "bold" as const,
    letterSpacing: 2,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: "monospace",
    textAlign: "center",
    lineHeight: 18,
  },
});
