-- Просмотр профиля друга с его привычками и результатами.
-- Запусти целиком в SQL Editor.

-- 1. Видимость привычки для друзей. По умолчанию всё закрыто.
alter table public.habits add column if not exists is_public boolean not null default false;

-- 2. Профиль друга одним запросом.
--
-- security definer: функция читает чужие строки (habits друга, profiles,
-- auth.users), к которым у вызывающего нет доступа по RLS. Поэтому наружу
-- отдаём строго перечисленные поля — ни почты, ни задач, ни целей, ни
-- рефлексий, ни списка других друзей здесь нет.
create or replace function public.get_friend_profile(friend_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  is_friend boolean;
  res jsonb;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;

  -- Дружба симметрична, поэтому проверяем обе стороны.
  select exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = me and f.addressee_id = friend_id)
        or (f.requester_id = friend_id and f.addressee_id = me)
      )
  ) into is_friend;

  if not is_friend then
    raise exception 'not friends';
  end if;

  with pub as (
    select h.id, h.name, h.emoji, h.duration, h.streak, h.completed_dates
    from public.habits h
    where h.user_id = friend_id
      and h.is_public
  ),
  -- Все дни выполнения публичных привычек, по одному разу на привычку и дату.
  days as (
    select distinct p.id, d::date as day
    from pub p, unnest(p.completed_dates) as d
  ),
  -- Разметка серий: у подряд идущих дней разница «дата минус номер строки»
  -- постоянна, по ней и группируем.
  islands as (
    select id, day - (row_number() over (partition by id order by day))::int as grp
    from days
  ),
  runs as (
    select id, grp, count(*) as len
    from islands
    group by id, grp
  )
  select jsonb_build_object(
    'username', (select pr.username from public.profiles pr where pr.id = friend_id),
    'avatar_url', (select pr.avatar_url from public.profiles pr where pr.id = friend_id),
    'joined_at', (select u.created_at from auth.users u where u.id = friend_id),

    'stats', jsonb_build_object(
      'total_completions', (select count(*) from days),
      'best_streak', (select coalesce(max(len), 0) from runs),
      'active_days_30', (
        select count(distinct day) from days where day >= current_date - 29
      )
    ),

    'habits', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'name', p.name,
          'emoji', p.emoji,
          'duration', p.duration,
          'streak', p.streak,
          -- Только последние 30 дней: остальная история на экране не нужна.
          'completed_dates', coalesce((
            select jsonb_agg(d order by d)
            from unnest(p.completed_dates) as d
            where d::date >= current_date - 29
          ), '[]'::jsonb)
        )
        order by p.name
      )
      from pub p
    ), '[]'::jsonb),

    -- Парные привычки с этим другом видны всегда: обе стороны и так участники.
    'pairs', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', hp.id,
          'habit_name', hp.habit_name,
          'emoji', hp.emoji,
          'status', hp.status,
          'completions', coalesce((
            select jsonb_agg(jsonb_build_object('user_id', c.user_id, 'date', c.date))
            from public.pair_completions c
            where c.pair_id = hp.id
              and c.date >= current_date - 29
          ), '[]'::jsonb)
        )
      )
      from public.habit_pairs hp
      where hp.status = 'active'
        and (
          (hp.creator_id = me and hp.partner_id = friend_id)
          or (hp.creator_id = friend_id and hp.partner_id = me)
        )
    ), '[]'::jsonb)
  ) into res;

  return res;
end;
$$;

grant execute on function public.get_friend_profile(uuid) to authenticated;

-- Проверка (подставь id друга):
-- select public.get_friend_profile('...');
