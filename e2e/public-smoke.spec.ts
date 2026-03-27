import { expect, test } from "@playwright/test";

test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toContainText("LaunchPilot");
});

test("protected routes redirect unauthenticated users to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/sites/new");
  await expect(page).toHaveURL(/\/login/);
});

test("health endpoint responds", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(body.ok).toBe(true);
});
