-- Триггеры, вызывающие Edge Function push-on-insert.
--
-- Делает то же, что Database Webhooks из дашборда, но описано кодом: хук видно
-- в репозитории, и его можно пересоздать на другом проекте одной командой.
--
-- ПЕРЕД ЗАПУСКОМ: подставь значение PUSH_HOOK_SECRET (то же, что в secrets
-- Edge Functions) вместо ВСТАВЬ_СЕКРЕТ ниже.

-- 1. Исходящие HTTP-запросы из БД.
create extension if not exists pg_net;

-- 2. Триггерная функция.
-- SECURITY DEFINER обязателен: вставку делает обычный пользователь через
-- PostgREST, а права на net.http_post есть только у служебной роли.
create or replace function public.push_on_insert_hook()
returns trigger
language plpgsql
security definer
set search_path = public, net, extensions
as $$
declare
  rec jsonb;
begin
  rec := to_jsonb(new);

  -- К полям обращаемся через jsonb, а не как new.status / new.invited_user:
  -- одна функция обслуживает три таблицы с разным набором колонок, а PL/pgSQL
  -- резолвит поля записи при вычислении выражения целиком — проверка
  -- tg_table_name от ошибки «record new has no field» не спасает.
  --
  -- Отсекаем ненужные случаи здесь, чтобы не тратить HTTP-запрос. Edge Function
  -- проверяет то же самое ещё раз — на случай прямых вызовов.
  if tg_table_name = 'friendships' and rec->>'status' is distinct from 'pending' then
    return new;
  end if;
  if tg_table_name = 'habit_pairs' and rec->>'invited_user' is null then
    return new;
  end if;

  perform net.http_post(
    url := 'https://lxrrpmyysbkebpdocawu.supabase.co/functions/v1/push-on-insert',
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', tg_table_name,
      'schema', tg_table_schema,
      'record', rec
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', 'ВСТАВЬ_СЕКРЕТ'
    ),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

-- 3. Сами триггеры. drop перед create — чтобы файл можно было прогнать повторно.
drop trigger if exists push_nudges on public.nudges;
create trigger push_nudges
after insert on public.nudges
for each row execute function public.push_on_insert_hook();

drop trigger if exists push_friendships on public.friendships;
create trigger push_friendships
after insert on public.friendships
for each row execute function public.push_on_insert_hook();

drop trigger if exists push_pair_invites on public.habit_pairs;
create trigger push_pair_invites
after insert on public.habit_pairs
for each row execute function public.push_on_insert_hook();
