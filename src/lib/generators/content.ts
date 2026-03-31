import crypto from "crypto";
import { MarketingBrief, ContentChannel, ContentItem, ContentMetadata, ContentPatternSnapshot } from "@/types";
import { generateBlogPost } from "./blog";
import { generateLinkedInPostBatch } from "./linkedin";
import { generateTweetBatch } from "./twitter";
import { generateRedditDrafts } from "./reddit";
import { generateColdEmailTemplates } from "./email";
import { generateTikTokScripts } from "./tiktok";
import { generateDirectoryListings } from "./directory";
import { buildMarketingSystemPrompt, callClaude } from "@/lib/claude";
import { buildContentIntelligencePrompt, getLatestPatternSnapshot, MIN_PATTERN_SAMPLE_SIZE } from "@/lib/content-patterns";
import { attachTrackedLinkToContentItem } from "@/lib/links";
import { logStructured } from "@/lib/observability";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { tagContentItem } from "@/lib/tagging";

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdminClient>;

function supportsVariants(channel: ContentChannel) {
  return ["blog", "twitter", "linkedin", "reddit", "email", "tiktok"].includes(channel);
}

function buildVariantInstruction(
  snapshot: ContentPatternSnapshot | null,
  mode: "single" | "A_exploit" | "B_explore"
) {
  const intelligence = buildContentIntelligencePrompt(snapshot);
  if (!intelligence) return null;

  if (mode === "A_exploit") {
    return `${intelligence}

Variant mode: exploit.
Use the strongest known pattern directly. Match the best-performing hook, CTA, and tone unless the channel format makes that impossible.`;
  }

  if (mode === "B_explore") {
    const data = snapshot?.snapshot_json;
    const bestHook = data?.tag_summaries.hook_type?.best?.tag_value || "pain_point";
    const bestTone = data?.tag_summaries.tone?.best?.tag_value || "authoritative";
    const altHook = data?.tag_summaries.hook_type?.metrics.find((metric) => metric.tag_value !== bestHook)?.tag_value || "curiosity";
    const altTone = data?.tag_summaries.tone?.metrics.find((metric) => metric.tag_value !== bestTone)?.tag_value || "casual";

    return `${intelligence}

Variant mode: explore.
Deliberately try a different approach from the current winning pattern. Use a ${altHook} hook with a ${altTone} tone so LaunchPilot can test whether a new pattern beats the incumbent. Keep the CTA sharp and conversion-focused.`;
  }

  return intelligence;
}

async function generateBodyAndMetadata(
  item: Pick<ContentItem, "id" | "title" | "channel" | "content_type" | "plan_id" | "metadata_json"> & {
    sites: { id: string; url: string; name: string; brief_json: MarketingBrief };
  },
  brief: MarketingBrief,
  guidance: string | null
) {
  let generatedBody = "";
  let metadata = (item.metadata_json || {}) as ContentMetadata;
  const channel = item.channel as ContentChannel;

  switch (channel) {
    case "blog": {
      const keyword = brief.keywords[0] || item.title;
      const post = await generateBlogPost(brief, keyword, item.title, guidance || undefined);
      generatedBody = post.body;
      metadata = {
        ...metadata,
        meta_description: post.meta_description,
        seo_keyword: post.target_keyword,
        word_count: post.word_count,
      };
      break;
    }

    case "twitter": {
      const tweets = await generateTweetBatch(brief, 1, guidance || undefined);
      const tweet = tweets[0];
      if (tweet) {
        generatedBody = tweet.thread_tweets ? tweet.thread_tweets.join("\n\n---\n\n") : tweet.body;
        metadata = { ...metadata, tweet_type: tweet.type, char_count: tweet.char_count };
      }
      break;
    }

    case "linkedin": {
      const posts = await generateLinkedInPostBatch(brief, 1, guidance || undefined);
      const post = posts[0];
      if (post) {
        generatedBody = post.body;
        metadata = {
          ...metadata,
          linkedin_post_type: post.type,
          char_count: post.char_count,
          hook: post.hook,
          cta: post.cta,
        };
      }
      break;
    }

    case "reddit": {
      const redditData = await generateRedditDrafts(brief, guidance || undefined);
      const draft = redditData.drafts[0];
      if (draft) {
        generatedBody = draft.body;
        metadata = {
          ...metadata,
          target_subreddit: draft.subreddit,
          subreddit_url: draft.subreddit_url,
          post_kind: draft.post_kind,
          target_thread_title: draft.target_thread_title,
          target_thread_url: draft.target_thread_url,
          comment_type: draft.comment_type,
          prompt_context: draft.prompt_context,
        };
      }
      break;
    }

    case "email": {
      const templates = await generateColdEmailTemplates(brief, guidance || undefined);
      const tmpl = templates[0];
      if (tmpl) {
        generatedBody = `Subject: ${tmpl.subject_line}\n\n${tmpl.body}`;
        metadata = { ...metadata, subject_line: tmpl.subject_line, email_style: tmpl.style };
      }
      break;
    }

    case "tiktok": {
      const scripts = await generateTikTokScripts(brief, 1, guidance || undefined);
      const script = scripts[0];
      if (script) {
        generatedBody = script.full_script;
        metadata = {
          ...metadata,
          hook: script.hook,
          overlays: script.overlays,
          duration_seconds: script.duration_seconds,
          notes: script.notes,
        };
      }
      break;
    }

    case "directory": {
      const listings = await generateDirectoryListings(brief, item.sites.url, guidance || undefined);
      const listing = listings[0];
      if (listing) {
        generatedBody = [
          `**${listing.directory_name}**`,
          `\nTagline: ${listing.tagline}`,
          `\nShort: ${listing.short_description}`,
          `\nFull:\n${listing.long_description}`,
          `\nTags: ${listing.tags.join(", ")}`,
          `\nSubmit at: ${listing.submission_url}`,
        ].join("\n");
        metadata = {
          ...metadata,
          directory_name: listing.directory_name,
          directory_url: listing.directory_url,
          submission_url: listing.submission_url,
          tags: listing.tags,
        };
      }
      break;
    }

    default: {
      const systemPrompt = buildMarketingSystemPrompt(brief);
      const result = await callClaude<{ content: string }>({
        model: "sonnet",
        systemPrompt,
        userPrompt: `Generate content for: ${item.title}
Channel: ${channel}
Type: ${item.content_type}
${guidance ? `\nContent intelligence and variant instructions:\n${guidance}\n` : ""}
Return JSON: { "content": "the generated content" }`,
        maxTokens: 2048,
      });
      generatedBody = result.data.content || "";
    }
  }

  return { generatedBody, metadata };
}

async function saveGeneratedVariant(
  input: {
    item: Pick<ContentItem, "id" | "channel" | "plan_id">;
    site: { id: string; url: string; name: string };
    body: string;
    metadata: ContentMetadata;
  },
  supabase: SupabaseAdminClient
) {
  const tracked = await attachTrackedLinkToContentItem(
    {
      body: input.body,
      metadata: input.metadata,
      site: input.site,
      contentItemId: input.item.id,
      channel: input.item.channel,
      planId: input.item.plan_id,
      experimentId:
        typeof (input.metadata as Record<string, unknown>)?.experiment_id === "string"
          ? String((input.metadata as Record<string, unknown>).experiment_id)
          : null,
    },
    supabase
  );

  await supabase
    .from("content_items")
    .update({
      body: tracked.body,
      metadata_json: tracked.metadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.item.id);

  await tagContentItem(
    {
      contentItemId: input.item.id,
      siteId: input.site.id,
      contentBody: tracked.body,
      channel: input.item.channel,
    },
    supabase
  );
}

/**
 * Generates content for a single content_item and saves it to the DB.
 * Uses the admin client directly — no auth check, caller is responsible.
 */
export async function generateAndSaveContentItem(
  content_item_id: string,
  supabase: SupabaseAdminClient
): Promise<{ success: boolean; error?: string }> {
  const { data: item } = await supabase
    .from("content_items")
    .select("*, sites(*)")
    .eq("id", content_item_id)
    .single();

  if (!item || !item.sites?.brief_json) {
    return { success: false, error: "Content item or site brief not found" };
  }

  const brief: MarketingBrief = item.sites.brief_json;
  const channel = item.channel as ContentChannel;
  const snapshot = await getLatestPatternSnapshot(item.sites.id, supabase);
  const shouldCreateVariants =
    !!snapshot &&
    snapshot.sample_size >= MIN_PATTERN_SAMPLE_SIZE &&
    supportsVariants(channel) &&
    !item.variant_group;

  try {
    if (shouldCreateVariants) {
      const variantGroup = crypto.randomUUID();
      const baseMetadata = (item.metadata_json || {}) as ContentMetadata;

      const [variantA, insertedVariant] = await Promise.all([
        generateBodyAndMetadata(
          item,
          brief,
          buildVariantInstruction(snapshot, "A_exploit")
        ),
        supabase
          .from("content_items")
          .insert({
            site_id: item.site_id,
            plan_id: item.plan_id,
            channel: item.channel,
            content_type: item.content_type,
            title: item.title,
            body: "",
            metadata_json: {
              ...baseMetadata,
              variant_mode: "explore",
              variant_reason: "Alternative hook/tone variant generated from content intelligence.",
            },
            status: "draft",
            scheduled_date: item.scheduled_date,
            auto_executable: item.auto_executable,
            variant_group: variantGroup,
            variant_label: "B_explore",
          })
          .select("id, site_id, plan_id, channel, content_type, title, metadata_json")
          .single(),
      ]);

      if (!insertedVariant.data) {
        throw new Error("Failed to create explore variant");
      }

      const variantBItem = {
        ...insertedVariant.data,
        sites: item.sites,
      };
      const variantB = await generateBodyAndMetadata(
        variantBItem as typeof item,
        brief,
        buildVariantInstruction(snapshot, "B_explore")
      );

      await supabase
        .from("content_items")
        .update({
          variant_group: variantGroup,
          variant_label: "A_exploit",
          metadata_json: {
            ...variantA.metadata,
            variant_mode: "exploit",
            variant_reason: "Primary variant generated from the best known content pattern.",
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      await saveGeneratedVariant(
        {
          item: { id: item.id, channel: item.channel, plan_id: item.plan_id },
          site: { id: item.sites.id, url: item.sites.url, name: item.sites.name },
          body: variantA.generatedBody,
          metadata: {
            ...variantA.metadata,
            variant_mode: "exploit",
            variant_reason: "Primary variant generated from the best known content pattern.",
          },
        },
        supabase
      );

      await saveGeneratedVariant(
        {
          item: { id: variantBItem.id, channel: variantBItem.channel, plan_id: variantBItem.plan_id },
          site: { id: item.sites.id, url: item.sites.url, name: item.sites.name },
          body: variantB.generatedBody,
          metadata: {
            ...variantB.metadata,
            variant_mode: "explore",
            variant_reason: "Alternative hook/tone variant generated to explore a new pattern.",
          },
        },
        supabase
      );
    } else {
      const mode =
        item.variant_label === "A_exploit"
          ? "A_exploit"
          : item.variant_label === "B_explore"
            ? "B_explore"
            : "single";
      const generated = await generateBodyAndMetadata(
        item,
        brief,
        buildVariantInstruction(snapshot, mode)
      );

      await saveGeneratedVariant(
        {
          item: { id: item.id, channel: item.channel, plan_id: item.plan_id },
          site: { id: item.sites.id, url: item.sites.url, name: item.sites.name },
          body: generated.generatedBody,
          metadata: generated.metadata,
        },
        supabase
      );
    }

    return { success: true };
  } catch (error) {
    logStructured("error", "generate_content_item_failed", { content_item_id, error: String(error) });
    // Mark item as failed so it's visible in the queue
    await supabase
      .from("content_items")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", content_item_id);
    return { success: false, error: String(error) };
  }
}
