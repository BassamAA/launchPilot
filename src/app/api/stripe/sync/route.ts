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

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ synced: false, reason: "No Stripe customer on record" });
  }

  try {
    // Fetch all active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
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
    const tier = getTierFromPriceId(priceId);

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
