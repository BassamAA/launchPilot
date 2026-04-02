import { Text, View } from "react-native";

export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "good" | "warn" }) {
  const colors = tone === "good"
    ? { bg: "#dcfce7", text: "#166534" }
    : tone === "warn"
      ? { bg: "#fef3c7", text: "#92400e" }
      : { bg: "#f3f4f6", text: "#374151" };

  return (
    <View style={{ backgroundColor: colors.bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 12 }}>{label}</Text>
    </View>
  );
}
