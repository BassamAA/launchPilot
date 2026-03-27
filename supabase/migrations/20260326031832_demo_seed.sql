-- Demo site data (used when user clicks "Try with example site")
-- This is referenced by the frontend to pre-populate a demo experience

-- Note: This seed creates a template that the application reads
-- It does NOT create a real user row — that happens on-demand via the API

-- Store the demo brief as a reusable JSON template in a settings table
create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table app_settings enable row level security;

create policy "Anyone can read app settings"
  on app_settings for select using (true);

insert into app_settings (key, value) values (
  'demo_brief',
  '{
    "product_name": "TenantLetter",
    "one_liner": "AI-generated landlord violation letters for renters who need help fast",
    "target_customer": "Renters dealing with landlords who ignore maintenance requests, illegally withhold deposits, or violate lease terms",
    "pain_point": "Tenants know their rights are being violated but don't know how to write a formal letter that gets results — lawyers are expensive and Google gives generic templates",
    "value_proposition": "Get a professionally worded, legally-informed violation letter in 60 seconds that landlords actually respond to — for a fraction of the cost of a lawyer",
    "positioning": "Empowering, direct, and tenant-first. Tone is confident and practical. Avoid legal jargon. Speak like a knowledgeable friend who knows tenant law.",
    "keywords": ["tenant rights letter", "landlord violation letter", "demand letter landlord", "how to write landlord complaint", "tenant rights California", "security deposit demand letter", "habitability complaint letter", "illegal rent increase letter", "eviction notice response", "landlord repair demand", "tenant complaint template", "renter rights lawyer alternative", "landlord response letter generator", "rental dispute letter", "tenant legal letter AI"],
    "competitors": ["LegalZoom", "Rocket Lawyer", "HelloSign (templates)", "ChatGPT DIY", "Local tenant rights orgs"],
    "recommended_channels": [
      {"channel": "reddit", "reasoning": "r/renting, r/legaladvice, r/tenantadvice are full of people with exactly this problem asking for help", "priority": 1},
      {"channel": "blog", "reasoning": "High-intent SEO for searches like tenant rights letter template, demand letter landlord — people actively searching for solutions", "priority": 2},
      {"channel": "tiktok", "reasoning": "Tenant rights content goes viral on TikTok — young renters share landlord horror stories and solutions", "priority": 3},
      {"channel": "directory", "reasoning": "Submit to legal tools directories and productivity hubs where people look for document generators", "priority": 4},
      {"channel": "twitter", "reasoning": "Build founder audience sharing tenant rights tips and the story behind building the product", "priority": 5}
    ],
    "content_angles": [
      "The 5 magic words that make landlords actually fix things",
      "What happens when you send a certified letter vs. a text to your landlord",
      "My landlord kept my deposit. Here is exactly what I did next.",
      "Tenant rights that 90% of renters don't know they have",
      "The difference between a complaint and a legal demand — and why it matters",
      "How I helped 500 renters get their deposits back in 30 days",
      "Why landlords respond to formal letters and ignore texts",
      "California tenant rights checklist: 10 things you can do today",
      "Is your landlord breaking the law? Here are the signs",
      "The cheapest way to send a legally-binding demand letter"
    ]
  }'
) on conflict (key) do update set value = excluded.value;
