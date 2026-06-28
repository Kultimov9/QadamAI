-- Таблица для аналитики входов: одна строка на каждый вход/открытие приложения.
-- Запусти в Supabase → SQL Editor (если ещё не создавал на первом шаге).

create table if not exists public.login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Быстрая выборка по юзеру и дате для агента аналитики.
create index if not exists login_events_user_created_idx
  on public.login_events (user_id, created_at);

-- RLS: пользователь может вставлять только свои события.
-- Админка читает всё через service-role ключ (RLS его не ограничивает).
alter table public.login_events enable row level security;

drop policy if exists "users insert own login events" on public.login_events;
create policy "users insert own login events"
  on public.login_events
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users read own login events" on public.login_events;
create policy "users read own login events"
  on public.login_events
  for select
  to authenticated
  using (auth.uid() = user_id);
