import { ContentItem, GrowthExperiment, SiteOnboardingState } from "@/types";
import { BRAND_NAME } from "@/lib/brand";

export interface PriorityAction {
  id: string;
  urgency: "high" | "medium" | "low";
  message: string;
  cta: string;
  href: string;
}

interface PriorityActionInput {
  siteId: string;
  pendingApproval: number;
  totalPublished: number;
  twitterConnected: boolean;
  hasTrackingActivity: boolean;
  briefConfirmed: boolean;
  totalGenerated: number;
  onboarding: SiteOnboardingState | null | undefined;
  activeExperiments: GrowthExperiment[];
  lastPublishedAt: string | null;
  recentItems: Pick<ContentItem, "status" | "created_at">[];
  bestPatternInsight: string | null;
}

export function getPriorityActions(input: PriorityActionInput): PriorityAction[] {
  const {
    siteId,
    pendingApproval,
    totalPublished,
    twitterConnected,
    hasTrackingActivity,
    briefConfirmed,
    totalGenerated,
    onboarding,
    activeExperiments,
    lastPublishedAt,
    bestPatternInsight,
  } = input;

  const actions: (PriorityAction & { weight: number })[] = [];

  // Brief not confirmed yet — block everything else
  if (!briefConfirmed) {
    actions.push({
      id: "confirm_brief",
      urgency: "high",
      message: "Your marketing brief is ready for review. Confirm it to generate your 30-day plan.",
      cta: "Review brief",
      href: `/sites/${siteId}/brief`,
      weight: 100,
    });
  }

  // Pending content in queue
  if (pendingApproval > 0) {
    actions.push({
      id: "approve_queue",
      urgency: pendingApproval >= 5 ? "high" : "medium",
      message:
        pendingApproval === 1
          ? "1 content piece is ready for your review — approve it to keep momentum."
          : `${pendingApproval} content pieces are ready for your review.`,
      cta: "Go to queue",
      href: `/sites/${siteId}/queue`,
      weight: pendingApproval >= 5 ? 90 : 70,
    });
  }

  // No plan / no content generated yet
  if (briefConfirmed && totalGenerated === 0) {
    actions.push({
      id: "generate_plan",
      urgency: "high",
      message: "Your brief is confirmed. Generate your 30-day plan to start getting content.",
      cta: "Generate plan",
      href: `/sites/${siteId}/plan`,
      weight: 85,
    });
  }

  // Twitter not connected and they have approved content
  if (!twitterConnected && totalPublished > 0) {
    actions.push({
      id: "connect_twitter",
      urgency: "medium",
      message: "Connect Twitter so approved tweets publish automatically without copy-pasting.",
      cta: "Connect Twitter",
      href: `/sites/${siteId}/settings`,
      weight: 60,
    });
  }

  // Tracking not installed but they have published content
  if (!hasTrackingActivity && totalPublished > 3) {
    actions.push({
      id: "install_tracking",
      urgency: "medium",
      message: "You've published content but have no tracking installed — you can't see what's working.",
      cta: "Install pixel",
      href: `/sites/${siteId}/settings`,
      weight: 55,
    });
  }

  // Marketing has gone quiet (no publish in 7+ days)
  if (lastPublishedAt) {
    const daysSincePublish = Math.floor(
      (Date.now() - new Date(lastPublishedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSincePublish >= 7 && pendingApproval === 0) {
      actions.push({
        id: "resume_publishing",
        urgency: "medium",
        message: `Your marketing has been quiet for ${daysSincePublish} days. Approve content to keep momentum.`,
        cta: "See content",
        href: `/sites/${siteId}/queue`,
        weight: 65,
      });
    }
  }

  // Underperforming experiment
  const lowConfidenceExperiment = activeExperiments.find(
    (exp) => typeof exp.confidence === "number" && exp.confidence < 30
  );
  if (lowConfidenceExperiment) {
    actions.push({
      id: "review_experiment",
      urgency: "low",
      message: `"${lowConfidenceExperiment.hypothesis?.slice(0, 60) ?? "A growth bet"}" has low confidence — consider pausing or pivoting.`,
      cta: "Review strategy",
      href: `/sites/${siteId}/plan`,
      weight: 40,
    });
  }

  // Pattern learning insight
  if (bestPatternInsight && totalPublished >= 10) {
    actions.push({
      id: "pattern_insight",
      urgency: "low",
      message: `${BRAND_NAME} learned that ${bestPatternInsight} — new content reflects this.`,
      cta: "See performance",
      href: `/sites/${siteId}/performance`,
      weight: 35,
    });
  }

  // Wizard not completed
  if (briefConfirmed && !onboarding?.wizard_completed && totalGenerated === 0) {
    actions.push({
      id: "finish_setup",
      urgency: "low",
      message: `Finish the quick setup to let ${BRAND_NAME} start working for you immediately.`,
      cta: "Continue setup",
      href: `/sites/${siteId}`,
      weight: 30,
    });
  }

  // Sort by weight descending, return top 3
  return actions
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map(({ weight: _weight, ...action }) => action);
}
