create extension if not exists "pgcrypto";

alter table content_items
  add column if not exists variant_group text,
  add column if not exists variant_label text
    check (variant_label in ('A_exploit', 'B_explore'));

create index if not exists content_items_variant_group_idx
  on content_items(variant_group);

create table if not exists content_tags (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references content_items(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  tag_category text not null
    check (tag_category in (
      'hook_type',
      'cta_type',
      'tone',
      'format',
      'topic_angle',
      'includes_price',
      'includes_social_proof',
      'content_length'
    )),
  tag_value text not null,
  confidence numeric(3,2) not null default 1.0,
  created_at timestamptz not null default now()
);

alter table content_tags enable row level security;

create policy "Users can view own site content tags"
  on content_tags for select using (
    site_id in (
      select id from sites where company_id in (
        select company_id from user_profiles where id = auth.uid()
      )
    )
  );

create policy "Service role can manage content tags"
  on content_tags for all using (true) with check (true);

create index if not exists content_tags_content_idx
  on content_tags(content_item_id);

create index if not exists content_tags_site_idx
  on content_tags(site_id);

create index if not exists content_tags_category_idx
  on content_tags(tag_category);

create index if not exists content_tags_value_idx
  on content_tags(tag_value);

create table if not exists content_pattern_snapshots (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  snapshot_json jsonb not null default '{}',
  sample_size integer not null default 0,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz not null default now()
);

alter table content_pattern_snapshots enable row level security;

create policy "Users can view own site pattern snapshots"
  on content_pattern_snapshots for select using (
    site_id in (
      select id from sites where company_id in (
        select company_id from user_profiles where id = auth.uid()
      )
    )
  );

create policy "Service role can manage pattern snapshots"
  on content_pattern_snapshots for all using (true) with check (true);

create index if not exists content_pattern_snapshots_site_idx
  on content_pattern_snapshots(site_id);

create index if not exists content_pattern_snapshots_date_idx
  on content_pattern_snapshots(created_at desc);
