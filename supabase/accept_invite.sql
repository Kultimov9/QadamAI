-- RPC для приёма приглашения в парную привычку.
-- Запусти в Supabase → SQL Editor.
-- SECURITY DEFINER: принимающий обновляет чужую пару (ставит себя partner_id),
-- что под обычной RLS запрещено — поэтому функция выполняется с правами владельца.
-- Тексты ошибок ('code not found' / 'own code' / 'already taken') совпадают с
-- обработкой в приложении (mapAcceptError).

create or replace function public.accept_invite(code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pair public.habit_pairs%rowtype;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_pair
  from public.habit_pairs
  where invite_code = code
  limit 1;

  if not found then
    raise exception 'code not found';
  end if;

  if v_pair.creator_id = v_uid then
    raise exception 'own code';
  end if;

  if v_pair.partner_id is not null or v_pair.status <> 'pending' then
    raise exception 'already taken';
  end if;

  update public.habit_pairs
  set partner_id = v_uid,
      status = 'active'
  where id = v_pair.id;
end;
$$;

grant execute on function public.accept_invite(text) to authenticated;
