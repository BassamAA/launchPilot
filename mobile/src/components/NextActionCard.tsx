import { View, Text, Pressable } from "react-native";

export function NextActionCard({ label, helper, onPress }: { label: string; helper?: string; onPress?: () => void }) {
  return (
    <View style={{ backgroundColor: "#eef2ff", borderRadius: 16, padding: 16, gap: 8 }}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: "#4f46e5", textTransform: "uppercase" }}>Next action</Text>
      <Text style={{ fontSize: 22, fontWeight: "800", color: "#111827" }}>{label}</Text>
      {helper ? <Text style={{ color: "#4338ca" }}>{helper}</Text> : null}
      {onPress && (
        <Pressable onPress={onPress} style={{ marginTop: 8, backgroundColor: "#4f46e5", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, alignSelf: "flex-start" }}>
          <Text style={{ color: "white", fontWeight: "700" }}>Open Queue</Text>
        </Pressable>
      )}
    </View>
  );
}
