export type SiteStatus = "analyzing" | "active" | "error" | "paused";
export type SiteSourceType = "website" | "multi_source" | "twitter" | "instagram" | "linkedin";
export type OnboardingPersona =
  | "saas_founder"
  | "creator"
  | "service_provider"
  | "ecommerce"
  | "local_business"
  | "generic";
export type OnboardingStepKey =
  | "brief_confirmed"
  | "surfaces_activated"
  | "twitter_connected"
  | "content_approved"
  | "tracking_installed"
  | "performance_reviewed";

export type ContentStatus =
  | "draft"
  | "approved"
  | "published"
  | "rejected"
  | "failed";

export type ContentChannel =
  | "blog"
  | "twitter"
  | "reddit"
  | "email"
  | "tiktok"
  | "directory";

export type ContentVariantLabel = "A_exploit" | "B_explore";
export type ContentTagCategory =
  | "hook_type"
  | "cta_type"
  | "tone"
  | "format"
  | "topic_angle"
  | "includes_price"
  | "includes_social_proof"
  | "content_length";
export type ContentHookType =
  | "pain_point"
  | "curiosity"
  | "social_proof"
  | "contrarian"
  | "how_to"
  | "story"
  | "statistic"
  | "question";
export type ContentCtaType =
  | "direct_signup"
  | "learn_more"
  | "free_trial"
  | "visit_site"
  | "reply_engage"
  | "none";
export type ContentTone =
  | "professional"
  | "casual"
  | "urgent"
  | "empathetic"
  | "authoritative"
  | "provocative";
export type ContentFormat =
  | "short_text"
  | "thread"
  | "listicle"
  | "narrative"
  | "comparison"
  | "case_study"
  | "question_answer";
export type ContentTopicAngle =
  | "product_feature"
  | "customer_pain"
  | "competitor_comparison"
  | "industry_trend"
  | "personal_story"
  | "educational"
  | "pricing_value";
export type BinaryContentSignal = "yes" | "no";
export type ContentLengthBucket = "short" | "medium" | "long";

export type ContentType =
  | "blog_post"
  | "tweet"
  | "thread"
  | "reddit_comment"
  | "reddit_post"
  | "email_template"
  | "tiktok_script"
  | "directory_submission";

export type PlanStatus = "generating" | "active" | "completed" | "paused";

export type UserRole = "owner" | "admin" | "member";

export type SubscriptionTier = "free_trial" | "starter" | "growth" | "agency";

// ─── Marketing Brief ────────────────────────────────────────────────
export interface MarketingBrief {
  product_name: string;
  one_liner: string;
  target_customer: string;
  pain_point: string;
  value_proposition: string;
  positioning: string;
  keywords: string[];
  competitors: string[];
  recommended_channels: RecommendedChannel[];
  content_angles: string[];
  subreddit_research?: SubredditResearch[];
  existing_channels?: string[];
  channel_strengths?: Record<string, string>;
  channel_gaps?: Record<string, string>;
  recommended_growth_surfaces?: string[];
  business_type?: string;
  monetization_model?: string;
}

export interface RecommendedChannel {
  channel: ContentChannel;
  reasoning: string;
  priority: number;
}

export interface SubredditResearch {
  subreddit: string;
  subreddit_url: string;
  subscriber_count: string;
  rules_summary: string;
  best_time_to_post: string;
  example_post_title: string;
  example_post_url: string;
}

// ─── Database Row Types ─────────────────────────────────────────────
export interface Company {
  id: string;
  name: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  company_id: string;
  name: string | null;
  role: UserRole;
  avatar_url: string | null;
  subscription_tier: SubscriptionTier;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Site {
  id: string;
  company_id: string;
  url: string;
  name: string;
  slug: string | null;
  public_tracking_key?: string | null;
  source_type?: SiteSourceType;
  sources_json?: Record<string, unknown>;
  business_profile_json?: BusinessProfile | null;
  onboarding_json?: SiteOnboardingState | null;
  is_system_site?: boolean;
  autopilot_enabled?: boolean;
  status: SiteStatus;
  brief_json: MarketingBrief | null;
  brief_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export interface MarketingPlan {
  id: string;
  site_id: string;
  month: number;
  year: number;
  strategy_json: PlanStrategy | null;
  status: PlanStatus;
  created_at: string;
}

export interface PlanStrategy {
  overview: string;
  growth_thesis?: string;
  north_star_goal?: string;
  acquisition_wedge?: string;
  strategic_bets?: string[];
  risks?: string[];
  growth_loops?: PlanGrowthLoop[];
  channel_theses?: PlanChannelThesis[];
  weeks: PlanWeek[];
}

export interface PlanGrowthLoop {
  name: string;
  mechanism: string;
  why_it_compounds: string;
}

export interface PlanChannelThesis {
  channel: ContentChannel;
  rationale: string;
  success_signal: string;
}

export interface PlanWeek {
  week: number;
  theme: string;
  focus: string;
}

export interface ContentItem {
  id: string;
  site_id: string;
  plan_id: string | null;
  channel: ContentChannel;
  content_type: ContentType;
  title: string;
  body: string;
  metadata_json: ContentMetadata;
  status: ContentStatus;
  scheduled_date: string | null;
  published_date: string | null;
  published_url: string | null;
  auto_executable: boolean;
  variant_group?: string | null;
  variant_label?: ContentVariantLabel | null;
  created_at: string;
  updated_at: string;
}

export interface ContentMetadata {
  word_count?: number;
  char_count?: number;
  estimated_reach?: number;
  target_subreddit?: string;
  subreddit_url?: string;
  target_thread_title?: string;
  target_thread_url?: string;
  reddit_post_url?: string;
  post_kind?: "comment" | "post";
  publish_state?: "draft" | "scheduled" | "ready_to_publish" | "campaign_draft" | "ready_to_submit" | "ready_to_post" | "external_blog_pending";
  publish_error?: string;
  publish_error_at?: string;
  published_via?: "twitter" | "hosted_blog" | "manual" | "resend";
  scheduled_for_publish?: string;
  meta_description?: string;
  seo_keyword?: string;
  post_slug?: string;
  subject_line?: string;
  preview_text?: string;
  email_style?: string;
  directory_name?: string;
  directory_url?: string;
  submission_url?: string;
  submission_copy?: Record<string, string>;
  listing_url?: string;
  listing_submitted_at?: string;
  hooks?: string[];
  overlays?: string[];
  tracked_link_id?: string;
  tracked_link_url?: string;
  tracked_link_code?: string;
  [key: string]: unknown;
}

export interface Directory {
  id: string;
  name: string;
  url: string;
  category: string;
  submission_format_json: DirectoryFormat;
}

export interface DirectoryFormat {
  max_title_length: number;
  max_description_length: number;
  requires_tagline: boolean;
  requires_pricing: boolean;
  fields?: string[];
}

export interface DirectorySubmission {
  id: string;
  site_id: string;
  directory_id: string;
  status: "pending" | "submitted" | "live" | "rejected";
  submitted_date: string | null;
  listing_url: string | null;
  directories?: Directory;
}

export interface ActivityLog {
  id: string;
  site_id: string;
  action: string;
  description: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

// ─── API Request / Response Types ──────────────────────────────────
export interface AnalyzeRequest {
  url?: string;
  sources?: {
    website?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    instagram_manual?: Record<string, string>;
    linkedin_manual?: Record<string, string>;
  };
  site_id?: string;
}

export interface AnalyzeResponse {
  brief: MarketingBrief;
  site_id: string;
}

export interface GeneratePlanRequest {
  site_id: string;
}

export interface GenerateContentRequest {
  content_item_id: string;
}

export interface BulkGenerateRequest {
  plan_id: string;
}

export interface ApproveRequest {
  content_item_id: string;
  edited_body?: string;
}

export interface PublishRequest {
  content_item_id: string;
}

// ─── Dashboard Types ────────────────────────────────────────────────
export interface DashboardStats {
  total_generated: number;
  total_approved: number;
  total_published: number;
  estimated_reach: number;
  pending_approval: number;
  content_by_channel: Record<ContentChannel, number>;
}

// ─── Analysis Progress ──────────────────────────────────────────────
export interface AnalysisStep {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
}

// ─── Platform Connections ────────────────────────────────────────────
export interface PlatformConnection {
  id: string;
  site_id: string;
  platform: "twitter" | "email" | "blog_external";
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  platform_user_id: string | null;
  platform_username: string | null;
  metadata_json: Record<string, unknown>;
  connected_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Email Sends ─────────────────────────────────────────────────────
export interface EmailSend {
  id: string;
  site_id: string;
  content_item_id: string;
  recipient_email: string;
  recipient_name: string | null;
  recipient_company: string | null;
  resend_message_id: string | null;
  status: "queued" | "sent" | "delivered" | "opened" | "clicked" | "bounced" | "failed";
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ContentPerformance {
  id: string;
  content_item_id: string;
  site_id: string;
  channel: ContentChannel;
  metrics_json: Record<string, unknown>;
  fetched_at: string;
}

export interface PageView {
  id: string;
  content_item_id: string;
  site_id: string;
  visitor_hash: string;
  referrer: string | null;
  user_agent: string | null;
  country: string | null;
  viewed_at: string;
}

export interface TrackedLink {
  id: string;
  site_id: string;
  content_item_id: string | null;
  experiment_id: string | null;
  destination_url: string;
  short_code: string;
  channel: ContentChannel;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string | null;
  utm_content: string | null;
  click_count: number;
  created_at: string;
}

export interface LinkClick {
  id: string;
  tracked_link_id: string;
  site_id: string;
  visitor_hash: string | null;
  referrer: string | null;
  user_agent: string | null;
  country: string | null;
  clicked_at: string;
}

export interface Conversion {
  id: string;
  site_id: string;
  tracked_link_id: string | null;
  content_item_id: string | null;
  experiment_id: string | null;
  channel: ContentChannel | null;
  event_type: string;
  visitor_hash: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  referrer: string | null;
  metadata_json: Record<string, unknown>;
  converted_at: string;
}

export interface ContentTags {
  hook_type: ContentHookType;
  cta_type: ContentCtaType;
  tone: ContentTone;
  format: ContentFormat;
  topic_angle: ContentTopicAngle;
  includes_price: BinaryContentSignal;
  includes_social_proof: BinaryContentSignal;
  content_length: ContentLengthBucket;
}

export interface ContentTag {
  id: string;
  content_item_id: string;
  site_id: string;
  tag_category: ContentTagCategory;
  tag_value: string;
  confidence: number;
  created_at: string;
}

export interface ContentPatternMetric {
  tag_value: string;
  sample_size: number;
  avg_impressions: number;
  avg_engagement: number;
  avg_clicks: number;
  avg_conversions: number;
  conversion_rate: number;
}

export interface ContentPatternSummary {
  category: ContentTagCategory;
  best: ContentPatternMetric | null;
  worst: ContentPatternMetric | null;
  metrics: ContentPatternMetric[];
}

export interface ContentPatternCombination {
  key: string;
  label: string;
  sample_size: number;
  avg_clicks: number;
  avg_conversions: number;
  conversion_rate: number;
}

export interface ContentPatternSnapshotData {
  generated_at: string;
  period_start: string | null;
  period_end: string | null;
  sample_size: number;
  average_conversion_rate: number;
  tag_summaries: Partial<Record<ContentTagCategory, ContentPatternSummary>>;
  top_pattern: ContentPatternCombination | null;
  patterns_to_avoid: ContentPatternCombination[];
  explore_variants_in_flight: Array<{
    content_item_id: string;
    title: string;
    channel: ContentChannel;
    variant_group: string;
  }>;
  recent_explore_wins: Array<{
    variant_group: string;
    winner_content_item_id: string;
    winner_title: string;
    channel: ContentChannel;
    conversion_rate: number;
  }>;
  lessons_learned: string;
}

export interface ContentPatternSnapshot {
  id: string;
  site_id: string;
  snapshot_json: ContentPatternSnapshotData;
  sample_size: number;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

// ─── Growth Feedback ─────────────────────────────────────────────────
export type GrowthExperimentStatus = "active" | "won" | "lost" | "paused";

export interface GrowthExperiment {
  id: string;
  site_id: string;
  hypothesis: string;
  target_channel: ContentChannel | null;
  success_metric: string;
  status: GrowthExperimentStatus;
  confidence: number;
  rationale: string | null;
  next_action: string | null;
  source: string;
  metadata_json: Record<string, unknown>;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrowthSignal {
  id: string;
  site_id: string;
  content_item_id: string | null;
  experiment_id: string | null;
  channel: ContentChannel | null;
  signal_type: string;
  metric_name: string;
  metric_value: number;
  source: string;
  metadata_json: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
}

export type GrowthSurfaceType =
  | "founder_social"
  | "seo_content"
  | "short_form_video"
  | "cold_outbound"
  | "community_engagement"
  | "directory_presence"
  | "influencer_partnership"
  | "referral_program"
  | "lifecycle_email"
  | "paid_acquisition"
  | "landing_page_optimization";

export type GrowthSurfaceStatus = "recommended" | "active" | "paused" | "not_applicable";
export type GrowthExecutionOwner = "launchpilot" | "human" | "hybrid";
export type ProductEventType = "signup" | "onboarding_complete" | "activated" | "subscribed";

export interface GrowthSurface {
  id: string;
  site_id: string;
  surface_type: GrowthSurfaceType;
  display_name: string;
  status: GrowthSurfaceStatus;
  priority: number;
  rationale: string | null;
  execution_ready: boolean;
  channels: string[];
  objective?: string | null;
  readiness_reason?: string | null;
  execution_owner?: GrowthExecutionOwner;
  metadata_json: Record<string, unknown>;
  last_reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessProfile {
  business_name: string;
  primary_source: string;
  source_count: number;
  website_url: string | null;
  description: string;
  offerings: string[];
  target_audience: string;
  content_voice: string;
  existing_channels: string[];
  follower_counts: Record<string, number>;
  pricing: string | null;
  social_proof: string[];
  business_type: string | null;
  monetization_model: string | null;
  channel_strengths: Record<string, string>;
  channel_gaps: Record<string, string>;
  recommended_growth_surfaces: string[];
}

export interface OnboardingConfig {
  persona: OnboardingPersona;
  primarySources: string[];
  suggestedSurfaces: GrowthSurfaceType[];
  skipSurfaces: GrowthSurfaceType[];
  welcomeMessage: string;
  quickWins: string[];
  featuresToHighlight: string[];
  featuresToDefer: string[];
}

export interface SiteOnboardingState {
  persona?: OnboardingPersona;
  wizard_completed?: boolean;
  checklist_dismissed?: boolean;
  steps_completed?: OnboardingStepKey[];
  completed_at?: string | null;
  welcome_message?: string | null;
  /** Channels that get auto-approved after generation (no manual review required) */
  auto_approve_channels?: ContentChannel[];
  /** Whether to send LaunchPilot notification emails for this site */
  notifications_enabled?: boolean;
}

export interface ActivationDefinition {
  id: string;
  site_id: string;
  event_key: ProductEventType;
  display_name: string;
  description: string | null;
  weight: number;
  is_primary: boolean;
  is_active: boolean;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProductEvent {
  id: string;
  site_id: string;
  tracked_link_id: string | null;
  content_item_id: string | null;
  experiment_id: string | null;
  surface_type: GrowthSurfaceType | null;
  channel: ContentChannel | null;
  event_type: ProductEventType;
  event_value: number;
  currency: string | null;
  visitor_hash: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  referrer: string | null;
  metadata_json: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
}

export interface PartnerTarget {
  id: string;
  site_id: string;
  surface_id: string | null;
  platform: string;
  handle: string | null;
  profile_url: string | null;
  audience_fit: string | null;
  content_fit: string | null;
  estimated_reach_band: string | null;
  fit_score: number;
  rationale: string | null;
  recommended_compensation: string | null;
  outreach_status: "suggested" | "contacted" | "responded" | "won" | "lost" | "archived";
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PartnerCampaign {
  id: string;
  site_id: string;
  partner_target_id: string;
  campaign_angle: string;
  content_concept: string;
  cta: string | null;
  landing_page_recommendation: string | null;
  status: "draft" | "ready" | "active" | "done" | "archived";
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PartnerBrief {
  id: string;
  site_id: string;
  partner_target_id: string;
  partner_campaign_id: string;
  outreach_message: string | null;
  creator_brief: string | null;
  copy_export: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface FunnelRecommendation {
  id: string;
  site_id: string;
  category: string;
  title: string;
  recommendation: string;
  priority: number;
  rationale: string | null;
  status: "open" | "accepted" | "done" | "dismissed";
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OfferTest {
  id: string;
  site_id: string;
  hypothesis: string;
  test_type: string;
  proposed_change: string;
  success_metric: string;
  status: "proposed" | "active" | "won" | "lost" | "paused";
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ─── Stripe Types ───────────────────────────────────────────────────
export interface PricingPlan {
  id: SubscriptionTier;
  name: string;
  price: number;
  description: string;
  features: string[];
  limits: {
    sites: number;
    content_per_month: number;
    channels: ContentChannel[];
  };
  stripe_price_id: string;
  highlighted?: boolean;
}
