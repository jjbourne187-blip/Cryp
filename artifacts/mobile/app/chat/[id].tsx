import MessageBubble from "@/components/MessageBubble";
import { useAuth } from "@/context/AuthContext";
import { useMessages } from "@/context/MessagesContext";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { conversations, getMessages, sendMessage, markRead } = useMessages();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const conversation = conversations.find((c) => c.id === id);
  const messages = getMessages(id ?? "");

  const otherName = conversation
    ? Object.entries(conversation.participantNames).find(([uid]) => uid !== user?.id)?.[1] ?? "Unknown"
    : "Chat";

  useEffect(() => {
    if (id) markRead(id);
  }, [id, messages.length]);

  const handleSend = async () => {
    if (!text.trim() || !id || sending) return;
    const content = text.trim();
    setText("");
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await sendMessage(id, content);
    setSending(false);
  };

  const paddingTop = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, {
        paddingTop: paddingTop + 8,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
      }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.primary} />
        </TouchableOpacity>
        <View style={[styles.avatar, { borderColor: colors.primary, backgroundColor: colors.card }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {otherName.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: colors.foreground }]}>{otherName}</Text>
          <View style={styles.encryptRow}>
            <Feather name="lock" size={10} color={colors.mutedForeground} />
            <Text style={[styles.encryptLabel, { color: colors.mutedForeground }]}>
              END-TO-END ENCRYPTED
            </Text>
          </View>
        </View>
        <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
      </View>

      <KeyboardAvoidingView
        style={styles.kbView}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatRef}
          data={[...messages].reverse()}
          keyExtractor={(item) => item.id}
          inverted
          renderItem={({ item }) => (
            <MessageBubble message={item} isOwn={item.senderId === user?.id} />
          )}
          contentContainerStyle={[styles.messageList, { paddingBottom: 8, paddingTop: 8 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Feather name="shield" size={32} color={colors.border} />
              <Text style={[styles.emptyChatText, { color: colors.mutedForeground }]}>
                SECURE CHANNEL ESTABLISHED
              </Text>
              <Text style={[styles.emptyChatSub, { color: colors.border }]}>
                All messages are end-to-end encrypted
              </Text>
            </View>
          }
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        />

        <View style={[styles.inputBar, {
          borderTopColor: colors.border,
          backgroundColor: colors.background,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 8),
        }]}>
          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Feather name="lock" size={14} color={colors.mutedForeground} style={{ paddingLeft: 10 }} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              value={text}
              onChangeText={setText}
              placeholder="ENCRYPT AND SEND..."
              placeholderTextColor={colors.border}
              multiline
              maxLength={1000}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
          </View>
          <TouchableOpacity
            onPress={handleSend}
            disabled={!text.trim() || sending}
            style={[
              styles.sendBtn,
              { backgroundColor: text.trim() ? colors.primary : colors.card },
              { borderColor: text.trim() ? colors.primary : colors.border },
            ]}
          >
            <Feather
              name="send"
              size={18}
              color={text.trim() ? colors.primaryForeground : colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: { padding: 4 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 13, fontFamily: "monospace", fontWeight: "bold" as const },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 15, fontWeight: "600" as const },
  encryptRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  encryptLabel: { fontSize: 9, fontFamily: "monospace", letterSpacing: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  kbView: { flex: 1 },
  messageList: { paddingHorizontal: 4, flexGrow: 1 },
  emptyChat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 10,
  },
  emptyChatText: { fontSize: 13, fontFamily: "monospace", fontWeight: "bold" as const, letterSpacing: 1 },
  emptyChatSub: { fontSize: 11, fontFamily: "monospace" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 4,
    minHeight: 44,
    maxHeight: 120,
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "monospace",
    lineHeight: 20,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
