import ConversationItem from "@/components/ConversationItem";
import { useMessages } from "@/context/MessagesContext";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback } from "react";
import {
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function ChatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { conversations, refreshAll } = useMessages();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, [refreshAll]);

  const paddingTop = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: paddingTop + 12, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>SECURE CHATS</Text>
          <View style={styles.headerSub}>
            <View style={[styles.onlineDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.headerSubText, { color: colors.mutedForeground }]}>
              {conversations.length} ENCRYPTED CHANNELS
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/(main)/contacts")}
          style={[styles.newBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <Feather name="edit" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationItem
            conversation={item}
            onPress={() => router.push(`/chat/${item.id}`)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="lock" size={40} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>
              NO ACTIVE CHANNELS
            </Text>
            <Text style={[styles.emptyText, { color: colors.border }]}>
              Add a node in NODES to start{"\n"}an encrypted conversation
            </Text>
          </View>
        }
        contentContainerStyle={conversations.length === 0 ? styles.emptyContent : undefined}
        contentInsetAdjustmentBehavior="never"
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
  headerSub: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  headerSubText: { fontSize: 10, fontFamily: "monospace" },
  newBtn: {
    width: 40,
    height: 40,
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
