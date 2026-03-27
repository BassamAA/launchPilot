type LogLevel = "info" | "warn" | "error";

interface LogMetadata {
  [key: string]: unknown;
}

export function logStructured(level: LogLevel, event: string, metadata: LogMetadata = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...metadata,
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export function logRouteError(event: string, error: unknown, metadata: LogMetadata = {}) {
  logStructured("error", event, {
    ...metadata,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
}
