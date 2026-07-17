-- Таблица аналитики действий пользователя. Одна строка на событие.
-- Запусти в Supabase → SQL Editor.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_user_created_idx on public.events (user_id, created_at);
create index if not exists events_type_idx on public.events (type);

-- RLS: пользователь может вставлять и читать только свои события.
-- Админка/аналитика читает всё через service-role ключ (RLS его не ограничивает).
alter table public.events enable row level security;

drop policy if exists "users insert own events" on public.events;
create policy "users insert own events"
  on public.events for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users read own events" on public.events;
create policy "users read own events"
  on public.events for select to authenticated
  using (auth.uid() = user_id);
