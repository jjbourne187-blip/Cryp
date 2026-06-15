import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { useAuth } from "./AuthContext";

const GRACE_MS = 3000; // lock after 3 s in background

interface AppLockContextType {
  isPinEnabled: boolean;
  isLocked: boolean;
  isSetupDone: boolean;
  lock: () => void;
  unlock: (pin: string) => boolean;
  setupPin: (pin: string) => Promise<void>;
  disablePin: (pin: string) => boolean;
  changePin: (oldPin: string, newPin: string) => boolean;
}

const AppLockContext = createContext<AppLockContextType | null>(null);

const PIN_KEY = (uid: string) => `matrix_pin_${uid}`;
const PIN_ENABLED_KEY = (uid: string) => `matrix_pin_enabled_${uid}`;

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isPinEnabled, setIsPinEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isSetupDone, setIsSetupDone] = useState(false);
  const bgTimestamp = useRef<number | null>(null);
  const storedPin = useRef<string | null>(null);

  // Load PIN settings when user changes
  useEffect(() => {
    if (!user) {
      setIsPinEnabled(false);
      setIsLocked(false);
      setIsSetupDone(true);
      storedPin.current = null;
      return;
    }
    (async () => {
      try {
        const [pin, enabled] = await Promise.all([
          AsyncStorage.getItem(PIN_KEY(user.id)),
          AsyncStorage.getItem(PIN_ENABLED_KEY(user.id)),
        ]);
        storedPin.current = pin;
        const active = enabled === "true" && !!pin;
        setIsPinEnabled(active);
        if (active) setIsLocked(true); // lock on first load if PIN is set
      } finally {
        setIsSetupDone(true);
      }
    })();
  }, [user?.id]);

  // AppState listener — lock when returning from background
  useEffect(() => {
    if (Platform.OS === "web") return;

    const handleChange = (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        bgTimestamp.current = Date.now();
      } else if (nextState === "active") {
        if (
          isPinEnabled &&
          bgTimestamp.current !== null &&
          Date.now() - bgTimestamp.current > GRACE_MS
        ) {
          setIsLocked(true);
        }
        bgTimestamp.current = null;
      }
    };

    const sub = AppState.addEventListener("change", handleChange);
    return () => sub.remove();
  }, [isPinEnabled]);

  const lock = useCallback(() => {
    if (isPinEnabled) setIsLocked(true);
  }, [isPinEnabled]);

  const unlock = useCallback((pin: string): boolean => {
    if (pin === storedPin.current) {
      setIsLocked(false);
      return true;
    }
    return false;
  }, []);

  const setupPin = useCallback(async (pin: string) => {
    if (!user) return;
    storedPin.current = pin;
    await AsyncStorage.setItem(PIN_KEY(user.id), pin);
    await AsyncStorage.setItem(PIN_ENABLED_KEY(user.id), "true");
    setIsPinEnabled(true);
    setIsLocked(false);
  }, [user]);

  const disablePin = useCallback((pin: string): boolean => {
    if (pin !== storedPin.current) return false;
    if (user) {
      AsyncStorage.removeItem(PIN_KEY(user.id));
      AsyncStorage.setItem(PIN_ENABLED_KEY(user.id), "false");
    }
    storedPin.current = null;
    setIsPinEnabled(false);
    setIsLocked(false);
    return true;
  }, [user]);

  const changePin = useCallback((oldPin: string, newPin: string): boolean => {
    if (oldPin !== storedPin.current) return false;
    storedPin.current = newPin;
    if (user) AsyncStorage.setItem(PIN_KEY(user.id), newPin);
    return true;
  }, [user]);

  return (
    <AppLockContext.Provider value={{
      isPinEnabled, isLocked, isSetupDone,
      lock, unlock, setupPin, disablePin, changePin,
    }}>
      {children}
    </AppLockContext.Provider>
  );
}

export function useAppLock() {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error("useAppLock must be used within AppLockProvider");
  return ctx;
}
