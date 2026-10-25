import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  apiLogin,
  apiLogout,
  apiRegister,
  apiGetMe,
  saveToken,
  clearToken,
  ApiRequestError,
  type ApiUser,
} from "@/lib/api";

export interface User {
  id: string;
  username: string;
  displayName: string;
  publicKey: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const SESSION_KEY = "cryptic_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem(SESSION_KEY);
        if (token) {
          const me = await apiGetMe();
          setUser(me);
        }
      } catch (err) {
        // Keep a valid saved session when the server is temporarily unreachable.
        // Only discard credentials when the server explicitly rejects the token.
        if (err instanceof ApiRequestError && err.status === 401) {
          await clearToken();
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const { token, user: apiUser } = await apiLogin(username, password);
      await saveToken(token);
      setUser(apiUser);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      return { success: false, error: msg };
    }
  }, []);

  const register = useCallback(async (username: string, password: string, displayName: string) => {
    if (!username.trim() || !password.trim() || !displayName.trim()) {
      return { success: false, error: "All fields required" };
    }
    try {
      const { token, user: apiUser } = await apiRegister(username, password, displayName);
      await saveToken(token);
      setUser(apiUser);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      return { success: false, error: msg };
    }
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
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
