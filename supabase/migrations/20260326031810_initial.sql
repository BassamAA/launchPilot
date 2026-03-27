-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Companies ────────────────────────────────────────────────────────
create table companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table companies enable row level security;

-- ─── User Profiles (extends Supabase auth.users) ────────────────────
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  name text,
  role text not null default 'owner' check (role in ('owner', 'admin', 'member')),
  avatar_url text,
  subscription_tier text not null default 'free_trial'
    check (subscription_tier in ('free_trial', 'starter', 'growth', 'agency')),
  trial_ends_at timestamptz,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_profiles enable row level security;

create policy "Users can view their own profile"
  on user_profiles for select using (auth.uid() = id);

create policy "Users can update their own profile"
  on user_profiles for update using (auth.uid() = id);

-- ─── Sites ────────────────────────────────────────────────────────────
create table sites (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  url text not null,
  name text not null default '',
  status text not null default 'analyzing'
    check (status in ('analyzing', 'active', 'error', 'paused')),
  brief_json jsonb,
  brief_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table sites enable row level security;

create policy "Users can see their company's sites"
  on sites for all using (
    company_id in (
      select company_id from user_profiles where id = auth.uid()
    )
  );

-- ─── Marketing Plans ──────────────────────────────────────────────────
create table marketing_plans (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  month integer not null check (month between 1 and 12),
  year integer not null,
  strategy_json jsonb,
  status text not null default 'generating'
    check (status in ('generating', 'active', 'completed', 'paused')),
  created_at timestamptz not null default now()
);

alter table marketing_plans enable row level security;

create policy "Users can manage plans for their sites"
  on marketing_plans for all using (
    site_id in (
      select id from sites where company_id in (
        select company_id from user_profiles where id = auth.uid()
      )
    )
  );

-- ─── Content Items ────────────────────────────────────────────────────
create table content_items (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  plan_id uuid references marketing_plans(id) on delete set null,
  channel text not null check (channel in ('blog', 'twitter', 'reddit', 'email', 'tiktok', 'directory')),
  content_type text not null,
  title text not null default '',
  body text not null default '',
  metadata_json jsonb not null default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'published', 'rejected', 'failed')),
  scheduled_date date,
  published_date timestamptz,
  published_url text,
  auto_executable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table content_items enable row level security;

create policy "Users can manage content for their sites"
  on content_items for all using (
    site_id in (
      select id from sites where company_id in (
        select company_id from user_profiles where id = auth.uid()
      )
    )
  );

-- Index for common queries
create index content_items_site_status_idx on content_items(site_id, status);
create index content_items_plan_idx on content_items(plan_id);
create index content_items_scheduled_idx on content_items(scheduled_date);

-- ─── Directories ──────────────────────────────────────────────────────
create table directories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  url text not null,
  category text not null default 'general',
  submission_format_json jsonb not null default '{}'
);

alter table directories enable row level security;

create policy "Everyone can view directories"
  on directories for select using (true);

-- ─── Directory Submissions ────────────────────────────────────────────
create table directory_submissions (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  directory_id uuid references directories(id),
  status text not null default 'pending'
    check (status in ('pending', 'submitted', 'live', 'rejected')),
  submitted_date timestamptz,
  listing_url text
);

alter table directory_submissions enable row level security;

create policy "Users can manage their submissions"
  on directory_submissions for all using (
    site_id in (
      select id from sites where company_id in (
        select company_id from user_profiles where id = auth.uid()
      )
    )
  );

-- ─── Activity Log ─────────────────────────────────────────────────────
create table activity_log (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  action text not null,
  description text not null default '',
  metadata_json jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table activity_log enable row level security;

create policy "Users can view their site's activity"
  on activity_log for select using (
    site_id in (
      select id from sites where company_id in (
        select company_id from user_profiles where id = auth.uid()
      )
    )
  );

create policy "Service role can insert activity"
  on activity_log for insert with check (true);

create index activity_log_site_idx on activity_log(site_id, created_at desc);

-- ─── Trigger: updated_at ──────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_sites
  before update on sites
  for each row execute procedure set_updated_at();

create trigger set_updated_at_user_profiles
  before update on user_profiles
  for each row execute procedure set_updated_at();

create trigger set_updated_at_content_items
  before update on content_items
  for each row execute procedure set_updated_at();

-- ─── Seed: directory list ─────────────────────────────────────────────
insert into directories (name, url, category, submission_format_json) values
  ('Product Hunt', 'https://producthunt.com', 'marketplace', '{"max_title_length": 60, "max_description_length": 260, "requires_tagline": true, "requires_pricing": false}'),
  ('Indie Hackers', 'https://indiehackers.com', 'community', '{"max_title_length": 80, "max_description_length": 500, "requires_tagline": false, "requires_pricing": false}'),
  ('BetaList', 'https://betalist.com', 'early_access', '{"max_title_length": 60, "max_description_length": 300, "requires_tagline": true, "requires_pricing": false}'),
  ('Hacker News', 'https://news.ycombinator.com', 'community', '{"max_title_length": 80, "max_description_length": 0, "requires_tagline": false, "requires_pricing": false}'),
  ('AlternativeTo', 'https://alternativeto.net', 'alternatives', '{"max_title_length": 60, "max_description_length": 400, "requires_tagline": false, "requires_pricing": true}'),
  ('SaaSHub', 'https://saashub.com', 'saas_directory', '{"max_title_length": 60, "max_description_length": 350, "requires_tagline": true, "requires_pricing": true}'),
  ('ToolPilot', 'https://toolpilot.ai', 'ai_tools', '{"max_title_length": 60, "max_description_length": 300, "requires_tagline": true, "requires_pricing": false}'),
  ('Peerlist', 'https://peerlist.io', 'developer', '{"max_title_length": 60, "max_description_length": 250, "requires_tagline": true, "requires_pricing": false}');
