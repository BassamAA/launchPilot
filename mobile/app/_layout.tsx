import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSession } from "@/hooks/useSession";
import { ActivityIndicator, View } from "react-native";

const queryClient = new QueryClient();

function AppShell() {
  const { session, loading } = useSession();

  if (loading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator /></View>;
  }

  return <Stack screenOptions={{ headerShown: false }} initialRouteName={session ? "(tabs)" : "auth/login"} />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
