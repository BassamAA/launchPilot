import { callClaude } from "@/lib/claude";
import { getSupabaseAdminClient } from "@/lib/supabase";
import {
  ContentChannel,
  ContentCtaType,
  ContentFormat,
  ContentHookType,
  ContentLengthBucket,
  ContentTags,
  ContentTagCategory,
  ContentTone,
  ContentTopicAngle,
  BinaryContentSignal,
} from "@/types";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdminClient>;

const TAG_VALUES: {
  hook_type: readonly ContentHookType[];
  cta_type: readonly ContentCtaType[];
  tone: readonly ContentTone[];
  format: readonly ContentFormat[];
  topic_angle: readonly ContentTopicAngle[];
  includes_price: readonly BinaryContentSignal[];
  includes_social_proof: readonly BinaryContentSignal[];
  content_length: readonly ContentLengthBucket[];
} = {
  hook_type: ["pain_point", "curiosity", "social_proof", "contrarian", "how_to", "story", "statistic", "question"],
  cta_type: ["direct_signup", "learn_more", "free_trial", "visit_site", "reply_engage", "none"],
  tone: ["professional", "casual", "urgent", "empathetic", "authoritative", "provocative"],
  format: ["short_text", "thread", "listicle", "narrative", "comparison", "case_study", "question_answer"],
  topic_angle: ["product_feature", "customer_pain", "competitor_comparison", "industry_trend", "personal_story", "educational", "pricing_value"],
  includes_price: ["yes", "no"],
  includes_social_proof: ["yes", "no"],
  content_length: ["short", "medium", "long"],
};

function clampToEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

function guessHookType(body: string): ContentHookType {
  const lower = body.toLowerCase();
  if (lower.includes("?")) return "question";
  if (/\bhow to\b|\bhere's how\b|\bstep\b/.test(lower)) return "how_to";
  if (/\b\d+[%x]?\b|\bstat\b|\bdata\b/.test(lower)) return "statistic";
  if (/\bi built\b|\bwhen i\b|\bwe built\b|\bmy story\b/.test(lower)) return "story";
  if (/\busers\b|\bcustomers\b|\bteams\b|\bfounders\b/.test(lower)) return "social_proof";
  if (/\bshould stop\b|\bwrong\b|\bdon't\b/.test(lower)) return "contrarian";
  if (/\bwhy\b|\bsecret\b|\bno one talks\b|\bwhat if\b/.test(lower)) return "curiosity";
  return "pain_point";
}

function guessCtaType(body: string): ContentCtaType {
  const lower = body.toLowerCase();
  if (/\btry\b|\bsign up\b|\bstart\b/.test(lower)) return "direct_signup";
  if (/\bfree trial\b|\bfree\b/.test(lower)) return "free_trial";
  if (/\blearn more\b|\bsee how\b|\bread more\b/.test(lower)) return "learn_more";
  if (/\bvisit\b|\bcheck it out\b|\blink in bio\b|\bproduct url\b/.test(lower)) return "visit_site";
  if (/\breply\b|\bcomment\b|\bwhat do you think\b/.test(lower)) return "reply_engage";
  return "none";
}

function guessTone(body: string): ContentTone {
  const lower = body.toLowerCase();
  if (/\bnow\b|\btoday\b|\bfast\b|\bimmediately\b/.test(lower)) return "urgent";
  if (/\bfeel\b|\bfrustrat|\boverwhelm|\bstress\b/.test(lower)) return "empathetic";
  if (/\bwrong\b|\bnever\b|\bstop\b/.test(lower)) return "provocative";
  if (/\bi\b|\bwe\b|\byou\b/.test(lower)) return "casual";
  if (/\bguide\b|\bframework\b|\bbest practice\b/.test(lower)) return "authoritative";
  return "professional";
}

function guessFormat(body: string, channel: ContentChannel): ContentFormat {
  if (channel === "twitter" && body.includes("\n\n---\n\n")) return "thread";
  if (/^(\s*[-*]|\s*\d+\.)/m.test(body)) return "listicle";
  if (/\bvs\b|\bcompare\b|\binstead of\b/.test(body.toLowerCase())) return "comparison";
  if (/\bcase study\b|\bwe used\b|\bresults\b/.test(body.toLowerCase())) return "case_study";
  if (body.includes("?")) return "question_answer";
  if (/\bi\b|\bwe\b|\bwhen\b/.test(body.toLowerCase())) return "narrative";
  return "short_text";
}

function guessTopicAngle(body: string): ContentTopicAngle {
  const lower = body.toLowerCase();
  if (/\bpricing\b|\bcost\b|\bworth\b|\broi\b/.test(lower)) return "pricing_value";
  if (/\bcompetitor\b|\balternative\b|\binstead of\b/.test(lower)) return "competitor_comparison";
  if (/\btrend\b|\bmarket\b|\bindustry\b/.test(lower)) return "industry_trend";
  if (/\bfeature\b|\bworkflow\b|\bproduct\b/.test(lower)) return "product_feature";
  if (/\bi\b|\bwe\b|\bbuilt\b|\bstory\b/.test(lower)) return "personal_story";
  if (/\bhow\b|\bguide\b|\btemplate\b|\bplaybook\b/.test(lower)) return "educational";
  return "customer_pain";
}

function guessBinary(body: string, mode: "price" | "social_proof"): BinaryContentSignal {
  const lower = body.toLowerCase();
  if (mode === "price") {
    return /\$\d|\bpricing\b|\bfree\b|\btrial\b/.test(lower) ? "yes" : "no";
  }
  return /\busers\b|\bcustomers\b|\bteams\b|\bcase study\b|\bresults\b|\btestimonial\b/.test(lower) ? "yes" : "no";
}

function guessLength(body: string): ContentLengthBucket {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  if (words < 80) return "short";
  if (words < 350) return "medium";
  return "long";
}

export function buildFallbackTags(body: string, channel: ContentChannel): ContentTags {
  return {
    hook_type: guessHookType(body),
    cta_type: guessCtaType(body),
    tone: guessTone(body),
    format: guessFormat(body, channel),
    topic_angle: guessTopicAngle(body),
    includes_price: guessBinary(body, "price"),
    includes_social_proof: guessBinary(body, "social_proof"),
    content_length: guessLength(body),
  };
}

function normalizeTags(raw: Partial<ContentTags> | null | undefined, body: string, channel: ContentChannel): ContentTags {
  const fallback = buildFallbackTags(body, channel);
  return {
    hook_type: clampToEnum(raw?.hook_type, TAG_VALUES.hook_type, fallback.hook_type),
    cta_type: clampToEnum(raw?.cta_type, TAG_VALUES.cta_type, fallback.cta_type),
    tone: clampToEnum(raw?.tone, TAG_VALUES.tone, fallback.tone),
    format: clampToEnum(raw?.format, TAG_VALUES.format, fallback.format),
    topic_angle: clampToEnum(raw?.topic_angle, TAG_VALUES.topic_angle, fallback.topic_angle),
    includes_price: clampToEnum(raw?.includes_price, TAG_VALUES.includes_price, fallback.includes_price),
    includes_social_proof: clampToEnum(raw?.includes_social_proof, TAG_VALUES.includes_social_proof, fallback.includes_social_proof),
    content_length: clampToEnum(raw?.content_length, TAG_VALUES.content_length, fallback.content_length),
  };
}

export async function classifyContentTags(body: string, channel: ContentChannel): Promise<ContentTags> {
  try {
    const result = await callClaude<ContentTags>({
      model: "haiku",
      systemPrompt: "You classify marketing content into a fixed schema. Return valid JSON only.",
      userPrompt: `Classify this ${channel} marketing content. Return ONLY valid JSON.

Content: ${JSON.stringify(body.slice(0, 8000))}

{
  "hook_type": "pain_point|curiosity|social_proof|contrarian|how_to|story|statistic|question",
  "cta_type": "direct_signup|learn_more|free_trial|visit_site|reply_engage|none",
  "tone": "professional|casual|urgent|empathetic|authoritative|provocative",
  "format": "short_text|thread|listicle|narrative|comparison|case_study|question_answer",
  "topic_angle": "product_feature|customer_pain|competitor_comparison|industry_trend|personal_story|educational|pricing_value",
  "includes_price": "yes|no",
  "includes_social_proof": "yes|no",
  "content_length": "short|medium|long"
}`,
      maxTokens: 512,
      retries: 0,
    });

    return normalizeTags(result.data, body, channel);
  } catch {
    return buildFallbackTags(body, channel);
  }
}

export async function tagContentItem(
  input: {
    contentItemId: string;
    siteId: string;
    contentBody: string;
    channel: ContentChannel;
  },
  supabase = getSupabaseAdminClient()
) {
  const tags = await classifyContentTags(input.contentBody, input.channel);

  await supabase.from("content_tags").delete().eq("content_item_id", input.contentItemId);

  const rows = Object.entries(tags).map(([tagCategory, tagValue]) => ({
    content_item_id: input.contentItemId,
    site_id: input.siteId,
    tag_category: tagCategory,
    tag_value: tagValue,
    confidence: 1,
  }));

  if (rows.length > 0) {
    await supabase.from("content_tags").insert(rows);
  }

  return tags;
}
