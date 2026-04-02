import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { fetchResults } from "@/api/results";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { useCurrentSite } from "@/hooks/useCurrentSite";

export default function ResultsScreen() {
  const { siteId, ready } = useCurrentSite();
  const query = useQuery({ queryKey: ["results", siteId], queryFn: () => fetchResults(siteId!), enabled: !!siteId });

  if (!ready || query.isLoading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator /></View>;
  }

  const data = query.data;
  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 28, fontWeight: "800", color: "#111827" }}>Results</Text>
      {query.isError && <ErrorState message="Could not load results." onRetry={() => query.refetch()} />}
      {!data && !query.isError && <EmptyState title="No results yet" body="Results appear after content gets posted and tracked." />}
      {data && (
        <>
          <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, gap: 6 }}>
            <Text style={{ color: "#4b5563" }}>Published: {data.summary.publishedCount}</Text>
            <Text style={{ color: "#4b5563" }}>Conversions: {data.summary.totalConversions}</Text>
          </View>
          <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, gap: 6 }}>
            <Text style={{ fontWeight: "800", color: "#111827" }}>Channels</Text>
            {data.summary.channelBreakdown.length === 0 ? <Text style={{ color: "#6b7280" }}>No channel data yet.</Text> : data.summary.channelBreakdown.map((entry) => (
              <Text key={entry.channel} style={{ color: "#4b5563" }}>{entry.channel}: {entry.count}</Text>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}
