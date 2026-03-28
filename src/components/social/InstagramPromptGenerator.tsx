"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { CopyableTextBlock } from "@/components/social/CopyableTextBlock";
import { SparklesIcon, UserGroupIcon, FilmIcon } from "@heroicons/react/24/outline";

type PromptType = "image_prompt" | "reel_prompt" | "influencer_brief";

interface BaseProps {
  promptType?: PromptType;
}

// From content queue — has a real content_item_id
interface ContentItemProps extends BaseProps {
  mode: "content_item";
  contentItemId: string;
}

// From strategy view — has concept text + site_id
interface StrategyProps extends BaseProps {
  mode: "strategy";
  siteId: string;
  concept: string;
  caption: string;
}

type Props = ContentItemProps | StrategyProps;

const TYPE_META: Record<PromptType, { label: string; icon: React.ReactNode; description: string }> = {
  image_prompt: {
    label: "Image Prompt",
    icon: <SparklesIcon className="w-4 h-4" />,
    description: "Midjourney / DALL-E prompt — paste directly into the tool",
  },
  reel_prompt: {
    label: "Reel Script",
    icon: <FilmIcon className="w-4 h-4" />,
    description: "Hook, script, b-roll suggestions, caption, and CTA",
  },
  influencer_brief: {
    label: "Influencer Brief",
    icon: <UserGroupIcon className="w-4 h-4" />,
    description: "Full brief document ready to send to a creator",
  },
};

export function InstagramPromptGenerator(props: Props) {
  const [open, setOpen] = useState(false);
  const [activeType, setActiveType] = useState<PromptType | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [influencerStyle, setInfluencerStyle] = useState("");

  async function generate(type: PromptType) {
    setActiveType(type);
    setResult(null);
    setLoading(true);
    try {
      let res: Response;
      if (props.mode === "content_item") {
        res = await fetch("/api/instagram-content-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content_item_id: props.contentItemId,
            prompt_type: type,
            influencer_style: type === "influencer_brief" && influencerStyle ? influencerStyle : undefined,
          }),
        });
      } else {
        res = await fetch("/api/instagram-strategy-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            site_id: props.siteId,
            concept: props.concept,
            caption: props.caption,
            prompt_type: type,
            influencer_style: type === "influencer_brief" && influencerStyle ? influencerStyle : undefined,
          }),
        });
      }
      const data = await res.json();
      if (res.ok) setResult(data.prompt);
      else setResult(`Error: ${data.error}`);
    } catch {
      setResult("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium"
      >
        + Image prompt / Reel script / Influencer brief
      </button>
    );
  }

  return (
    <Card className="mt-3 space-y-3 border-brand-100 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-900/10">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Instagram Content Tools
        </p>
        <button
          onClick={() => { setOpen(false); setResult(null); setActiveType(null); }}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          close
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.entries(TYPE_META) as [PromptType, typeof TYPE_META[PromptType]][]).map(([type, meta]) => (
          <Button
            key={type}
            size="sm"
            variant={activeType === type ? "primary" : "outline"}
            onClick={() => generate(type)}
            loading={loading && activeType === type}
          >
            {meta.icon}
            {meta.label}
          </Button>
        ))}
      </div>

      {activeType === "influencer_brief" && (
        <input
          type="text"
          placeholder="Influencer style / niche — e.g. 'tech reviewer, 50k followers' (optional)"
          value={influencerStyle}
          onChange={(e) => setInfluencerStyle(e.target.value)}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
        />
      )}

      {loading && (
        <p className="text-sm text-brand-600 dark:text-brand-400 animate-pulse">
          Generating {activeType ? TYPE_META[activeType].label.toLowerCase() : ""}…
        </p>
      )}

      {result && (
        <div className="space-y-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {activeType ? TYPE_META[activeType].description : ""}
          </p>
          <CopyableTextBlock value={result} rows={10} />
        </div>
      )}
    </Card>
  );
}
