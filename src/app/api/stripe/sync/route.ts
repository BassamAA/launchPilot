import { NextResponse } from "next/server";
import { getUser, getSupabaseAdminClient } from "@/lib/supabase";
import { stripe, getTierFromPriceId } from "@/lib/stripe";
import { logStructured } from "@/lib/observability";

/**
 * POST /api/stripe/sync
 * Pulls the current subscription state from Stripe and syncs it to the DB.
 * Called when a user's plan shows stale (e.g. webhook failed).
 */
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdminClient();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("stripe_customer_id, stripe_subscription_id, subscription_tier")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id;

  // If no customer ID on record, try to find by email in Stripe
  if (!customerId && user.email) {
    try {
      const customers = await stripe.customers.list({ email: user.email, limit: 5 });
      const found = customers.data.find((c) => !c.deleted);
      if (found) {
        customerId = found.id;
        // Persist so we don't have to look it up again
        await supabase
          .from("user_profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", user.id);
        logStructured("info", "stripe_sync_customer_recovered_by_email", { userId: user.id, customerId });
      }
    } catch (lookupErr) {
      logStructured("warn", "stripe_sync_customer_lookup_failed", { userId: user.id, error: String(lookupErr) });
    }
  }

  if (!customerId) {
    return NextResponse.json({ synced: false, reason: "No Stripe customer on record" });
  }

  try {
    // Fetch all active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 5,
    });

    const active = subscriptions.data.find((s) =>
      ["active", "trialing"].includes(s.status)
    );

    if (!active) {
      // No active subscription — downgrade to free
      await supabase
        .from("user_profiles")
        .update({ subscription_tier: "free_trial", stripe_subscription_id: null })
        .eq("id", user.id);

      logStructured("info", "stripe_sync_no_active_sub", { userId: user.id });
      return NextResponse.json({ synced: true, tier: "free_trial" });
    }

    const priceId = active.items.data[0]?.price.id;
    let tier = getTierFromPriceId(priceId);

    // Fall back to tier stored in subscription metadata
    if (tier === "free_trial" && active.metadata?.tier && active.metadata.tier !== "free_trial") {
      tier = active.metadata.tier as typeof tier;
    }

    if (tier === "free_trial") {
      // Can't identify the tier — don't overwrite an existing paid plan
      const { data: current } = await supabase
        .from("user_profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .single();

      if (current?.subscription_tier && current.subscription_tier !== "free_trial") {
        logStructured("warn", "stripe_sync_tier_unknown_keeping_existing", {
          userId: user.id,
          priceId,
          kept: current.subscription_tier,
          hint: "Check STRIPE_*_PRICE_ID env vars match your Stripe dashboard price IDs",
        });
        // Just update the subscription ID, not the tier
        await supabase
          .from("user_profiles")
          .update({ stripe_subscription_id: active.id, trial_ends_at: null })
          .eq("id", user.id);
        return NextResponse.json({ synced: true, tier: current.subscription_tier });
      }
    }

    await supabase
      .from("user_profiles")
      .update({
        subscription_tier: tier,
        stripe_subscription_id: active.id,
        trial_ends_at: null,
      })
      .eq("id", user.id);

    logStructured("info", "stripe_sync_success", { userId: user.id, tier, priceId });
    return NextResponse.json({ synced: true, tier });
  } catch (err) {
    logStructured("error", "stripe_sync_failed", { userId: user.id, error: String(err) });
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
