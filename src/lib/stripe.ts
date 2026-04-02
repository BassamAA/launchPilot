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
    description: "One product, one focused distribution workflow",
    features: [
      "1 site",
      "30-day strategy and channel plan",
      "Starter drafts for blog, X, LinkedIn, email, and launch surfaces",
      "30 content pieces / month",
      "Queue-based review and publishing workflow",
      "Basic performance tracking",
    ],
    limits: {
      sites: 1,
      content_per_month: 30,
      channels: ["blog", "twitter", "linkedin", "email", "directory"],
    },
    stripe_price_id: process.env.STRIPE_STARTER_PRICE_ID || "price_starter",
  },
  {
    id: "growth",
    name: "Pro",
    price: 149,
    description: "For founders who want a serious distribution system",
    features: [
      "5 sites",
      "Expanded content generation across core channels",
      "Unlimited content generation",
      "Queue + approval workflow",
      "Auto-approve low-risk channels",
      "Weekly performance reporting",
      "Pattern intelligence and growth experiments",
    ],
    limits: {
      sites: 5,
      content_per_month: Infinity,
      channels: ["blog", "twitter", "linkedin", "email", "directory", "reddit"],
    },
    stripe_price_id: process.env.STRIPE_GROWTH_PRICE_ID || "price_growth",
    highlighted: true,
  },
  {
    id: "agency",
    name: "Scale",
    price: 499,
    description: "For teams running multiple products and workflows",
    features: [
      "Unlimited sites",
      "Unlimited content generation",
      "Multi-site queue and publishing workflow",
      "10 team seats",
      "Priority generation queue",
      "Dedicated onboarding",
      "API access when enabled",
    ],
    limits: {
      sites: Infinity,
      content_per_month: Infinity,
      channels: ["blog", "twitter", "linkedin", "email", "directory", "reddit"],
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
