alter table sites
  add column if not exists source_type text not null default 'website',
  add column if not exists sources_json jsonb not null default '{}';

create table if not exists growth_surfaces (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  surface_type text not null,
  display_name text not null,
  status text not null default 'recommended'
    check (status in ('recommended', 'active', 'paused', 'not_applicable')),
  priority integer not null default 0,
  rationale text,
  execution_ready boolean not null default false,
  channels text[] not null default '{}',
  metadata_json jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table growth_surfaces enable row level security;

create policy "Users can view own site growth surfaces"
  on growth_surfaces for select using (
    site_id in (
      select id from sites where company_id in (
        select company_id from user_profiles where id = auth.uid()
      )
    )
  );

create policy "Users can manage own site growth surfaces"
  on growth_surfaces for all using (
    site_id in (
      select id from sites where company_id in (
        select company_id from user_profiles where id = auth.uid()
      )
    )
  ) with check (
    site_id in (
      select id from sites where company_id in (
        select company_id from user_profiles where id = auth.uid()
      )
    )
  );

create index if not exists growth_surfaces_site_idx
  on growth_surfaces(site_id);

create index if not exists growth_surfaces_type_idx
  on growth_surfaces(surface_type);

create index if not exists growth_surfaces_status_idx
  on growth_surfaces(status);

drop trigger if exists set_updated_at_growth_surfaces on growth_surfaces;
create trigger set_updated_at_growth_surfaces
  before update on growth_surfaces
  for each row execute procedure set_updated_at();
