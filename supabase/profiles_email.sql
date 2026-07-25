-- Колонка email в profiles — чтобы в админке видеть, какой user_id какой почте
-- соответствует. Заполняется приложением при загрузке (store.fetchAll).
-- Почта и так есть в auth.users; это просто удобная копия рядом с профилем.
-- Запусти в Supabase → SQL Editor.

alter table public.profiles add column if not exists email text;
