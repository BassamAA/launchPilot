import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert("Login failed", error.message);
      return;
    }
    router.replace("/(tabs)/overview");
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12, backgroundColor: "white" }}>
      <Text style={{ fontSize: 32, fontWeight: "800", color: "#111827" }}>LaunchPilot</Text>
      <Text style={{ color: "#6b7280" }}>Sign in to manage Queue from your phone.</Text>
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" placeholder="Email" style={{ borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, padding: 14 }} />
      <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" style={{ borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, padding: 14 }} />
      <Pressable onPress={signIn} style={{ backgroundColor: "#111827", padding: 14, borderRadius: 12, alignItems: "center" }}>
        <Text style={{ color: "white", fontWeight: "800" }}>{loading ? "Signing in..." : "Sign in"}</Text>
      </Pressable>
    </View>
  );
}
