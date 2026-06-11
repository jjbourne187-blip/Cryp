import MessageBubble from "@/components/MessageBubble";
import { useAuth } from "@/context/AuthContext";
import { GHOST_DURATIONS, useMessages } from "@/context/MessagesContext";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
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
  const { conversations, getMessages, sendMessage, markRead, setGhostMode, deleteMessage } = useMessages();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showGhostPicker, setShowGhostPicker] = useState(false);
  const ghostPickerAnim = useRef(new Animated.Value(0)).current;
  const flatRef = useRef<FlatList>(null);

  const conversation = conversations.find((c) => c.id === id);
  const messages = getMessages(id ?? "");
  const ghostDuration = conversation?.ghostMode ?? null;

  const otherName = conversation
    ? Object.entries(conversation.participantNames).find(([uid]) => uid !== user?.id)?.[1] ?? "Unknown"
    : "Chat";

  useEffect(() => {
    if (id) markRead(id);
  }, [id, messages.length]);

  const toggleGhostPicker = () => {
    const opening = !showGhostPicker;
    setShowGhostPicker(opening);
    Animated.spring(ghostPickerAnim, {
      toValue: opening ? 1 : 0,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    }).start();
    if (opening) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleGhostSelect = async (value: number | null) => {
    if (!id) return;
    await setGhostMode(id, value);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toggleGhostPicker();
  };

  const handleSend = async () => {
    if (!text.trim() || !id || sending) return;
    const content = text.trim();
    setText("");
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await sendMessage(id, content, ghostDuration);
    setSending(false);
  };

  const handleExpire = useCallback((messageId: string) => {
    if (id) deleteMessage(id, messageId);
  }, [id, deleteMessage]);

  const paddingTop = insets.top + (Platform.OS === "web" ? 67 : 0);
  const ghostActive = ghostDuration !== null;
  const currentGhostLabel = GHOST_DURATIONS.find((d) => d.value === ghostDuration)?.label ?? "OFF";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
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

        {/* Ghost mode toggle */}
        <TouchableOpacity
          onPress={toggleGhostPicker}
          style={[
            styles.ghostBtn,
            {
              borderColor: ghostActive ? colors.destructive : colors.border,
              backgroundColor: ghostActive ? "rgba(255,0,64,0.08)" : colors.card,
            },
          ]}
          activeOpacity={0.7}
        >
          <Feather
            name="wind"
            size={15}
            color={ghostActive ? colors.destructive : colors.mutedForeground}
          />
          {ghostActive && (
            <Text style={[styles.ghostBtnLabel, { color: colors.destructive }]}>
              {currentGhostLabel}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Ghost mode active banner */}
      {ghostActive && (
        <View style={[styles.ghostBanner, { backgroundColor: "rgba(255,0,64,0.07)", borderBottomColor: "rgba(255,0,64,0.2)" }]}>
          <Feather name="wind" size={11} color={colors.destructive} />
          <Text style={[styles.ghostBannerText, { color: colors.destructive }]}>
            GHOST MODE · Messages self-destruct after {currentGhostLabel}
          </Text>
        </View>
      )}

      {/* Ghost mode picker modal */}
      {showGhostPicker && (
        <Pressable style={styles.pickerOverlay} onPress={toggleGhostPicker}>
          <Animated.View
            style={[
              styles.pickerPanel,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: ghostPickerAnim,
                transform: [{ scale: ghostPickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
              },
            ]}
          >
            <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
              <Feather name="wind" size={13} color={colors.destructive} />
              <Text style={[styles.pickerTitle, { color: colors.foreground }]}>GHOST MODE</Text>
            </View>
            <Text style={[styles.pickerSubtitle, { color: colors.mutedForeground }]}>
              Messages vanish after the selected time
            </Text>
            {GHOST_DURATIONS.map((opt) => {
              const isSelected = opt.value === ghostDuration;
              return (
                <TouchableOpacity
                  key={String(opt.value)}
                  onPress={() => handleGhostSelect(opt.value)}
                  style={[
                    styles.pickerOption,
                    {
                      borderColor: isSelected ? colors.destructive : colors.border,
                      backgroundColor: isSelected ? "rgba(255,0,64,0.1)" : "transparent",
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  {opt.value === null ? (
                    <Feather name="x-circle" size={16} color={isSelected ? colors.foreground : colors.mutedForeground} />
                  ) : (
                    <Feather name="wind" size={16} color={isSelected ? colors.destructive : colors.mutedForeground} />
                  )}
                  <Text style={[styles.pickerOptionText, { color: isSelected ? (opt.value === null ? colors.foreground : colors.destructive) : colors.mutedForeground }]}>
                    {opt.value === null ? "DISABLED" : `${opt.label} — self-destruct`}
                  </Text>
                  {isSelected && (
                    <Feather name="check" size={14} color={opt.value === null ? colors.foreground : colors.destructive} />
                  )}
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        </Pressable>
      )}

      <KeyboardAvoidingView style={styles.kbView} behavior="padding" keyboardVerticalOffset={0}>
        <FlatList
          ref={flatRef}
          data={[...messages].reverse()}
          keyExtractor={(item) => item.id}
          inverted
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isOwn={item.senderId === user?.id}
              onExpire={handleExpire}
            />
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
          borderTopColor: ghostActive ? "rgba(255,0,64,0.3)" : colors.border,
          backgroundColor: colors.background,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 8),
        }]}>
          <View style={[styles.inputWrapper, {
            borderColor: ghostActive ? "rgba(255,0,64,0.4)" : colors.border,
            backgroundColor: colors.card,
          }]}>
            <Feather
              name={ghostActive ? "wind" : "lock"}
              size={14}
              color={ghostActive ? colors.destructive : colors.mutedForeground}
              style={{ paddingLeft: 10 }}
            />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              value={text}
              onChangeText={setText}
              placeholder={ghostActive ? `GHOST MESSAGE (${currentGhostLabel})...` : "ENCRYPT AND SEND..."}
              placeholderTextColor={ghostActive ? "rgba(255,0,64,0.4)" : colors.border}
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
              {
                backgroundColor: text.trim()
                  ? ghostActive ? colors.destructive : colors.primary
                  : colors.card,
                borderColor: text.trim()
                  ? ghostActive ? colors.destructive : colors.primary
                  : colors.border,
              },
            ]}
          >
            <Feather
              name={ghostActive ? "wind" : "send"}
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
  ghostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 36,
  },
  ghostBtnLabel: {
    fontSize: 10,
    fontFamily: "monospace",
    fontWeight: "bold" as const,
  },
  ghostBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  ghostBannerText: {
    fontSize: 10,
    fontFamily: "monospace",
    letterSpacing: 0.5,
  },
  pickerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 110,
    paddingRight: 12,
  },
  pickerPanel: {
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 260,
    overflow: "hidden",
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: 13,
    fontFamily: "monospace",
    fontWeight: "bold" as const,
    letterSpacing: 2,
  },
  pickerSubtitle: {
    fontSize: 10,
    fontFamily: "monospace",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 0,
    borderTopWidth: 1,
  },
  pickerOptionText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "monospace",
  },
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
