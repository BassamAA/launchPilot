import { Pressable, Text, View } from "react-native";

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={{ backgroundColor: "#fef2f2", borderRadius: 16, padding: 16, gap: 8 }}>
      <Text style={{ fontSize: 18, fontWeight: "800", color: "#991b1b" }}>Something broke</Text>
      <Text style={{ color: "#7f1d1d" }}>{message}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} style={{ alignSelf: "flex-start", backgroundColor: "#991b1b", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 }}>
          <Text style={{ color: "white", fontWeight: "700" }}>Try again</Text>
        </Pressable>
      )}
    </View>
  );
}
