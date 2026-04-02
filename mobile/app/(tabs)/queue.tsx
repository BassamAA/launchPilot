import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { fetchQueue } from "@/api/queue";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { QueueCard } from "@/components/QueueCard";
import { useCurrentSite } from "@/hooks/useCurrentSite";

export default function QueueScreen() {
  const { siteId, ready } = useCurrentSite();
  const queueQuery = useQuery({
    queryKey: ["queue", siteId],
    queryFn: () => fetchQueue(siteId!),
    enabled: !!siteId,
  });

  if (!ready || queueQuery.isLoading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator /></View>;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text style={{ fontSize: 28, fontWeight: "800", color: "#111827" }}>Queue</Text>
      <Text style={{ color: "#6b7280" }}>Open a workflow, copy what you need, post on-platform, then come back and mark complete.</Text>
      {queueQuery.isError && <ErrorState message="Could not load queue items." onRetry={() => queueQuery.refetch()} />}
      {queueQuery.data?.length === 0 && <EmptyState title="Queue is clear" body="Nothing needs posting right now." />}
      {(queueQuery.data || []).map((item) => (
        <QueueCard key={item.id} item={item} />
      ))}
    </ScrollView>
  );
}
