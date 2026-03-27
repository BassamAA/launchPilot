export interface ClientErrorPayload {
  source: string;
  message: string;
  stack?: string;
  digest?: string;
  pathname?: string;
}

export async function reportClientError(payload: ClientErrorPayload) {
  try {
    const body = JSON.stringify({
      ...payload,
      pathname:
        payload.pathname ||
        (typeof window !== "undefined" ? window.location.pathname : undefined),
    });

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/monitor/error", blob);
      return;
    }

    await fetch("/api/monitor/error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // Monitoring should never break user flows.
  }
}
