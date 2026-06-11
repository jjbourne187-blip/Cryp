import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Conversation } from "@/context/MessagesContext";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

interface ConversationItemProps {
  conversation: Conversation;
  onPress: () => void;
}

export default function ConversationItem({ conversation, onPress }: ConversationItemProps) {
  const colors = useColors();
  const { user } = useAuth();

  const otherName = Object.entries(conversation.participantNames)
    .find(([id]) => id !== user?.id)?.[1] ?? "Unknown";

  const lastTime = conversation.lastMessageTime
    ? new Date(conversation.lastMessageTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  const initials = otherName.slice(0, 2).toUpperCase();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, { borderBottomColor: colors.border }]}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { borderColor: colors.primary }]}>
        <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.name, { color: colors.foreground }]}>{otherName}</Text>
          <View style={styles.headerRight}>
            {conversation.unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>
                  {conversation.unreadCount}
                </Text>
              </View>
            )}
            <Text style={[styles.time, { color: colors.mutedForeground }]}>{lastTime}</Text>
          </View>
        </View>
        <View style={styles.preview}>
          <Feather name="lock" size={10} color={colors.mutedForeground} style={styles.lockIcon} />
          <Text style={[styles.lastMessage, { color: colors.mutedForeground }]} numberOfLines={1}>
            {conversation.lastMessage ? "Encrypted message" : "No messages yet"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#050F05",
  },
  avatarText: {
    fontSize: 16,
    fontFamily: "monospace",
    fontWeight: "bold" as const,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badge: {
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "bold" as const,
  },
  time: {
    fontSize: 11,
    fontFamily: "monospace",
  },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  lockIcon: {
    marginRight: 4,
  },
  lastMessage: {
    fontSize: 13,
    flex: 1,
    fontFamily: "monospace",
  },
});
