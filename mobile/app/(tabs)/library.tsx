import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { fetchLibrary } from "@/api/library";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { useCurrentSite } from "@/hooks/useCurrentSite";

export default function LibraryScreen() {
  const { siteId, ready } = useCurrentSite();
  const query = useQuery({ queryKey: ["library", siteId], queryFn: () => fetchLibrary(siteId!), enabled: !!siteId });

  if (!ready || query.isLoading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator /></View>;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 28, fontWeight: "800", color: "#111827" }}>Library</Text>
      <Text style={{ color: "#6b7280" }}>Reference only. Use Queue for actual execution.</Text>
      {query.isError && <ErrorState message="Could not load library." onRetry={() => query.refetch()} />}
      {query.data?.length === 0 && <EmptyState title="No content yet" body="Generate content on web first, then review it here." />}
      {(query.data || []).map((item) => (
        <View key={item.id} style={{ backgroundColor: "white", borderRadius: 16, padding: 16, gap: 6, borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#6b7280", textTransform: "uppercase" }}>{item.channel}</Text>
          <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>{item.title || "Untitled"}</Text>
          {item.body ? <Text style={{ color: "#4b5563" }}>{item.body}</Text> : null}
          <Text style={{ color: "#6b7280" }}>Status: {item.status}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
