-- Удаление из друзей.
--
-- При создании таблицы friendships были заданы политики только на insert,
-- select и update. Без политики на delete строку не удалить: PostgREST вернёт
-- успех, но не удалит ничего — RLS просто не находит подходящих строк.
-- Клиент такой случай ловит (.select() после .delete() возвращает пустой
-- массив) и показывает ошибку вместо ложного «удалено».
--
-- Удалять может любой из двух участников: дружба симметрична, и тот, кого
-- добавили, должен иметь такое же право, как и тот, кто добавлял.

create policy "delete own friendships"
  on public.friendships
  for delete
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- Проверка: должно быть четыре строки — INSERT, SELECT, UPDATE, DELETE.
-- select policyname, cmd
-- from pg_policies
-- where schemaname = 'public' and tablename = 'friendships'
-- order by cmd;
