import { NextRequest, NextResponse } from "next/server";
import { getUser, getSupabaseAdminClient } from "@/lib/supabase";
import { MarketingBrief } from "@/types";

// Creates a demo site with pre-generated content so new users can explore
// the full experience without waiting for analysis + generation.
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseAdminClient();

    // Fetch demo brief from app_settings
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "demo_brief")
      .single();

    const brief: MarketingBrief = setting?.value || FALLBACK_DEMO_BRIEF;

    // Get company
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: "User profile incomplete" }, { status: 400 });
    }

    // Create demo site
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .insert({
        company_id: profile.company_id,
        url: "https://tenantletter.co",
        name: "TenantLetter (Demo)",
        status: "active",
        brief_json: brief,
        brief_confirmed: true,
      })
      .select()
      .single();

    if (siteError) throw siteError;

    // Create demo plan
    const { data: plan } = await supabase
      .from("marketing_plans")
      .insert({
        site_id: site.id,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        status: "active",
        strategy_json: DEMO_STRATEGY,
      })
      .select()
      .single();

    // Create demo content items
    if (plan) {
      await supabase.from("content_items").insert(
        DEMO_CONTENT_ITEMS.map((item, i) => ({
          ...item,
          site_id: site.id,
          plan_id: plan.id,
          scheduled_date: new Date(Date.now() + i * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        }))
      );
    }

    // Log activity
    await supabase.from("activity_log").insert([
      {
        site_id: site.id,
        action: "site_analyzed",
        description: 'Demo site loaded — "TenantLetter" analyzed',
        metadata_json: { demo: true },
      },
      {
        site_id: site.id,
        action: "brief_confirmed",
        description: "Marketing brief confirmed (demo)",
        metadata_json: { demo: true },
      },
      {
        site_id: site.id,
        action: "plan_generated",
        description: "30-day marketing plan generated (demo)",
        metadata_json: { demo: true, item_count: DEMO_CONTENT_ITEMS.length },
      },
    ]);

    return NextResponse.json({ site_id: site.id });
  } catch (error) {
    console.error("[/api/demo]", error);
    return NextResponse.json({ error: "Failed to create demo" }, { status: 500 });
  }
}

// ─── Demo data ────────────────────────────────────────────────────────

const FALLBACK_DEMO_BRIEF: MarketingBrief = {
  product_name: "TenantLetter",
  one_liner: "AI-generated landlord violation letters for renters who need help fast",
  target_customer:
    "Renters dealing with landlords who ignore maintenance requests, illegally withhold deposits, or violate lease terms",
  pain_point:
    "Tenants know their rights are being violated but don't know how to write a formal letter that actually works — lawyers are expensive and Google gives generic templates",
  value_proposition:
    "Get a professionally worded, legally-informed violation letter in 60 seconds that landlords respond to — for a fraction of the cost of a lawyer",
  positioning:
    "Empowering, direct, tenant-first. Confident and practical. Avoid legal jargon. Speak like a knowledgeable friend who knows tenant law.",
  keywords: [
    "tenant rights letter",
    "landlord violation letter",
    "demand letter landlord",
    "how to write landlord complaint",
    "tenant rights California",
    "security deposit demand letter",
    "habitability complaint letter",
    "illegal rent increase letter",
    "eviction notice response",
    "landlord repair demand",
  ],
  competitors: ["LegalZoom", "Rocket Lawyer", "Hello Sign templates", "DIY ChatGPT"],
  recommended_channels: [
    { channel: "reddit", reasoning: "r/renting and r/legaladvice are full of tenants asking for help with this exact problem", priority: 1 },
    { channel: "blog", reasoning: "High-intent SEO searches from tenants actively looking for letter templates", priority: 2 },
    { channel: "tiktok", reasoning: "Tenant rights content goes viral — young renters share landlord horror stories", priority: 3 },
    { channel: "directory", reasoning: "Submit to legal tools and productivity directories", priority: 4 },
    { channel: "twitter", reasoning: "Build founder audience sharing tenant rights tips", priority: 5 },
  ],
  content_angles: [
    "The 5 magic words that make landlords actually fix things",
    "What happens when you send a certified letter vs. a text",
    "My landlord kept my deposit. Here is exactly what I did next.",
    "Tenant rights that 90% of renters don't know they have",
    "Why landlords respond to formal letters and ignore texts",
  ],
};

const DEMO_STRATEGY = {
  overview:
    "Focus on capturing high-intent organic traffic from tenants actively searching for help, building a Reddit presence where the target audience congregates, and viral TikTok content that educates and entertains.",
  growth_thesis:
    "TenantLetter can compound by turning urgent tenant problems into discoverable education, then converting that demand with fast legal-letter generation.",
  north_star_goal:
    "Become the default first step renters take when they need to pressure a landlord or assert their rights.",
  acquisition_wedge:
    "Own the moment when renters realize a text is not enough and they need a formal, credible letter immediately.",
  strategic_bets: [
    "Win high-intent SEO before broader brand spend.",
    "Use Reddit and TikTok to turn tenant horror stories into repeat discovery.",
    "Repurpose the strongest legal-rights angles across every distribution surface.",
  ],
  risks: [
    "Legal-adjacent messaging can become too generic or too scary if the voice is not precise.",
    "Strong content can still underperform if the landing page does not convert urgent users quickly.",
  ],
  growth_loops: [
    {
      name: "Search intent loop",
      mechanism: "Publish problem-specific content that captures urgent tenant searches, then use those winning pages to inform new topics and stronger landing copy.",
      why_it_compounds: "Every useful article adds another discoverable entry point and sharper conversion language.",
    },
    {
      name: "Community proof loop",
      mechanism: "Answer tenant questions in public communities, learn the exact objections people have, and turn those objections into more credible product education.",
      why_it_compounds: "Each useful answer improves trust, messaging, and future response quality.",
    },
  ],
  channel_theses: [
    {
      channel: "blog",
      rationale: "Tenants search for templates, rights, and next steps at the exact moment of need.",
      success_signal: "Organic traffic and signups grow from long-tail problem queries.",
    },
    {
      channel: "reddit",
      rationale: "Reddit concentrates real tenant pain and high-context questions in public threads.",
      success_signal: "Helpful replies drive referral traffic and direct product mentions.",
    },
    {
      channel: "tiktok",
      rationale: "Short tenant-rights explainers can spread far beyond current awareness.",
      success_signal: "Videos generate saves, shares, and profile traffic from renters.",
    },
  ],
  weeks: [
    { week: 1, theme: "Foundation", focus: "SEO content, Reddit setup, directory submissions" },
    { week: 2, theme: "Content Push", focus: "Daily social posts, Reddit engagement, outreach drafts" },
    { week: 3, theme: "Amplification", focus: "Double down on Reddit and TikTok, more blog posts" },
    { week: 4, theme: "Optimization", focus: "Analyze what's working, scale winners" },
  ],
};

const DEMO_CONTENT_ITEMS = [
  {
    channel: "blog",
    content_type: "blog_post",
    title: "The 5 Magic Words That Make Landlords Actually Fix Things",
    body: `# The 5 Magic Words That Make Landlords Actually Fix Things

You've texted your landlord about the broken heater three times. Nothing. You've emailed. Still nothing. You're sleeping with a space heater in January and wondering if you'll ever get this fixed.

Here's what most renters don't know: there's a set of magic words that transforms your situation from "annoying tenant complaint" to "legal liability my lawyer needs to know about."

Those words? **"I am formally demanding in writing."**

## Why Informal Requests Get Ignored

When you text or email casually, your landlord knows you're just venting. They've seen a hundred tenants complain and do nothing. Without a paper trail, without formal notice, you have limited legal leverage.

But the moment you send a **formal written demand**, everything changes:
- It creates a legal record
- It starts the clock on their required response time
- It signals you know your rights and aren't going away

## What a Proper Demand Letter Contains

A landlord violation letter isn't just a complaint — it's a legal document. It needs:

1. **Your full name, address, and unit number** — establishes the tenancy
2. **The specific violation** — broken heater, withheld deposit, mold, etc.
3. **When you first reported it** — proves they had notice
4. **The applicable law or lease clause** — shows you know your rights
5. **A specific deadline** — usually 14–30 days depending on severity
6. **The consequence if they don't comply** — next steps you'll take

## The Tone That Works

The most effective demand letters are:
- **Professional, not emotional** — no "I'm so frustrated!" — just facts
- **Specific** — exact dates, exact violations, exact lease language
- **Firm but measured** — not threatening, but clear about consequences

This is hard for most people to write. When you're angry and stressed, writing calmly and precisely feels impossible. That's exactly where tools like [TenantLetter](https://tenantletter.co) help — it generates professionally worded letters in 60 seconds, with the right legal language for your state.

## What Happens When You Send It

Most landlords respond within a week of receiving a formal letter. Why? Because:

1. They realize you're serious
2. They know a formal demand creates legal exposure
3. Most property managers have seen what happens when tenants escalate

If they still don't respond, you now have documentation for:
- Withholding rent (in states where this is allowed)
- Filing with local housing court
- Small claims court
- Contacting a tenant rights organization

## Bottom Line

Stop texting. Start writing formal letters. The shift from "annoyed tenant" to "tenant asserting legal rights in writing" changes everything about how landlords respond.

---

*Need a professional demand letter right now? [TenantLetter](https://tenantletter.co) generates a state-specific, professionally worded letter in 60 seconds.*`,
    metadata_json: { word_count: 480, seo_keyword: "landlord violation letter", meta_description: "Learn the exact words and format that make landlords actually respond to maintenance requests, deposit issues, and lease violations." },
    status: "approved",
    auto_executable: false,
  },
  {
    channel: "twitter",
    content_type: "tweet",
    title: "Pain point tweet — tenants texting landlords",
    body: `Sending your landlord a text to fix something is the equivalent of asking your boss for a raise in a WhatsApp voice note.

Written. Formal. Paper trail. That's the language landlords actually respond to.

(Here's how to do it in 60 seconds 👇)`,
    metadata_json: { tweet_type: "pain_point", char_count: 230 },
    status: "draft",
    auto_executable: true,
  },
  {
    channel: "reddit",
    content_type: "reddit_comment",
    title: "r/renting — responding to deposit question",
    body: `The key thing most people miss is that a text or email saying "hey where's my deposit?" is completely different from a formal written demand.

Landlords know that most tenants just complain and move on. The moment you send a certified letter with the phrase "formal written demand" and reference your state's security deposit law, the calculation changes. Now there's a paper trail. Now there's a deadline. Now their property manager is getting nervous.

I went through this last year. My landlord completely ignored three emails. Sent a formal demand letter citing California Civil Code 1950.5 (21-day rule) and got a check within 10 days.

If you want to write one yourself, search "[your state] security deposit demand letter" — there are templates. Or I recently used a tool called TenantLetter (tenantletter.co) which generated one specific to my situation in about a minute. Either way, stop texting and start documenting.`,
    metadata_json: { target_subreddit: "r/renting", comment_type: "answer", prompt_context: "User asking how to get their security deposit back after landlord went silent" },
    status: "draft",
    auto_executable: false,
  },
  {
    channel: "tiktok",
    content_type: "tiktok_script",
    title: "Hook — landlord ignored your text",
    body: `[HOOK - 0-3 sec]
POV: You've texted your landlord 4 times about the broken heater and they've left you on read.

[PROBLEM - 3-15 sec]
Here's what most renters don't realize: texting your landlord is almost meaningless from a legal standpoint. You have no paper trail. No formal notice. And your landlord knows this. They've seen hundreds of tenants complain and do nothing.

[SOLUTION - 15-45 sec]
What actually works is a formal demand letter. Three sentences, sent certified mail, citing your state's tenant rights law. I'm talking about a document that starts with "I am formally demanding in writing" and ends with a deadline and a consequence.

The second a landlord sees that? Their lawyer starts paying attention.

I used to spend hours trying to write these. Then I found TenantLetter — you answer a few questions and it generates a state-specific, professionally worded letter in literally 60 seconds. Link in bio.

[CTA - last 5 sec]
Know a renter getting jerked around? Share this. They'll thank you later.`,
    metadata_json: { hook: "POV: You've texted your landlord 4 times...", overlays: ["4 texts. 0 replies.", "Formal letter = legal leverage", "60 seconds to a real demand letter"], duration_seconds: 45, notes: "Film at desk or on phone. Show the letter being generated." },
    status: "draft",
    auto_executable: false,
  },
  {
    channel: "directory",
    content_type: "directory_submission",
    title: "Product Hunt submission",
    body: `**Product Hunt**

Tagline: AI-written tenant rights letters that landlords can't ignore

Short description: Generate a professional landlord demand letter in 60 seconds. State-specific, legally-informed, and actually effective.

Full description:
TenantLetter helps renters assert their rights without expensive lawyers. Answer a few questions about your situation — broken appliance, withheld deposit, illegal rent increase — and get a professionally worded, state-specific demand letter in 60 seconds.

The letters cite real tenant protection laws, include proper legal language, and give landlords a clear deadline and consequence. Most users report a response within 1-2 weeks.

Tags: legal-tech, tenant-rights, productivity, AI, legaltech

Submit at: https://www.producthunt.com/posts/new`,
    metadata_json: { directory_name: "Product Hunt", directory_url: "https://producthunt.com", submission_url: "https://www.producthunt.com/posts/new", tags: ["legal-tech", "tenant-rights", "productivity", "AI"] },
    status: "draft",
    auto_executable: false,
  },
  {
    channel: "email",
    content_type: "email_template",
    title: "Cold outreach — tenant advocacy orgs",
    body: `Subject: tool your community might find useful

Hi {{first_name}},

Quick one — I built a tool that generates professional tenant rights letters in 60 seconds.

A lot of the people you work with know their rights are being violated but don't know how to write a formal demand that landlords actually respond to. This handles that — it generates state-specific letters citing real tenant protection laws, properly formatted for legal weight.

Would it be useful to share with {{organization}}?

Happy to give you a free account to test it.

— [Your name]
tenantletter.co`,
    metadata_json: { subject_line: "tool your community might find useful", email_style: "short_intro" },
    status: "draft",
    auto_executable: false,
  },
];
