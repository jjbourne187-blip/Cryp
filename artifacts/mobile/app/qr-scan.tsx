import { useMessages } from "@/context/MessagesContext";
import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ScanState = "scanning" | "success" | "error" | "duplicate";

export default function QRScanScreen() {
  const insets = useSafeAreaInsets();
  const { addContact } = useMessages();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>("scanning");
  const [resultMessage, setResultMessage] = useState("");
  const [scannedName, setScannedName] = useState("");
  const cooldown = useRef(false);

  const handleBarcode = async ({ data }: { data: string }) => {
    if (cooldown.current || scanState !== "scanning") return;
    cooldown.current = true;

    try {
      let username = data.trim();
      let displayName = "";

      // Try parsing JSON format {"cryptic":"1","u":"username","d":"displayName"}
      if (data.startsWith("{")) {
        const parsed = JSON.parse(data);
        if (parsed.cryptic !== "1" && parsed.type !== "cryptic") {
          setResultMessage("NOT A CRYPTIC QR CODE");
          setScanState("error");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setTimeout(() => { setScanState("scanning"); cooldown.current = false; }, 2000);
          return;
        }
        username = parsed.u ?? parsed.username ?? "";
        displayName = parsed.d ?? parsed.displayName ?? username;
      }

      if (!username) {
        setResultMessage("INVALID QR DATA");
        setScanState("error");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTimeout(() => { setScanState("scanning"); cooldown.current = false; }, 2000);
        return;
      }

      const result = await addContact(username);
      if (result.success) {
        setScannedName(displayName || username);
        setResultMessage(`NODE LINKED: @${username}`);
        setScanState("success");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => router.back(), 2200);
      } else if (result.error?.includes("already")) {
        setResultMessage("NODE ALREADY IN NETWORK");
        setScanState("duplicate");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTimeout(() => { setScanState("scanning"); cooldown.current = false; }, 2000);
      } else {
        setResultMessage(result.error ?? "USER NOT FOUND");
        setScanState("error");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTimeout(() => { setScanState("scanning"); cooldown.current = false; }, 2000);
      }
    } catch {
      setResultMessage("INVALID QR CODE");
      setScanState("error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => { setScanState("scanning"); cooldown.current = false; }, 2000);
    }
  };

  const statusColor =
    scanState === "success" ? "#00FF41" :
    scanState === "error" ? "#FF0040" :
    scanState === "duplicate" ? "#FFB800" :
    "#00FF41";

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#00FF41" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>SCAN NODE QR</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.webFallback}>
          <Feather name="smartphone" size={48} color="#1A3A1A" />
          <Text style={styles.webTitle}>USE MOBILE APP</Text>
          <Text style={styles.webSub}>
            QR scanning requires the Cryptic mobile app.{"\n"}
            On mobile, you can scan a contact's QR code{"\n"}
            from their profile screen.
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.webBackBtn}>
            <Text style={styles.webBackText}>GO BACK</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#00FF41" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>SCAN NODE QR</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.permText}>INITIALIZING CAMERA...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#00FF41" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>SCAN NODE QR</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Feather name="camera-off" size={48} color="#1A3A1A" />
          <Text style={styles.permTitle}>CAMERA ACCESS REQUIRED</Text>
          <Text style={styles.permSub}>
            Grant camera permission to scan{"\n"}contact QR codes
          </Text>
          <TouchableOpacity onPress={requestPermission} style={styles.grantBtn}>
            <Feather name="camera" size={16} color="#000" />
            <Text style={styles.grantText}>GRANT ACCESS</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>CANCEL</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanState === "scanning" ? handleBarcode : undefined}
      />

      {/* Dark overlay with cutout */}
      <View style={styles.overlay}>
        <View style={[styles.overlayTop, { height: insets.top + 60 }]} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.scanFrame}>
            {/* Corner brackets */}
            <View style={[styles.corner, styles.cornerTL, { borderColor: statusColor }]} />
            <View style={[styles.corner, styles.cornerTR, { borderColor: statusColor }]} />
            <View style={[styles.corner, styles.cornerBL, { borderColor: statusColor }]} />
            <View style={[styles.corner, styles.cornerBR, { borderColor: statusColor }]} />

            {scanState === "scanning" && (
              <View style={styles.scanLine}>
                <View style={[styles.scanLineBar, { backgroundColor: statusColor }]} />
              </View>
            )}

            {scanState !== "scanning" && (
              <View style={styles.resultOverlay}>
                <Feather
                  name={scanState === "success" ? "check-circle" : scanState === "duplicate" ? "info" : "x-circle"}
                  size={36}
                  color={statusColor}
                />
                {scanState === "success" && (
                  <Text style={[styles.scannedName, { color: "#00FF41" }]}>{scannedName}</Text>
                )}
              </View>
            )}
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {scanState === "scanning" ? "ALIGN QR CODE WITHIN FRAME" : resultMessage}
          </Text>

          <View style={[styles.topBar, { position: "relative", width: "100%", marginTop: 24 }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={20} color="#00FF41" />
            </TouchableOpacity>
            <Text style={styles.topTitle}>SCAN NODE QR</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>
      </View>

      {/* Top bar floating */}
      <View style={[styles.topBar, { position: "absolute", top: insets.top, left: 0, right: 0 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#00FF41" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>SCAN NODE QR</Text>
        <View style={{ width: 40 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  topTitle: {
    color: "#00FF41",
    fontFamily: "monospace",
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#1A3A1A",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  permTitle: {
    color: "#00FF41",
    fontFamily: "monospace",
    fontSize: 13,
    fontWeight: "bold",
    letterSpacing: 2,
    textAlign: "center",
    marginTop: 12,
  },
  permText: {
    color: "#00AA29",
    fontFamily: "monospace",
    fontSize: 12,
    letterSpacing: 1,
  },
  permSub: {
    color: "#00AA29",
    fontFamily: "monospace",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 20,
  },
  grantBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#00FF41",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 4,
    marginTop: 8,
  },
  grantText: {
    color: "#000",
    fontFamily: "monospace",
    fontWeight: "bold",
    fontSize: 13,
    letterSpacing: 2,
  },
  cancelBtn: { paddingVertical: 10 },
  cancelText: { color: "#00AA29", fontFamily: "monospace", fontSize: 12, letterSpacing: 1 },
  overlay: { flex: 1 },
  overlayTop: { backgroundColor: "rgba(0,0,0,0.75)" },
  overlayMiddle: { flexDirection: "row" },
  overlaySide: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)" },
  overlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  scanFrame: {
    width: 240,
    height: 240,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
  },
  scanLineBar: {
    height: 1,
    opacity: 0.7,
  },
  resultOverlay: { alignItems: "center", gap: 10 },
  scannedName: {
    fontFamily: "monospace",
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  statusText: {
    fontFamily: "monospace",
    fontSize: 12,
    letterSpacing: 1,
    textAlign: "center",
  },
  webFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  webTitle: {
    color: "#00FF41",
    fontFamily: "monospace",
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 2,
    marginTop: 12,
  },
  webSub: {
    color: "#00AA29",
    fontFamily: "monospace",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 20,
  },
  webBackBtn: {
    borderWidth: 1,
    borderColor: "#1A3A1A",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
    marginTop: 8,
  },
  webBackText: { color: "#00FF41", fontFamily: "monospace", fontSize: 12, letterSpacing: 2 },
});
