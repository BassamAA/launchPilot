import { describe, expect, it } from "vitest";
import { buildSurfaceSummary, getActiveSurfaceChannels } from "@/lib/surfaces";
import { GrowthSurface } from "@/types";

const surfaces: GrowthSurface[] = [
  {
    id: "1",
    site_id: "site-1",
    surface_type: "founder_social",
    display_name: "Founder-Led Social",
    status: "active",
    priority: 1,
    rationale: "Strong founder voice and existing social signals.",
    execution_ready: true,
    channels: ["twitter", "linkedin"],
    metadata_json: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    site_id: "site-1",
    surface_type: "seo_content",
    display_name: "SEO Content",
    status: "active",
    priority: 2,
    rationale: "Website exists and search intent is clear.",
    execution_ready: true,
    channels: ["blog"],
    metadata_json: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe("growth surface helpers", () => {
  it("filters active surface channels down to executable channels only", () => {
    const channels = getActiveSurfaceChannels(surfaces);
    expect(channels).toContain("twitter");
    expect(channels).toContain("blog");
    expect(channels).not.toContain("linkedin");
  });

  it("builds a readable active-surface summary", () => {
    const summary = buildSurfaceSummary(surfaces);
    expect(summary).toContain("Founder-Led Social");
    expect(summary).toContain("SEO Content");
    expect(summary).toContain("priority 1");
  });
});
