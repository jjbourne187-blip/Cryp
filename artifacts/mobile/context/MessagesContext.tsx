import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

export interface Contact {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  publicKey: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  encryptedContent: string;
  timestamp: string;
  isEncrypted: boolean;
  expiresAt?: number;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participantNames: Record<string, string>;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  ghostMode?: number | null;
}

export const GHOST_DURATIONS: { label: string; value: number | null }[] = [
  { label: "OFF", value: null },
  { label: "10s", value: 10_000 },
  { label: "1 MIN", value: 60_000 },
  { label: "1 HR", value: 3_600_000 },
];

interface MessagesContextType {
  conversations: Conversation[];
  contacts: Contact[];
  getMessages: (conversationId: string) => Message[];
  sendMessage: (conversationId: string, content: string, ghostDuration?: number | null) => Promise<void>;
  addContact: (username: string) => Promise<{ success: boolean; error?: string }>;
  startConversation: (contactUserId: string) => Promise<string>;
  markRead: (conversationId: string) => void;
  setGhostMode: (conversationId: string, duration: number | null) => Promise<void>;
  deleteMessage: (conversationId: string, messageId: string) => Promise<void>;
  refreshAll: () => Promise<void>;
}

const MessagesContext = createContext<MessagesContextType | null>(null);

const CONTACTS_KEY = (uid: string) => `matrix_contacts_${uid}`;
const CONVOS_KEY = (uid: string) => `matrix_convos_${uid}`;
const MSGS_KEY = (convoId: string) => `matrix_msgs_${convoId}`;
const ALL_USERS_KEY = "matrix_users";

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function encryptContent(content: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let encrypted = "";
  for (let i = 0; i < content.length; i++) {
    encrypted += chars[Math.floor(Math.random() * chars.length)];
    if (i % 4 === 3) encrypted += " ";
  }
  return encrypted.trim();
}

function purgeExpired(msgs: Message[]): Message[] {
  const now = Date.now();
  return msgs.filter((m) => !m.expiresAt || m.expiresAt > now);
}

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [convoData, contactData] = await Promise.all([
        AsyncStorage.getItem(CONVOS_KEY(user.id)),
        AsyncStorage.getItem(CONTACTS_KEY(user.id)),
      ]);
      const convos: Conversation[] = convoData ? JSON.parse(convoData) : [];
      const ctcts: Contact[] = contactData ? JSON.parse(contactData) : [];
      setConversations(convos.sort((a, b) =>
        (b.lastMessageTime ?? "").localeCompare(a.lastMessageTime ?? "")
      ));
      setContacts(ctcts);

      const msgEntries = await Promise.all(
        convos.map(async (c) => {
          const data = await AsyncStorage.getItem(MSGS_KEY(c.id));
          const raw: Message[] = data ? JSON.parse(data) : [];
          const alive = purgeExpired(raw);
          if (alive.length !== raw.length) {
            await AsyncStorage.setItem(MSGS_KEY(c.id), JSON.stringify(alive));
          }
          return [c.id, alive] as [string, Message[]];
        })
      );
      setMessages(Object.fromEntries(msgEntries));
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getMessages = useCallback((conversationId: string): Message[] => {
    return messages[conversationId] ?? [];
  }, [messages]);

  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    ghostDuration?: number | null
  ) => {
    if (!user) return;
    const expiresAt = ghostDuration ? Date.now() + ghostDuration : undefined;
    const msg: Message = {
      id: generateId(),
      conversationId,
      senderId: user.id,
      content,
      encryptedContent: encryptContent(content),
      timestamp: new Date().toISOString(),
      isEncrypted: true,
      expiresAt,
    };
    const existing = messages[conversationId] ?? [];
    const updated = [...existing, msg];
    await AsyncStorage.setItem(MSGS_KEY(conversationId), JSON.stringify(updated));
    setMessages((prev) => ({ ...prev, [conversationId]: updated }));

    const convos = conversations.map((c) => {
      if (c.id !== conversationId) return c;
      return { ...c, lastMessage: content, lastMessageTime: msg.timestamp, unreadCount: 0 };
    });
    await AsyncStorage.setItem(CONVOS_KEY(user.id), JSON.stringify(convos));
    setConversations(convos.sort((a, b) =>
      (b.lastMessageTime ?? "").localeCompare(a.lastMessageTime ?? "")
    ));

    // Simulate reply (also ghost if ghost mode on)
    setTimeout(async () => {
      const replies = [
        "TRANSMISSION RECEIVED. Decrypting...",
        "SIGNAL SECURE. Message acknowledged.",
        "ENCRYPTION VERIFIED. Standing by.",
        "CONNECTION STABLE. Awaiting further input.",
        "HANDSHAKE COMPLETE. Channel encrypted.",
        "MESSAGE INTEGRITY: 100%. No interception detected.",
        "QUANTUM LOCK ENGAGED. Proceed.",
      ];
      const replyContent = replies[Math.floor(Math.random() * replies.length)];
      const convo = conversations.find((c) => c.id === conversationId);
      const otherId = convo?.participantIds.find((id) => id !== user.id);
      if (!otherId) return;
      const replyExpiresAt = ghostDuration ? Date.now() + ghostDuration : undefined;
      const replyMsg: Message = {
        id: generateId(),
        conversationId,
        senderId: otherId,
        content: replyContent,
        encryptedContent: encryptContent(replyContent),
        timestamp: new Date().toISOString(),
        isEncrypted: true,
        expiresAt: replyExpiresAt,
      };
      const currentMsgs = await AsyncStorage.getItem(MSGS_KEY(conversationId));
      const parsedMsgs: Message[] = currentMsgs ? JSON.parse(currentMsgs) : [];
      const withReply = [...purgeExpired(parsedMsgs), replyMsg];
      await AsyncStorage.setItem(MSGS_KEY(conversationId), JSON.stringify(withReply));
      setMessages((prev) => ({ ...prev, [conversationId]: withReply }));
    }, 1500 + Math.random() * 2000);
  }, [user, messages, conversations]);

  const addContact = useCallback(async (username: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "Not authenticated" };
    if (username.toLowerCase() === user.username.toLowerCase()) {
      return { success: false, error: "Cannot add yourself" };
    }
    const allUsersData = await AsyncStorage.getItem(ALL_USERS_KEY);
    const allUsers: Array<{ id: string; username: string; displayName: string; publicKey: string }> = allUsersData
      ? JSON.parse(allUsersData) : [];
    const found = allUsers.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (!found) return { success: false, error: "USER NOT FOUND in the network" };
    const existing = contacts.find((c) => c.userId === found.id);
    if (existing) return { success: false, error: "Contact already added" };
    const newContact: Contact = {
      id: generateId(),
      userId: found.id,
      username: found.username,
      displayName: found.displayName,
      publicKey: found.publicKey,
    };
    const updated = [...contacts, newContact];
    await AsyncStorage.setItem(CONTACTS_KEY(user.id), JSON.stringify(updated));
    setContacts(updated);
    return { success: true };
  }, [user, contacts]);

  const startConversation = useCallback(async (contactUserId: string): Promise<string> => {
    if (!user) throw new Error("Not authenticated");
    const existing = conversations.find(
      (c) => c.participantIds.includes(user.id) && c.participantIds.includes(contactUserId)
    );
    if (existing) return existing.id;
    const contact = contacts.find((c) => c.userId === contactUserId);
    const newConvo: Conversation = {
      id: generateId(),
      participantIds: [user.id, contactUserId],
      participantNames: {
        [user.id]: user.displayName,
        [contactUserId]: contact?.displayName ?? "Unknown",
      },
      unreadCount: 0,
      ghostMode: null,
    };
    const updated = [...conversations, newConvo];
    await AsyncStorage.setItem(CONVOS_KEY(user.id), JSON.stringify(updated));
    setConversations(updated);
    return newConvo.id;
  }, [user, conversations, contacts]);

  const markRead = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
    );
  }, []);

  const setGhostMode = useCallback(async (conversationId: string, duration: number | null) => {
    if (!user) return;
    const updated = conversations.map((c) =>
      c.id === conversationId ? { ...c, ghostMode: duration } : c
    );
    await AsyncStorage.setItem(CONVOS_KEY(user.id), JSON.stringify(updated));
    setConversations(updated);
  }, [user, conversations]);

  const deleteMessage = useCallback(async (conversationId: string, messageId: string) => {
    const existing = messages[conversationId] ?? [];
    const filtered = existing.filter((m) => m.id !== messageId);
    await AsyncStorage.setItem(MSGS_KEY(conversationId), JSON.stringify(filtered));
    setMessages((prev) => ({ ...prev, [conversationId]: filtered }));
  }, [messages]);

  return (
    <MessagesContext.Provider value={{
      conversations,
      contacts,
      getMessages,
      sendMessage,
      addContact,
      startConversation,
      markRead,
      setGhostMode,
      deleteMessage,
      refreshAll: loadData,
    }}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error("useMessages must be used within MessagesProvider");
  return ctx;
}
