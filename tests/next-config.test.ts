import { afterEach, describe, expect, test } from "vitest";
import { pathToFileURL } from "node:url";
import path from "node:path";

const configUrl = pathToFileURL(path.resolve(process.cwd(), "next.config.mjs")).href;

async function loadConfig(query: string) {
  const mod = await import(`${configUrl}?${query}`);
  return mod.default;
}

describe("next config", () => {
  afterEach(() => {
    delete process.env.NEXT_DIST_DIR;
  });

  test("uses .next by default", async () => {
    const config = await loadConfig("default");

    expect(config.distDir).toBe(".next");
  });

  test("respects NEXT_DIST_DIR override", async () => {
    process.env.NEXT_DIST_DIR = ".next-e2e";

    const config = await loadConfig("override");

    expect(config.distDir).toBe(".next-e2e");
  });
});
