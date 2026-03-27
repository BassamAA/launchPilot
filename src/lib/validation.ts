import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

export const analyzeRequestSchema = z.object({
  url: z.string().trim().optional(),
  site_id: z.string().uuid().optional(),
  sources: z
    .object({
      website: z.string().trim().optional(),
      twitter: z.string().trim().optional(),
      instagram: z.string().trim().optional(),
      linkedin: z.string().trim().optional(),
      instagram_manual: z.record(z.string()).optional(),
      linkedin_manual: z.record(z.string()).optional(),
    })
    .optional(),
});

export const pageViewTrackSchema = z.object({
  content_item_id: z.string().uuid(),
  referrer: z.string().trim().optional(),
  user_agent: z.string().trim().optional(),
});

export const conversionTrackSchema = z.object({
  public_tracking_key: nonEmptyString,
  event_type: nonEmptyString.default("signup"),
  lp_tid: z.string().trim().optional(),
  utm_source: z.string().trim().optional(),
  utm_medium: z.string().trim().optional(),
  utm_campaign: z.string().trim().optional(),
  utm_content: z.string().trim().optional(),
  page_url: z.string().trim().optional(),
  referrer: z.string().trim().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const productEventTrackSchema = z.object({
  public_tracking_key: nonEmptyString,
  event_type: z.enum(["signup", "onboarding_complete", "activated", "subscribed"]),
  lp_tid: z.string().trim().optional(),
  utm_source: z.string().trim().optional(),
  utm_medium: z.string().trim().optional(),
  utm_campaign: z.string().trim().optional(),
  utm_content: z.string().trim().optional(),
  page_url: z.string().trim().optional(),
  referrer: z.string().trim().optional(),
  value: z.coerce.number().optional(),
  currency: z.string().trim().max(12).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const businessProfilePatchSchema = z.object({
  target_audience: z.string().trim().optional(),
  description: z.string().trim().optional(),
  business_type: z.string().trim().optional(),
  monetization_model: z.string().trim().optional(),
});

export const socialStrategyGenerateSchema = z.object({
  platform: z.enum(["instagram", "youtube", "linkedin"]),
});

export const surfacePatchSchema = z.object({
  surfaceId: z.string().uuid(),
  status: z.enum(["recommended", "active", "paused", "not_applicable"]),
  priority: z.number().int().min(1).max(20).optional(),
});
