import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "launchpilot.currentSiteId";

export function useCurrentSite() {
  const [siteId, setSiteId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((value) => {
      setSiteId(value);
      setReady(true);
    });
  }, []);

  async function updateSite(id: string) {
    setSiteId(id);
    await AsyncStorage.setItem(KEY, id);
  }

  return { siteId, setSiteId: updateSite, ready };
}
