import { pgTable, text, timestamp, bigint } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const conversationsTable = pgTable("conversations", {
  id: text("id").primaryKey(),
  ghostMode: bigint("ghost_mode", { mode: "number" }),
  lastMessage: text("last_message"),
  lastMessageTime: timestamp("last_message_time"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const conversationParticipantsTable = pgTable("conversation_participants", {
  conversationId: text("conversation_id").notNull().references(() => conversationsTable.id),
  userId: text("user_id").notNull().references(() => usersTable.id),
});

export const messagesTable = pgTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversationsTable.id),
  senderId: text("sender_id").notNull().references(() => usersTable.id),
  content: text("content").notNull(),
  expiresAt: bigint("expires_at", { mode: "number" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Conversation = typeof conversationsTable.$inferSelect;
export type ConversationParticipant = typeof conversationParticipantsTable.$inferSelect;
export type Message = typeof messagesTable.$inferSelect;
