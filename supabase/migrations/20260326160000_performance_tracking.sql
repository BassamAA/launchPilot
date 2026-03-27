create extension if not exists "pgcrypto";

create table if not exists content_performance (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references content_items(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  channel text not null check (channel in ('blog', 'twitter', 'reddit', 'email', 'tiktok', 'directory')),
  metrics_json jsonb not null default '{}',
  fetched_at timestamptz not null default now()
);

alter table content_performance enable row level security;

create policy "Users can view content performance for their sites"
  on content_performance for select using (
    site_id in (
      select id from sites where company_id in (
        select company_id from user_profiles where id = auth.uid()
      )
    )
  );

create policy "Service role can insert content performance"
  on content_performance for insert with check (true);

create index if not exists content_performance_content_item_idx
  on content_performance(content_item_id);

create index if not exists content_performance_site_idx
  on content_performance(site_id);

create index if not exists content_performance_fetched_idx
  on content_performance(fetched_at desc);

alter table email_sends add column if not exists resend_message_id text;

create index if not exists email_sends_resend_message_idx
  on email_sends(resend_message_id);

create table if not exists page_views (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references content_items(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  visitor_hash text not null,
  referrer text,
  user_agent text,
  country text,
  viewed_at timestamptz not null default now()
);

alter table page_views enable row level security;

create policy "Users can view page views for their sites"
  on page_views for select using (
    site_id in (
      select id from sites where company_id in (
        select company_id from user_profiles where id = auth.uid()
      )
    )
  );

create policy "Anyone can insert page views"
  on page_views for insert with check (true);

create index if not exists page_views_content_idx
  on page_views(content_item_id);

create index if not exists page_views_site_idx
  on page_views(site_id);

create index if not exists page_views_viewed_at_idx
  on page_views(viewed_at desc);

create index if not exists page_views_visitor_content_idx
  on page_views(content_item_id, visitor_hash, viewed_at desc);
