alter table public.sites
  add column if not exists business_profile_json jsonb not null default '{}';
