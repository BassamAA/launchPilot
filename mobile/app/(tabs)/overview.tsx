import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { fetchOverview, fetchSites } from "@/api/sites";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { NextActionCard } from "@/components/NextActionCard";
import { SiteSwitcher } from "@/components/SiteSwitcher";
import { StatusPill } from "@/components/StatusPill";
import { useCurrentSite } from "@/hooks/useCurrentSite";

export default function OverviewScreen() {
  const router = useRouter();
  const { siteId, setSiteId, ready } = useCurrentSite();
  const sitesQuery = useQuery({ queryKey: ["sites"], queryFn: fetchSites });
  const resolvedSiteId = useMemo(() => siteId || sitesQuery.data?.[0]?.id || null, [siteId, sitesQuery.data]);
  const overviewQuery = useQuery({
    queryKey: ["overview", resolvedSiteId],
    queryFn: () => fetchOverview(resolvedSiteId!),
    enabled: !!resolvedSiteId,
  });

  useEffect(() => {
    if (!siteId && sitesQuery.data?.[0]?.id) {
      setSiteId(sitesQuery.data[0].id);
    }
  }, [siteId, setSiteId, sitesQuery.data]);

  if (!ready || sitesQuery.isLoading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator /></View>;
  }

  if (sitesQuery.isError) {
    return <ScrollView contentContainerStyle={{ padding: 20 }}><ErrorState message="Could not load your sites. Check auth and API base URL." onRetry={() => sitesQuery.refetch()} /></ScrollView>;
  }

  if (!sitesQuery.data?.length) {
    return <ScrollView contentContainerStyle={{ padding: 20 }}><EmptyState title="No sites yet" body="Create a site on web first, then mobile becomes the execution surface." /></ScrollView>;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
      <Text style={{ fontSize: 32, fontWeight: "800", color: "#111827" }}>LaunchPilot</Text>
      <SiteSwitcher sites={sitesQuery.data || []} currentSiteId={resolvedSiteId} onChange={setSiteId} />
      {overviewQuery.isError && <ErrorState message="Could not load overview for this site." onRetry={() => overviewQuery.refetch()} />}
      {overviewQuery.data && (
        <>
          <NextActionCard
            label={overviewQuery.data.nextAction.label}
            helper="This app is for execution. If content is ready, Queue is where work happens."
            onPress={() => router.push("/(tabs)/queue")}
          />
          <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>Status</Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <StatusPill label={overviewQuery.data.status.hasPlan ? "Plan ready" : "Plan missing"} tone={overviewQuery.data.status.hasPlan ? "good" : "warn"} />
              <StatusPill label={overviewQuery.data.status.queueCount > 0 ? `${overviewQuery.data.status.queueCount} in queue` : "Queue empty"} tone={overviewQuery.data.status.queueCount > 0 ? "warn" : "neutral"} />
              <StatusPill label={overviewQuery.data.status.trackingActive ? "Tracking live" : overviewQuery.data.status.trackingReady ? "Tracking ready" : "Tracking missing"} tone={overviewQuery.data.status.trackingActive ? "good" : overviewQuery.data.status.trackingReady ? "neutral" : "warn"} />
            </View>
            <Text style={{ color: "#4b5563" }}>Generated: {overviewQuery.data.status.generatedCount}</Text>
            <Text style={{ color: "#4b5563" }}>Approved: {overviewQuery.data.status.approvedCount}</Text>
            <Text style={{ color: "#4b5563" }}>Scheduled today: {overviewQuery.data.today.scheduledCount}</Text>
            <Text style={{ color: "#4b5563" }}>Published today: {overviewQuery.data.today.publishedCount}</Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}
