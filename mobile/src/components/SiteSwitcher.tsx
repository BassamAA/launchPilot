import { View, Text, Pressable } from "react-native";
import { MobileSiteSummary } from "@/lib/types";

export function SiteSwitcher({
  sites,
  currentSiteId,
  onChange,
}: {
  sites: MobileSiteSummary[];
  currentSiteId: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: "#6b7280", textTransform: "uppercase" }}>Current site</Text>
      <View style={{ gap: 8 }}>
        {sites.map((site) => {
          const active = site.id === currentSiteId;
          return (
            <Pressable
              key={site.id}
              onPress={() => onChange(site.id)}
              style={{
                padding: 12,
                borderRadius: 12,
                backgroundColor: active ? "#111827" : "#f3f4f6",
              }}
            >
              <Text style={{ color: active ? "white" : "#111827", fontWeight: "700" }}>{site.name}</Text>
              <Text style={{ color: active ? "#d1d5db" : "#6b7280", marginTop: 4 }}>
                {site.queueCount} in queue • {site.nextAction.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
