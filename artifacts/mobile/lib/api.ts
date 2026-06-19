import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const TOKEN_KEY = "cryptic_token";

function getBase(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/api`;
  }
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}/api` : "http://localhost:5000/api";
}

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function saveToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  authed = true
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authed) {
    const token = await getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${getBase()}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j.error ?? msg; } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: string;
  username: string;
  displayName: string;
  publicKey: string;
  createdAt: string;
}

export interface ApiContact {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  publicKey: string;
}

export interface ApiConversation {
  id: string;
  participantIds: string[];
  participantNames: Record<string, string>;
  lastMessage: string | null;
  lastMessageTime: string | null;
  ghostMode: number | null;
  unreadCount: number;
}

export interface ApiMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: string;
  isEncrypted: boolean;
  expiresAt?: number;
}

// ── Auth ───────────────────────────────────────────────────────────────────

export async function apiRegister(username: string, password: string, displayName: string): Promise<{ token: string; user: ApiUser }> {
  return request("POST", "/auth/register", { username, password, displayName }, false);
}

export async function apiLogin(username: string, password: string): Promise<{ token: string; user: ApiUser }> {
  return request("POST", "/auth/login", { username, password }, false);
}

export async function apiLogout(): Promise<void> {
  try { await request("POST", "/auth/logout", undefined, true); } catch {}
  await clearToken();
}

export async function apiGetMe(): Promise<ApiUser> {
  return request("GET", "/users/me");
}

// ── Users ──────────────────────────────────────────────────────────────────

export async function apiGetUserByUsername(username: string): Promise<ApiUser> {
  return request("GET", `/users/${encodeURIComponent(username)}`);
}

// ── Contacts ───────────────────────────────────────────────────────────────

export async function apiGetContacts(): Promise<ApiContact[]> {
  return request("GET", "/contacts");
}

export async function apiAddContact(username: string): Promise<ApiContact> {
  return request("POST", "/contacts", { username });
}

// ── Conversations ──────────────────────────────────────────────────────────

export async function apiGetConversations(): Promise<ApiConversation[]> {
  return request("GET", "/conversations");
}

export async function apiStartConversation(contactUserId: string): Promise<ApiConversation> {
  return request("POST", "/conversations", { contactUserId });
}

export async function apiGetMessages(conversationId: string, since?: number): Promise<ApiMessage[]> {
  const qs = since ? `?since=${since}` : "";
  return request("GET", `/conversations/${conversationId}/messages${qs}`);
}

export async function apiSendMessage(conversationId: string, content: string, ghostDuration?: number | null): Promise<ApiMessage> {
  return request("POST", `/conversations/${conversationId}/messages`, { content, ghostDuration });
}

export async function apiSetGhostMode(conversationId: string, duration: number | null): Promise<void> {
  await request("PATCH", `/conversations/${conversationId}/ghost`, { duration });
}

export async function apiWipeAllMessages(): Promise<void> {
  await request("DELETE", "/messages/wipe");
}
