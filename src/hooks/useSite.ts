"use client";

import { useState, useEffect } from "react";
import { Site } from "@/types";

export function useSite(siteId: string) {
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSite() {
      try {
        const res = await fetch(`/api/sites/${siteId}`);
        if (!res.ok) throw new Error("Site not found");
        const data = await res.json();
        setSite(data);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchSite();
  }, [siteId]);

  return { site, loading, error };
}
