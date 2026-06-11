import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Message } from "@/context/MessagesContext";
import { useColors } from "@/hooks/useColors";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

const MATRIX_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

export default function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const colors = useColors();
  const [revealed, setRevealed] = useState(false);
  const [displayText, setDisplayText] = useState(message.encryptedContent.slice(0, 20) + "...");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isOwn ? 30 : -30)).current;

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

  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Animated.View
      style={[
        styles.wrapper,
        isOwn ? styles.ownWrapper : styles.otherWrapper,
        { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
      ]}
    >
      <View
        style={[
          styles.bubble,
          isOwn ? styles.ownBubble : styles.otherBubble,
          { borderColor: isOwn ? colors.primary : colors.border },
        ]}
      >
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
          <Feather name="lock" size={9} color={isOwn ? "rgba(0,0,0,0.6)" : colors.mutedForeground} />
          <Text style={[styles.time, { color: isOwn ? "rgba(0,0,0,0.6)" : colors.mutedForeground }]}>
            {" "}{time}
          </Text>
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
  ownWrapper: {
    alignSelf: "flex-end",
  },
  otherWrapper: {
    alignSelf: "flex-start",
  },
  bubble: {
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  ownBubble: {
    backgroundColor: "#00FF41",
  },
  otherBubble: {
    backgroundColor: "#050F05",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "monospace",
  },
  scrambledText: {
    opacity: 0.7,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    justifyContent: "flex-end",
  },
  time: {
    fontSize: 10,
  },
});
