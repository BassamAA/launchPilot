create extension if not exists pgcrypto;

alter table public.growth_surfaces
  add column if not exists objective text,
  add column if not exists readiness_reason text,
  add column if not exists execution_owner text not null default 'launchpilot'
    check (execution_owner in ('launchpilot', 'human', 'hybrid')),
  add column if not exists last_reviewed_at timestamptz;

create table if not exists public.activation_definitions (
  id uuid default gen_random_uuid() primary key,
  site_id uuid references public.sites(id) on delete cascade not null,
  event_key text not null,
  display_name text not null,
  description text,
  weight integer not null default 1,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  metadata_json jsonb not null default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(site_id, event_key)
);

alter table public.activation_definitions enable row level security;

create policy "Users can view own site activation definitions"
  on public.activation_definitions for select
  using (site_id in (
    select s.id from public.sites s
    join public.companies c on s.company_id = c.id
    join public.user_profiles up on up.company_id = c.id
    where up.id = auth.uid()
  ));

create policy "Users can manage own site activation definitions"
  on public.activation_definitions for all
  using (site_id in (
    select s.id from public.sites s
    join public.companies c on s.company_id = c.id
    join public.user_profiles up on up.company_id = c.id
    where up.id = auth.uid()
  ));

create index if not exists activation_definitions_site_idx
  on public.activation_definitions(site_id);

drop trigger if exists set_updated_at_activation_definitions on public.activation_definitions;
create trigger set_updated_at_activation_definitions
  before update on public.activation_definitions
  for each row execute procedure public.set_updated_at();

insert into public.activation_definitions (site_id, event_key, display_name, description, weight, is_primary)
select s.id, defs.event_key, defs.display_name, defs.description, defs.weight, defs.is_primary
from public.sites s
cross join (
  values
    ('signup', 'Signup', 'A tracked signup or account creation.', 10, true),
    ('onboarding_complete', 'Onboarding Complete', 'The user completed the onboarding flow.', 20, false),
    ('activated', 'Activated', 'The user hit the key activation milestone.', 35, false),
    ('subscribed', 'Subscribed', 'The user became a paying customer.', 60, false)
) as defs(event_key, display_name, description, weight, is_primary)
on conflict (site_id, event_key) do nothing;

create table if not exists public.product_events (
  id uuid default gen_random_uuid() primary key,
  site_id uuid references public.sites(id) on delete cascade not null,
  tracked_link_id uuid references public.tracked_links(id) on delete set null,
  content_item_id uuid references public.content_items(id) on delete set null,
  experiment_id uuid references public.growth_experiments(id) on delete set null,
  surface_type text,
  channel text,
  event_type text not null,
  event_value numeric not null default 1,
  currency text,
  visitor_hash text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  referrer text,
  metadata_json jsonb not null default '{}',
  occurred_at timestamptz default now() not null,
  created_at timestamptz default now() not null
);

alter table public.product_events enable row level security;

create policy "Users can view own site product events"
  on public.product_events for select
  using (site_id in (
    select s.id from public.sites s
    join public.companies c on s.company_id = c.id
    join public.user_profiles up on up.company_id = c.id
    where up.id = auth.uid()
  ));

create index if not exists product_events_site_idx
  on public.product_events(site_id);

create index if not exists product_events_site_event_idx
  on public.product_events(site_id, event_type);

create index if not exists product_events_site_occurred_idx
  on public.product_events(site_id, occurred_at desc);

create index if not exists product_events_tracked_link_idx
  on public.product_events(tracked_link_id);

create table if not exists public.partner_targets (
  id uuid default gen_random_uuid() primary key,
  site_id uuid references public.sites(id) on delete cascade not null,
  surface_id uuid references public.growth_surfaces(id) on delete set null,
  platform text not null,
  handle text,
  profile_url text,
  audience_fit text,
  content_fit text,
  estimated_reach_band text,
  fit_score integer not null default 50 check (fit_score between 0 and 100),
  rationale text,
  recommended_compensation text,
  outreach_status text not null default 'suggested'
    check (outreach_status in ('suggested', 'contacted', 'responded', 'won', 'lost', 'archived')),
  metadata_json jsonb not null default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.partner_targets enable row level security;

create policy "Users can view own site partner targets"
  on public.partner_targets for select
  using (site_id in (
    select s.id from public.sites s
    join public.companies c on s.company_id = c.id
    join public.user_profiles up on up.company_id = c.id
    where up.id = auth.uid()
  ));

create policy "Users can manage own site partner targets"
  on public.partner_targets for all
  using (site_id in (
    select s.id from public.sites s
    join public.companies c on s.company_id = c.id
    join public.user_profiles up on up.company_id = c.id
    where up.id = auth.uid()
  ));

create index if not exists partner_targets_site_idx
  on public.partner_targets(site_id);

drop trigger if exists set_updated_at_partner_targets on public.partner_targets;
create trigger set_updated_at_partner_targets
  before update on public.partner_targets
  for each row execute procedure public.set_updated_at();

create table if not exists public.partner_campaigns (
  id uuid default gen_random_uuid() primary key,
  site_id uuid references public.sites(id) on delete cascade not null,
  partner_target_id uuid references public.partner_targets(id) on delete cascade not null,
  campaign_angle text not null,
  content_concept text not null,
  cta text,
  landing_page_recommendation text,
  status text not null default 'draft'
    check (status in ('draft', 'ready', 'active', 'done', 'archived')),
  metadata_json jsonb not null default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.partner_campaigns enable row level security;

create policy "Users can view own site partner campaigns"
  on public.partner_campaigns for select
  using (site_id in (
    select s.id from public.sites s
    join public.companies c on s.company_id = c.id
    join public.user_profiles up on up.company_id = c.id
    where up.id = auth.uid()
  ));

create policy "Users can manage own site partner campaigns"
  on public.partner_campaigns for all
  using (site_id in (
    select s.id from public.sites s
    join public.companies c on s.company_id = c.id
    join public.user_profiles up on up.company_id = c.id
    where up.id = auth.uid()
  ));

create index if not exists partner_campaigns_site_idx
  on public.partner_campaigns(site_id);

drop trigger if exists set_updated_at_partner_campaigns on public.partner_campaigns;
create trigger set_updated_at_partner_campaigns
  before update on public.partner_campaigns
  for each row execute procedure public.set_updated_at();

create table if not exists public.partner_briefs (
  id uuid default gen_random_uuid() primary key,
  site_id uuid references public.sites(id) on delete cascade not null,
  partner_target_id uuid references public.partner_targets(id) on delete cascade not null,
  partner_campaign_id uuid references public.partner_campaigns(id) on delete cascade not null,
  outreach_message text,
  creator_brief text,
  copy_export text,
  metadata_json jsonb not null default '{}',
  created_at timestamptz default now() not null
);

alter table public.partner_briefs enable row level security;

create policy "Users can view own site partner briefs"
  on public.partner_briefs for select
  using (site_id in (
    select s.id from public.sites s
    join public.companies c on s.company_id = c.id
    join public.user_profiles up on up.company_id = c.id
    where up.id = auth.uid()
  ));

create policy "Users can manage own site partner briefs"
  on public.partner_briefs for all
  using (site_id in (
    select s.id from public.sites s
    join public.companies c on s.company_id = c.id
    join public.user_profiles up on up.company_id = c.id
    where up.id = auth.uid()
  ));

create index if not exists partner_briefs_site_idx
  on public.partner_briefs(site_id);

create table if not exists public.funnel_recommendations (
  id uuid default gen_random_uuid() primary key,
  site_id uuid references public.sites(id) on delete cascade not null,
  category text not null,
  title text not null,
  recommendation text not null,
  priority integer not null default 1,
  rationale text,
  status text not null default 'open'
    check (status in ('open', 'accepted', 'done', 'dismissed')),
  metadata_json jsonb not null default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.funnel_recommendations enable row level security;

create policy "Users can view own site funnel recommendations"
  on public.funnel_recommendations for select
  using (site_id in (
    select s.id from public.sites s
    join public.companies c on s.company_id = c.id
    join public.user_profiles up on up.company_id = c.id
    where up.id = auth.uid()
  ));

create policy "Users can manage own site funnel recommendations"
  on public.funnel_recommendations for all
  using (site_id in (
    select s.id from public.sites s
    join public.companies c on s.company_id = c.id
    join public.user_profiles up on up.company_id = c.id
    where up.id = auth.uid()
  ));

create index if not exists funnel_recommendations_site_idx
  on public.funnel_recommendations(site_id);

drop trigger if exists set_updated_at_funnel_recommendations on public.funnel_recommendations;
create trigger set_updated_at_funnel_recommendations
  before update on public.funnel_recommendations
  for each row execute procedure public.set_updated_at();

create table if not exists public.offer_tests (
  id uuid default gen_random_uuid() primary key,
  site_id uuid references public.sites(id) on delete cascade not null,
  hypothesis text not null,
  test_type text not null,
  proposed_change text not null,
  success_metric text not null,
  status text not null default 'proposed'
    check (status in ('proposed', 'active', 'won', 'lost', 'paused')),
  metadata_json jsonb not null default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.offer_tests enable row level security;

create policy "Users can view own site offer tests"
  on public.offer_tests for select
  using (site_id in (
    select s.id from public.sites s
    join public.companies c on s.company_id = c.id
    join public.user_profiles up on up.company_id = c.id
    where up.id = auth.uid()
  ));

create policy "Users can manage own site offer tests"
  on public.offer_tests for all
  using (site_id in (
    select s.id from public.sites s
    join public.companies c on s.company_id = c.id
    join public.user_profiles up on up.company_id = c.id
    where up.id = auth.uid()
  ));

create index if not exists offer_tests_site_idx
  on public.offer_tests(site_id);

drop trigger if exists set_updated_at_offer_tests on public.offer_tests;
create trigger set_updated_at_offer_tests
  before update on public.offer_tests
  for each row execute procedure public.set_updated_at();
