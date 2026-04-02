import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";
import { MobileQueueItem } from "@/lib/types";

export function QueueCard({ item }: { item: MobileQueueItem }) {
  async function handleCopy() {
    await Clipboard.setStringAsync(item.body || item.title || "");
    Alert.alert("Copied", "Content copied to clipboard.");
  }

  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
        gap: 10,
        borderWidth: 1,
        borderColor: "#e5e7eb",
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "700", color: "#6b7280", textTransform: "uppercase" }}>
        {item.channel}
      </Text>
      <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>
        {item.title || "Untitled"}
      </Text>
      {item.body ? (
        <Text style={{ color: "#4b5563" }} numberOfLines={4}>
          {item.body}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <Pressable
          onPress={handleCopy}
          style={{ backgroundColor: "#f3f4f6", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 }}
        >
          <Text style={{ fontWeight: "700", color: "#111827" }}>Copy</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/queue/${item.id}` as never)}
          style={{ backgroundColor: "#111827", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 }}
        >
          <Text style={{ fontWeight: "700", color: "white" }}>Open workflow</Text>
        </Pressable>
      </View>
    </View>
  );
}
