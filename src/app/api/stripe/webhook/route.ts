import { NextRequest, NextResponse } from "next/server";
import { stripe, getTierFromPriceId } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase";
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
    console.error("[stripe webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        if (!userId) break;

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        const priceId = subscription.items.data[0]?.price.id;
        const tier = getTierFromPriceId(priceId);

        await supabase
          .from("user_profiles")
          .update({
            subscription_tier: tier,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            trial_ends_at: null,
          })
          .eq("id", userId);

        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const priceId = sub.items.data[0]?.price.id;
        const tier = getTierFromPriceId(priceId);

        // Find user by customer ID
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("stripe_customer_id", sub.customer as string)
          .single();

        if (profile) {
          await supabase
            .from("user_profiles")
            .update({ subscription_tier: tier })
            .eq("id", profile.id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("stripe_customer_id", sub.customer as string)
          .single();

        if (profile) {
          await supabase
            .from("user_profiles")
            .update({ subscription_tier: "free_trial", stripe_subscription_id: null })
            .eq("id", profile.id);
        }
        break;
      }
    }
  } catch (err) {
    console.error("[stripe webhook] handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
