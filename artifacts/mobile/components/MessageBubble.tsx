import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Message } from "@/context/MessagesContext";
import { useColors } from "@/hooks/useColors";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onExpire?: (id: string) => void;
}

const MATRIX_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0s";
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return rem > 0 ? `${m}m${rem}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return remM > 0 ? `${h}h${remM}m` : `${h}h`;
}

export default function MessageBubble({ message, isOwn, onExpire }: MessageBubbleProps) {
  const colors = useColors();
  const [revealed, setRevealed] = useState(false);
  const [displayText, setDisplayText] = useState(message.encryptedContent.slice(0, 20) + "...");
  const [countdown, setCountdown] = useState<number | null>(
    message.expiresAt ? Math.max(0, message.expiresAt - Date.now()) : null
  );
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isOwn ? 30 : -30)).current;
  const ghostFadeAnim = useRef(new Animated.Value(1)).current;
  const hasExpired = useRef(false);

  // Reveal animation + scramble
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 100, friction: 8 }),
    ]).start();

    let frame = 0;
    const totalFrames = 12;
    const target = message.content;
    const interval = setInterval(() => {
      frame++;
      if (frame >= totalFrames) {
        setDisplayText(target);
        setRevealed(true);
        clearInterval(interval);
        return;
      }
      const progress = frame / totalFrames;
      const revealedChars = Math.floor(progress * target.length);
      let scrambled = "";
      for (let i = 0; i < target.length; i++) {
        if (i < revealedChars) {
          scrambled += target[i];
        } else {
          scrambled += MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        }
      }
      setDisplayText(scrambled);
    }, 60);

    return () => clearInterval(interval);
  }, []);

  // Ghost countdown + expiry
  useEffect(() => {
    if (!message.expiresAt) return;

    const tick = setInterval(() => {
      const remaining = message.expiresAt! - Date.now();
      if (remaining <= 0) {
        clearInterval(tick);
        if (!hasExpired.current) {
          hasExpired.current = true;
          // Fade out then notify parent
          Animated.timing(ghostFadeAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }).start(() => {
            onExpire?.(message.id);
          });
        }
        return;
      }
      setCountdown(remaining);
    }, 500);

    return () => clearInterval(tick);
  }, [message.expiresAt]);

  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isGhost = !!message.expiresAt;
  const isUrgent = countdown !== null && countdown < 10_000;

  const metaColor = isOwn ? "rgba(0,0,0,0.6)" : colors.mutedForeground;
  const ghostColor = isUrgent
    ? colors.destructive
    : isOwn
    ? "rgba(0,0,0,0.7)"
    : colors.mutedForeground;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        isOwn ? styles.ownWrapper : styles.otherWrapper,
        {
          opacity: Animated.multiply(fadeAnim, ghostFadeAnim),
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      <View
        style={[
          styles.bubble,
          isOwn ? styles.ownBubble : styles.otherBubble,
          {
            borderColor: isGhost
              ? isUrgent
                ? colors.destructive
                : isOwn
                ? "rgba(255,0,64,0.4)"
                : colors.mutedForeground
              : isOwn
              ? colors.primary
              : colors.border,
          },
        ]}
      >
        {isGhost && (
          <View style={[styles.ghostBanner, { borderBottomColor: isOwn ? "rgba(0,0,0,0.15)" : colors.border }]}>
            <Feather name="wind" size={9} color={ghostColor} />
            <Text style={[styles.ghostLabel, { color: ghostColor }]}>GHOST MESSAGE</Text>
          </View>
        )}

        <Text
          style={[
            styles.messageText,
            { color: isOwn ? colors.primaryForeground : colors.foreground },
            !revealed && styles.scrambledText,
          ]}
        >
          {displayText}
        </Text>

        <View style={styles.meta}>
          {isGhost && countdown !== null ? (
            <>
              <Feather name="clock" size={9} color={ghostColor} />
              <Text style={[styles.countdown, { color: ghostColor }]}>
                {" "}{formatCountdown(countdown)}
              </Text>
              <View style={styles.metaSep} />
            </>
          ) : null}
          <Feather name="lock" size={9} color={metaColor} />
          <Text style={[styles.time, { color: metaColor }]}>{" "}{time}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 3,
    paddingHorizontal: 12,
    maxWidth: "80%",
  },
  ownWrapper: { alignSelf: "flex-end" },
  otherWrapper: { alignSelf: "flex-start" },
  bubble: {
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderWidth: 1,
  },
  ownBubble: { backgroundColor: "#00FF41" },
  otherBubble: { backgroundColor: "#050F05" },
  ghostBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
    paddingBottom: 5,
    borderBottomWidth: 1,
  },
  ghostLabel: {
    fontSize: 8,
    fontFamily: "monospace",
    letterSpacing: 1.5,
    fontWeight: "bold" as const,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "monospace",
  },
  scrambledText: { opacity: 0.7 },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    justifyContent: "flex-end",
  },
  countdown: {
    fontSize: 10,
    fontFamily: "monospace",
    fontWeight: "bold" as const,
  },
  metaSep: { width: 6 },
  time: { fontSize: 10 },
});
