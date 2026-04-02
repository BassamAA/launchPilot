import { Text, View } from "react-native";

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ backgroundColor: "white", borderRadius: 16, padding: 20, gap: 8, borderWidth: 1, borderColor: "#e5e7eb" }}>
      <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827" }}>{title}</Text>
      <Text style={{ color: "#6b7280" }}>{body}</Text>
    </View>
  );
}
