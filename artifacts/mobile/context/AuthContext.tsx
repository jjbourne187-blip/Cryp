import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface User {
  id: string;
  username: string;
  displayName: string;
  publicKey: string;
  createdAt: string;
}

interface StoredUser extends User {
  password: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USERS_KEY = "matrix_users";
const SESSION_KEY = "matrix_session";

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function generatePublicKey(): string {
  const chars = "0123456789abcdef";
  let key = "0x";
  for (let i = 0; i < 40; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

async function getStoredUsers(): Promise<StoredUser[]> {
  try {
    const data = await AsyncStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function saveUsers(users: StoredUser[]): Promise<void> {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const sessionData = await AsyncStorage.getItem(SESSION_KEY);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          const users = await getStoredUsers();
          const found = users.find((u) => u.id === session.userId);
          if (found) {
            const { password: _pw, ...safeUser } = found;
            setUser(safeUser);
          }
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const users = await getStoredUsers();
    const found = users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );
    if (!found) {
      return { success: false, error: "ACCESS DENIED: Invalid credentials" };
    }
    const { password: _pw, ...safeUser } = found;
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ userId: found.id }));
    setUser(safeUser);
    return { success: true };
  }, []);

  const register = useCallback(async (username: string, password: string, displayName: string) => {
    if (!username.trim() || !password.trim() || !displayName.trim()) {
      return { success: false, error: "All fields required" };
    }
    if (username.length < 3) {
      return { success: false, error: "Username must be at least 3 characters" };
    }
    if (password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters" };
    }
    const users = await getStoredUsers();
    const exists = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (exists) {
      return { success: false, error: "USERNAME TAKEN: Identity already registered" };
    }
    const newUser: StoredUser = {
      id: generateId(),
      username: username.trim(),
      displayName: displayName.trim(),
      password,
      publicKey: generatePublicKey(),
      createdAt: new Date().toISOString(),
    };
    await saveUsers([...users, newUser]);
    const { password: _pw, ...safeUser } = newUser;
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ userId: newUser.id }));
    setUser(safeUser);
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
