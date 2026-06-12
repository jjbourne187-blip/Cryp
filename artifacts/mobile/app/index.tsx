import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function Index() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color="#00FF41" size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
});
