import { NextRequest, NextResponse } from "next/server";
import { stripe, getTierFromPriceId } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { logStructured } from "@/lib/observability";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    logStructured("error", "stripe_webhook_signature_failed", { error: String(err) });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  logStructured("info", "stripe_webhook_received", { type: event.type, id: event.id });

  const supabase = getSupabaseAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;

        if (!userId) {
          logStructured("warn", "stripe_webhook_no_user_id", { sessionId: session.id });
          break;
        }

        const subscriptionId = session.subscription as string;
        if (!subscriptionId) {
          logStructured("warn", "stripe_webhook_no_subscription", { sessionId: session.id, userId });
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;
        const tier = getTierFromPriceId(priceId);

        if (tier === "free_trial") {
          logStructured("warn", "stripe_webhook_unknown_price_id", { priceId, sessionId: session.id, userId });
        }

        const { error } = await supabase
          .from("user_profiles")
          .update({
            subscription_tier: tier,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId,
            trial_ends_at: null,
          })
          .eq("id", userId);

        if (error) {
          logStructured("error", "stripe_webhook_db_update_failed", { userId, tier, error: error.message });
        } else {
          logStructured("info", "stripe_webhook_subscription_activated", { userId, tier, priceId });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const priceId = sub.items.data[0]?.price.id;
        const tier = getTierFromPriceId(priceId);

        const { data: profile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("stripe_customer_id", sub.customer as string)
          .single();

        if (!profile) {
          logStructured("warn", "stripe_webhook_customer_not_found", { customerId: sub.customer });
          break;
        }

        await supabase
          .from("user_profiles")
          .update({ subscription_tier: tier, stripe_subscription_id: sub.id })
          .eq("id", profile.id);

        logStructured("info", "stripe_webhook_subscription_updated", { userId: profile.id, tier, priceId });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("stripe_customer_id", sub.customer as string)
          .single();

        if (!profile) {
          logStructured("warn", "stripe_webhook_customer_not_found_on_delete", { customerId: sub.customer });
          break;
        }

        await supabase
          .from("user_profiles")
          .update({ subscription_tier: "free_trial", stripe_subscription_id: null })
          .eq("id", profile.id);

        logStructured("info", "stripe_webhook_subscription_cancelled", { userId: profile.id });
        break;
      }

      default:
        logStructured("info", "stripe_webhook_unhandled_event", { type: event.type });
    }
  } catch (err) {
    logStructured("error", "stripe_webhook_handler_error", { type: event.type, error: String(err) });
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
