alter table sites add column if not exists slug text;

update sites
set slug = lower(
  regexp_replace(
    coalesce(
      nullif(name, ''),
      split_part(regexp_replace(url, '^https?://', ''), '/', 1),
      'site'
    ),
    '[^a-zA-Z0-9]+',
    '-',
    'g'
  )
) || '-' || substr(id::text, 1, 6)
where slug is null;

alter table sites alter column slug set not null;
create unique index if not exists sites_slug_idx on sites(slug);

create table if not exists platform_connections (
  id uuid primary key default uuid_generate_v4(),
  site_id uuid not null references sites(id) on delete cascade,
  platform text not null check (platform in ('twitter', 'email', 'blog_external')),
  access_token_encrypted text,
  refresh_token_encrypted text,
  platform_user_id text,
  platform_username text,
  metadata_json jsonb not null default '{}',
  connected_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, platform)
);

alter table platform_connections enable row level security;

create policy "Users can manage platform connections for their sites"
  on platform_connections for all using (
    site_id in (
      select id from sites where company_id in (
        select company_id from user_profiles where id = auth.uid()
      )
    )
  );

create trigger set_updated_at_platform_connections
  before update on platform_connections
  for each row execute procedure set_updated_at();

create table if not exists email_sends (
  id uuid primary key default uuid_generate_v4(),
  content_item_id uuid not null references content_items(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  recipient_email text not null,
  recipient_name text,
  recipient_company text,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  metadata_json jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table email_sends enable row level security;

create policy "Users can manage email sends for their sites"
  on email_sends for all using (
    site_id in (
      select id from sites where company_id in (
        select company_id from user_profiles where id = auth.uid()
      )
    )
  );

create trigger set_updated_at_email_sends
  before update on email_sends
  for each row execute procedure set_updated_at();

create index if not exists platform_connections_site_platform_idx
  on platform_connections(site_id, platform);

create index if not exists email_sends_content_item_idx
  on email_sends(content_item_id);

create index if not exists email_sends_site_status_idx
  on email_sends(site_id, status);
