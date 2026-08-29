-- Механизм возвращения: AI замечает заброшенные привычки и зовёт вернуться.
-- Запусти целиком в SQL Editor.

-- 1. У habits может не быть created_at (вставка его не задаёт), а без него
--    не проверить условие «привычка существует дольше 3 дней».
alter table public.habits add column if not exists created_at timestamptz not null default now();

-- 2. Журнал отправок. По нему считаются ВСЕ ограничения частоты, поэтому
--    строка пишется на каждый отправленный пуш, без исключений.
create table if not exists public.reengagement_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid,
  sent_at timestamptz not null default now(),
  opened boolean not null default false
);

-- Основной запрос функции: последние отправки конкретного юзера.
create index if not exists reengagement_log_user_sent_idx
  on public.reengagement_log (user_id, sent_at desc);

alter table public.reengagement_log enable row level security;

-- Юзеру нужно только читать свои строки и отмечать opened при тапе по пушу.
-- Вставляет строки Edge Function под service-ролью — её RLS не ограничивает.
drop policy if exists "own reengagement select" on public.reengagement_log;
create policy "own reengagement select"
  on public.reengagement_log
  for select
  using (user_id = auth.uid());

drop policy if exists "own reengagement update" on public.reengagement_log;
create policy "own reengagement update"
  on public.reengagement_log
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 3. Расписание: ежедневно 14:00 UTC = 19:00 UTC+5.
--    Окно 10:00–21:00 из ТЗ при таком расписании соблюдается само, но функция
--    проверяет его ещё раз — на случай смены расписания.
create extension if not exists pg_cron;

-- Перед первым запуском подставь PUSH_HOOK_SECRET (тот же, что у пушей).
select cron.unschedule('reengage-daily')
where exists (select 1 from cron.job where jobname = 'reengage-daily');

select cron.schedule(
  'reengage-daily',
  '0 14 * * *',
  $$
  select net.http_post(
    url := 'https://lxrrpmyysbkebpdocawu.supabase.co/functions/v1/reengage',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', 'ВСТАВЬ_СЕКРЕТ'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- Проверка расписания:
-- select jobname, schedule, active from cron.job;
-- Последние запуски:
-- select jobname, status, return_message, start_time
-- from cron.job_run_details order by start_time desc limit 5;
