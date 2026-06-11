import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MATRIX_CHARS = "01アイウエオカキクケコサシスセソタチツテトナニヌネノABCDEFGHIJKLMNOPQRSTUVWXYZ";
const COLUMN_WIDTH = 16;
const NUM_COLUMNS = Math.floor(SCREEN_WIDTH / COLUMN_WIDTH);

function MatrixColumn({ index }: { index: number }) {
  const translateY = useRef(new Animated.Value(-SCREEN_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = Math.random() * 3000;
    const duration = 2000 + Math.random() * 3000;

    const animate = () => {
      translateY.setValue(-SCREEN_HEIGHT * 0.3 - Math.random() * SCREEN_HEIGHT);
      opacity.setValue(0.3 + Math.random() * 0.7);

      Animated.sequence([
        Animated.delay(delay + Math.random() * 2000),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
              Animated.timing(opacity, { toValue: 0.8, duration: 200, useNativeDriver: true }),
              Animated.timing(opacity, { toValue: 0, duration: duration * 0.3, delay: duration * 0.7, useNativeDriver: true }),
            ]),
        ]),
      ]).start(() => animate());
    };

    animate();
  }, []);

  const chars = Array.from({ length: 20 }, () =>
    MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]
  ).join("\n");

  return (
    <Animated.Text
      style={[
        styles.column,
        {
          left: index * COLUMN_WIDTH,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      {chars}
    </Animated.Text>
  );
}

export default function MatrixRain({ style }: { style?: object }) {
  return (
    <View style={[styles.container, style]} pointerEvents="none">
      {Array.from({ length: NUM_COLUMNS }, (_, i) => (
        <MatrixColumn key={i} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  column: {
    position: "absolute",
    fontSize: 12,
    fontFamily: "monospace",
    color: "#00FF41",
    lineHeight: 16,
    textAlign: "center",
    width: COLUMN_WIDTH,
  },
});
