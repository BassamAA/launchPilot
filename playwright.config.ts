import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3001";
const webServerCommand = [
  "NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=e2e-anon-key",
  "SUPABASE_SERVICE_ROLE_KEY=e2e-service-role-key",
  "NEXT_PUBLIC_APP_URL=http://127.0.0.1:3001",
  "NEXT_DIST_DIR=.next-e2e",
  "PORT=3001",
  "npm run dev",
].join(" ");

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: process.env.CI
    ? {
        command: webServerCommand,
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
