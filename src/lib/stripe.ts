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
    name: "Starter",
    price: 29,
    description: "For solo founders launching their first product",
    features: [
      "1 site",
      "SEO blog posts & directory submissions",
      "10 content pieces/month",
      "Marketing brief & 30-day plan",
      "Approval queue",
    ],
    limits: {
      sites: 1,
      content_per_month: 10,
      channels: ["blog", "directory"],
    },
    stripe_price_id: process.env.STRIPE_STARTER_PRICE_ID || "price_starter",
  },
  {
    id: "growth",
    name: "Growth",
    price: 79,
    description: "For indie hackers ready to scale",
    features: [
      "3 sites",
      "All channels: blog, Twitter, Reddit, email, TikTok, directories",
      "50 content pieces/month",
      "Priority AI generation",
      "Calendar & list view",
      "Activity feed",
    ],
    limits: {
      sites: 3,
      content_per_month: 50,
      channels: ["blog", "twitter", "reddit", "email", "tiktok", "directory"],
    },
    stripe_price_id: process.env.STRIPE_GROWTH_PRICE_ID || "price_growth",
    highlighted: true,
  },
  {
    id: "agency",
    name: "Agency",
    price: 199,
    description: "For teams managing multiple products",
    features: [
      "10 sites",
      "All channels",
      "Unlimited content",
      "Priority generation queue",
      "Team access (up to 5 members)",
      "API access",
    ],
    limits: {
      sites: 10,
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
  successUrl,
  cancelUrl,
}: {
  priceId: string;
  customerId?: string;
  userId: string;
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
    metadata: { user_id: userId },
    subscription_data: {
      trial_period_days: 7,
      metadata: { user_id: userId },
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
  const plan = PRICING_PLANS.find((p) => p.stripe_price_id === priceId);
  return (plan?.id as SubscriptionTier) || "free_trial";
}
