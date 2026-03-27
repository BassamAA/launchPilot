create extension if not exists "pgcrypto";

alter table sites add column if not exists public_tracking_key text;

update sites
set public_tracking_key = replace(gen_random_uuid()::text, '-', '')
where public_tracking_key is null;

alter table sites
  alter column public_tracking_key set default replace(gen_random_uuid()::text, '-', '');

create unique index if not exists sites_public_tracking_key_idx
  on sites(public_tracking_key);

create table if not exists tracked_links (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  content_item_id uuid references content_items(id) on delete cascade,
  experiment_id uuid references growth_experiments(id) on delete set null,
  destination_url text not null,
  short_code text not null unique,
  channel text not null check (channel in ('blog', 'twitter', 'reddit', 'email', 'tiktok', 'directory')),
  utm_source text not null default 'launchpilot',
  utm_medium text not null,
  utm_campaign text,
  utm_content text,
  click_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table tracked_links enable row level security;

create policy "Users can view tracked links for their sites"
  on tracked_links for select using (
    site_id in (
      select id from sites where company_id in (
        select company_id from user_profiles where id = auth.uid()
      )
    )
  );

create policy "Service role can insert tracked links"
  on tracked_links for insert with check (true);

create policy "Service role can update tracked links"
  on tracked_links for update using (true);

create index if not exists tracked_links_short_code_idx
  on tracked_links(short_code);

create index if not exists tracked_links_site_idx
  on tracked_links(site_id);

create index if not exists tracked_links_content_idx
  on tracked_links(content_item_id);

create table if not exists link_clicks (
  id uuid primary key default gen_random_uuid(),
  tracked_link_id uuid not null references tracked_links(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  visitor_hash text,
  referrer text,
  user_agent text,
  country text,
  clicked_at timestamptz not null default now()
);

alter table link_clicks enable row level security;

create policy "Users can view link clicks for their sites"
  on link_clicks for select using (
    site_id in (
      select id from sites where company_id in (
        select company_id from user_profiles where id = auth.uid()
      )
    )
  );

create policy "Service role can insert link clicks"
  on link_clicks for insert with check (true);

create index if not exists link_clicks_link_idx
  on link_clicks(tracked_link_id);

create index if not exists link_clicks_site_idx
  on link_clicks(site_id);

create index if not exists link_clicks_date_idx
  on link_clicks(clicked_at desc);

create table if not exists conversions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  tracked_link_id uuid references tracked_links(id) on delete set null,
  content_item_id uuid references content_items(id) on delete set null,
  experiment_id uuid references growth_experiments(id) on delete set null,
  channel text check (channel in ('blog', 'twitter', 'reddit', 'email', 'tiktok', 'directory')),
  event_type text not null default 'signup',
  visitor_hash text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  referrer text,
  metadata_json jsonb not null default '{}',
  converted_at timestamptz not null default now()
);

alter table conversions enable row level security;

create policy "Users can view conversions for their sites"
  on conversions for select using (
    site_id in (
      select id from sites where company_id in (
        select company_id from user_profiles where id = auth.uid()
      )
    )
  );

create policy "Service role can insert conversions"
  on conversions for insert with check (true);

create index if not exists conversions_site_idx
  on conversions(site_id);

create index if not exists conversions_channel_idx
  on conversions(channel);

create index if not exists conversions_content_idx
  on conversions(content_item_id);

create index if not exists conversions_date_idx
  on conversions(converted_at desc);
