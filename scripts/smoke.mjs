const baseUrl = process.env.SMOKE_BASE_URL;

if (!baseUrl) {
  console.error("SMOKE_BASE_URL is required.");
  process.exit(1);
}

async function assertStatus(pathname, expected, options = {}) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    redirect: "manual",
    ...options,
  });

  if (!expected.includes(res.status)) {
    throw new Error(`Unexpected status for ${pathname}: ${res.status}`);
  }

  return res;
}

await assertStatus("/", [200]);
await assertStatus("/login", [200]);
await assertStatus("/api/health", [200]);
await assertStatus("/dashboard", [307, 308]);

console.log(`Smoke checks passed for ${baseUrl}`);
