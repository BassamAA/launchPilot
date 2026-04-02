import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useMemo, useState } from "react";
import { completeQueueItem, fetchQueue } from "@/api/queue";
import { ErrorState } from "@/components/ErrorState";
import { useCurrentSite } from "@/hooks/useCurrentSite";
import { getPlatformHint, getPlatformSections } from "@/lib/platform";

export default function QueueItemDetailScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const { siteId } = useCurrentSite();
  const router = useRouter();
  const [publishedUrl, setPublishedUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const queueQuery = useQuery({
    queryKey: ["queue", siteId],
    queryFn: () => fetchQueue(siteId!),
    enabled: !!siteId,
  });

  const item = useMemo(() => (queueQuery.data || []).find((candidate) => candidate.id === itemId), [queueQuery.data, itemId]);

  async function copyAll() {
    if (!item) return;
    await Clipboard.setStringAsync(item.body || item.title || "");
    Alert.alert("Copied", "Content copied to clipboard.");
  }

  async function openPlatform() {
    if (!item) return;
    if (item.helper.copyBeforeOpen) {
      await Clipboard.setStringAsync(item.body || item.title || "");
    }
    if (item.platformUrl) await Linking.openURL(item.platformUrl);
  }

  async function complete() {
    if (!item) return;
    setSaving(true);
    try {
      await completeQueueItem(item.id, publishedUrl || undefined);
      router.replace("/(tabs)/queue");
    } catch (error) {
      Alert.alert("Failed", error instanceof Error ? error.message : "Could not save item");
    } finally {
      setSaving(false);
    }
  }

  if (queueQuery.isError) {
    return <ScrollView contentContainerStyle={{ padding: 20 }}><ErrorState message="Could not load this queue item." onRetry={() => queueQuery.refetch()} /></ScrollView>;
  }

  if (!item) {
    return (
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: "800", color: "#111827" }}>Queue Item</Text>
        <Text style={{ color: "#6b7280" }}>Could not find this item.</Text>
      </ScrollView>
    );
  }

  const sections = getPlatformSections(item);
  const hint = getPlatformHint(item);

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: "#6b7280", textTransform: "uppercase" }}>{item.channel}</Text>
      <Text style={{ fontSize: 28, fontWeight: "800", color: "#111827" }}>{item.title || "Untitled"}</Text>
      <View style={{ backgroundColor: "#eef2ff", borderRadius: 16, padding: 16 }}>
        <Text style={{ color: "#4338ca", fontWeight: "700" }}>{hint}</Text>
      </View>

      {sections.map((section) => (
        <View key={section.title} style={{ backgroundColor: "white", borderRadius: 16, padding: 16, gap: 8, borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#6b7280", textTransform: "uppercase" }}>{section.title}</Text>
          <Text style={{ color: "#111827" }}>{section.body}</Text>
        </View>
      ))}

      <TextInput
        value={publishedUrl}
        onChangeText={setPublishedUrl}
        placeholder={item.helper.urlPlaceholder}
        style={{ borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, padding: 14, backgroundColor: "white" }}
      />

      <View style={{ gap: 10 }}>
        <Pressable onPress={copyAll} style={{ backgroundColor: "#f3f4f6", padding: 14, borderRadius: 12, alignItems: "center" }}>
          <Text style={{ color: "#111827", fontWeight: "800" }}>Copy content</Text>
        </Pressable>
        {item.platformUrl ? (
          <Pressable onPress={openPlatform} style={{ backgroundColor: "#111827", padding: 14, borderRadius: 12, alignItems: "center" }}>
            <Text style={{ color: "white", fontWeight: "800" }}>{item.helper.primaryLabel}</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={complete} style={{ backgroundColor: "#4f46e5", padding: 14, borderRadius: 12, alignItems: "center" }}>
          <Text style={{ color: "white", fontWeight: "800" }}>{saving ? "Saving..." : item.helper.completeLabel}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
