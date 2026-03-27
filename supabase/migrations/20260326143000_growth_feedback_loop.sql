create extension if not exists "pgcrypto";

create table if not exists growth_experiments (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  hypothesis text not null,
  target_channel text check (target_channel in ('blog', 'twitter', 'reddit', 'email', 'tiktok', 'directory')),
  success_metric text not null,
  status text not null default 'active'
    check (status in ('active', 'won', 'lost', 'paused')),
  confidence integer not null default 50 check (confidence between 0 and 100),
  rationale text,
  next_action text,
  source text not null default 'launchpilot_seed',
  metadata_json jsonb not null default '{}',
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table growth_experiments enable row level security;

create policy "Users can manage growth experiments for their sites"
  on growth_experiments for all using (
    site_id in (
      select id from sites where company_id in (
        select company_id from user_profiles where id = auth.uid()
      )
    )
  );

create trigger set_updated_at_growth_experiments
  before update on growth_experiments
  for each row execute procedure set_updated_at();

create table if not exists growth_signals (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  content_item_id uuid references content_items(id) on delete set null,
  experiment_id uuid references growth_experiments(id) on delete set null,
  channel text check (channel in ('blog', 'twitter', 'reddit', 'email', 'tiktok', 'directory')),
  signal_type text not null,
  metric_name text not null,
  metric_value numeric not null default 1,
  source text not null default 'runtime',
  metadata_json jsonb not null default '{}',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table growth_signals enable row level security;

create policy "Users can view growth signals for their sites"
  on growth_signals for select using (
    site_id in (
      select id from sites where company_id in (
        select company_id from user_profiles where id = auth.uid()
      )
    )
  );

create policy "Service role can insert growth signals"
  on growth_signals for insert with check (true);

create index if not exists growth_experiments_site_status_idx
  on growth_experiments(site_id, status, confidence desc);

create index if not exists growth_signals_site_occurred_idx
  on growth_signals(site_id, occurred_at desc);

create index if not exists growth_signals_site_channel_idx
  on growth_signals(site_id, channel, occurred_at desc);
