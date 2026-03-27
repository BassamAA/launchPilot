import { NextRequest, NextResponse } from "next/server";
import { getUser, getSupabaseAdminClient } from "@/lib/supabase";
import { stripe, createCheckoutSession, PRICING_PLANS } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { tier } = await req.json();
    const plan = PRICING_PLANS.find((p) => p.id === tier);
    if (!plan) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    const supabase = getSupabaseAdminClient();
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await createCheckoutSession({
      priceId: plan.stripe_price_id,
      customerId: profile?.stripe_customer_id || undefined,
      userId: user.id,
      successUrl: `${baseUrl}/settings/billing?success=true`,
      cancelUrl: `${baseUrl}/settings/billing?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[/api/stripe/checkout]", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
