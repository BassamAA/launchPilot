import Stripe from "stripe";
import { PricingPlan, SubscriptionTier } from "@/types";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return _stripe;
}

// Alias for convenience
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Solo",
    price: 49,
    description: "One product, full marketing stack",
    features: [
      "1 site",
      "All channels — blog, Twitter, Reddit, email, TikTok, directories",
      "30 content pieces/month",
      "AI-generated 30-day plan",
      "Approval queue",
      "Performance tracking",
    ],
    limits: {
      sites: 1,
      content_per_month: 30,
      channels: ["blog", "twitter", "reddit", "email", "tiktok", "directory"],
    },
    stripe_price_id: process.env.STRIPE_STARTER_PRICE_ID || "price_starter",
  },
  {
    id: "growth",
    name: "Pro",
    price: 149,
    description: "For founders who are serious about distribution",
    features: [
      "5 sites",
      "All channels",
      "Unlimited content",
      "A/B content experiments",
      "Pattern intelligence — learns what converts",
      "Auto-approve low-risk channels",
      "Weekly performance reports",
    ],
    limits: {
      sites: 5,
      content_per_month: Infinity,
      channels: ["blog", "twitter", "reddit", "email", "tiktok", "directory"],
    },
    stripe_price_id: process.env.STRIPE_GROWTH_PRICE_ID || "price_growth",
    highlighted: true,
  },
  {
    id: "agency",
    name: "Scale",
    price: 499,
    description: "For teams running marketing across multiple products",
    features: [
      "Unlimited sites",
      "All channels",
      "Unlimited content",
      "10 team seats",
      "API access",
      "Priority generation queue",
      "Dedicated onboarding",
    ],
    limits: {
      sites: Infinity,
      content_per_month: Infinity,
      channels: ["blog", "twitter", "reddit", "email", "tiktok", "directory"],
    },
    stripe_price_id: process.env.STRIPE_AGENCY_PRICE_ID || "price_agency",
  },
];

export function getPlanById(id: SubscriptionTier): PricingPlan | undefined {
  return PRICING_PLANS.find((p) => p.id === id);
}

export async function createCheckoutSession({
  priceId,
  customerId,
  userId,
  tier,
  successUrl,
  cancelUrl,
}: {
  priceId: string;
  customerId?: string;
  userId: string;
  tier: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { user_id: userId, tier },
    subscription_data: {
      trial_period_days: 7,
      metadata: { user_id: userId, tier },
    },
    allow_promotion_codes: true,
  });
}

export async function createBillingPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

export function getTierFromPriceId(priceId: string): SubscriptionTier {
  const normalizedId = priceId?.trim();
  const plan = PRICING_PLANS.find((p) => p.stripe_price_id.trim() === normalizedId);
  return (plan?.id as SubscriptionTier) || "free_trial";
}
