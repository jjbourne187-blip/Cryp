import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  apiGetContacts,
  apiAddContact,
  apiGetConversations,
  apiStartConversation,
  apiGetMessages,
  apiSendMessage,
  apiSetGhostMode,
  apiWipeAllMessages,
  type ApiContact,
  type ApiConversation,
  type ApiMessage,
} from "@/lib/api";

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
  wipeAllMessages: () => Promise<void>;
  refreshAll: () => Promise<void>;
  pollMessages: (conversationId: string) => void;
  stopPolling: () => void;
}

const MessagesContext = createContext<MessagesContextType | null>(null);

function toConversation(c: ApiConversation): Conversation {
  return {
    id: c.id,
    participantIds: c.participantIds,
    participantNames: c.participantNames,
    lastMessage: c.lastMessage ?? undefined,
    lastMessageTime: c.lastMessageTime ?? undefined,
    unreadCount: c.unreadCount,
    ghostMode: c.ghostMode,
  };
}

function toMessage(m: ApiMessage): Message {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    content: m.content,
    encryptedContent: "",
    timestamp: m.timestamp,
    isEncrypted: true,
    expiresAt: m.expiresAt,
  };
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

  const pollConvoId = useRef<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSinceRef = useRef<Record<string, number>>({});

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [convos, ctcts] = await Promise.all([
        apiGetConversations(),
        apiGetContacts(),
      ]);
      setConversations(convos.map(toConversation));
      setContacts(ctcts);

      const now = Date.now();
      const msgEntries = await Promise.all(
        convos.map(async (c) => {
          try {
            const msgs = await apiGetMessages(c.id);
            return [c.id, purgeExpired(msgs.map(toMessage))] as [string, Message[]];
          } catch {
            return [c.id, []] as [string, Message[]];
          }
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

  // ── Polling for active chat ──────────────────────────────────────────────
  const pollMessages = useCallback((conversationId: string) => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollConvoId.current = conversationId;
    if (!lastSinceRef.current[conversationId]) {
      lastSinceRef.current[conversationId] = Date.now() - 5000;
    }

    const poll = async () => {
      if (!pollConvoId.current) return;
      try {
        const since = lastSinceRef.current[conversationId] ?? 0;
        const newMsgs = await apiGetMessages(conversationId, since);
        if (newMsgs.length > 0) {
          lastSinceRef.current[conversationId] = Date.now();
          setMessages((prev) => {
            const existing = prev[conversationId] ?? [];
            const existingIds = new Set(existing.map((m) => m.id));
            const fresh = newMsgs.filter((m) => !existingIds.has(m.id)).map(toMessage);
            if (fresh.length === 0) return prev;
            const updated = purgeExpired([...existing, ...fresh]);
            return { ...prev, [conversationId]: updated };
          });
          // Update conversation last message
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== conversationId) return c;
              const last = newMsgs[newMsgs.length - 1];
              return { ...c, lastMessage: last.content, lastMessageTime: last.timestamp };
            })
          );
        }
      } catch {}
    };

    poll();
    pollTimer.current = setInterval(poll, 3000);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; }
    pollConvoId.current = null;
  }, []);

  useEffect(() => {
    return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
  }, []);

  const getMessages = useCallback((conversationId: string): Message[] => {
    return purgeExpired(messages[conversationId] ?? []);
  }, [messages]);

  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    ghostDuration?: number | null
  ) => {
    if (!user) return;
    try {
      const msg = await apiSendMessage(conversationId, content, ghostDuration);
      const newMsg = toMessage(msg);
      setMessages((prev) => {
        const existing = prev[conversationId] ?? [];
        return { ...prev, [conversationId]: [...existing, newMsg] };
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.id !== conversationId ? c : { ...c, lastMessage: content, lastMessageTime: newMsg.timestamp, unreadCount: 0 }
        ).sort((a, b) => (b.lastMessageTime ?? "").localeCompare(a.lastMessageTime ?? ""))
      );
      lastSinceRef.current[conversationId] = Date.now();
    } catch (err) {
      console.warn("Send message failed:", err);
    }
  }, [user]);

  const addContact = useCallback(async (username: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "Not authenticated" };
    try {
      const contact = await apiAddContact(username);
      setContacts((prev) => {
        if (prev.find((c) => c.userId === contact.userId)) return prev;
        return [...prev, contact];
      });
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add contact";
      return { success: false, error: msg };
    }
  }, [user]);

  const startConversation = useCallback(async (contactUserId: string): Promise<string> => {
    if (!user) throw new Error("Not authenticated");
    const convo = await apiStartConversation(contactUserId);
    setConversations((prev) => {
      if (prev.find((c) => c.id === convo.id)) return prev;
      return [...prev, toConversation(convo)];
    });
    return convo.id;
  }, [user]);

  const markRead = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
    );
  }, []);

  const setGhostMode = useCallback(async (conversationId: string, duration: number | null) => {
    await apiSetGhostMode(conversationId, duration);
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, ghostMode: duration } : c))
    );
  }, []);

  const deleteMessage = useCallback(async (conversationId: string, messageId: string) => {
    setMessages((prev) => {
      const filtered = (prev[conversationId] ?? []).filter((m) => m.id !== messageId);
      return { ...prev, [conversationId]: filtered };
    });
  }, []);

  const wipeAllMessages = useCallback(async () => {
    if (!user) return;
    await apiWipeAllMessages();
    setMessages({});
    setConversations((prev) =>
      prev.map((c) => ({ ...c, lastMessage: undefined, lastMessageTime: undefined, unreadCount: 0 }))
    );
  }, [user]);

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
      wipeAllMessages,
      refreshAll: loadData,
      pollMessages,
      stopPolling,
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
