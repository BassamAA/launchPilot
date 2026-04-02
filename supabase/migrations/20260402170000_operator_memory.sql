-- Operator memory + proactive messages foundation

create table if not exists public.operator_threads (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  surface text not null default 'web_chat',
  external_thread_id text,
  title text,
  status text not null default 'active',
  metadata_json jsonb not null default '{}'::jsonb,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_operator_threads_site_id on public.operator_threads(site_id);
create index if not exists idx_operator_threads_surface on public.operator_threads(surface);

create table if not exists public.operator_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.operator_threads(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  role text not null,
  surface text not null default 'web_chat',
  message_type text not null default 'chat',
  body text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_operator_messages_thread_id on public.operator_messages(thread_id);
create index if not exists idx_operator_messages_site_id on public.operator_messages(site_id);
create index if not exists idx_operator_messages_created_at on public.operator_messages(created_at desc);

create table if not exists public.operator_memory (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  memory_type text not null,
  key text not null,
  value_text text,
  value_json jsonb,
  confidence numeric not null default 1.0,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(site_id, memory_type, key)
);

create index if not exists idx_operator_memory_site_id on public.operator_memory(site_id);
create index if not exists idx_operator_memory_type on public.operator_memory(memory_type);

create table if not exists public.operator_outbox (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  thread_id uuid references public.operator_threads(id) on delete set null,
  surface text not null,
  kind text not null,
  title text,
  body text not null,
  action_json jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  scheduled_for timestamptz,
  sent_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_operator_outbox_site_id on public.operator_outbox(site_id);
create index if not exists idx_operator_outbox_status on public.operator_outbox(status);
create index if not exists idx_operator_outbox_surface on public.operator_outbox(surface);
