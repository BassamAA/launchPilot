alter table public.sites
  add column if not exists is_system_site boolean not null default false;

alter table public.sites
  add column if not exists onboarding_json jsonb not null default '{}';

create index if not exists idx_sites_system_site
  on public.sites(is_system_site)
  where is_system_site = true;
