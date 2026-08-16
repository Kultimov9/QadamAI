// push-on-insert — приёмник Database Webhooks на INSERT.
// Один эндпоинт на три таблицы: разбирает строку, достаёт ник и название
// привычки, складывает текст и отдаёт в sendPush.
// Деплоится с --no-verify-jwt, доступ закрыт заголовком x-push-secret.

import { admin, nickOf, sendPush, checkSecret, json } from '../_shared/push.ts'

type Hook = {
  type: string
  table: string
  schema: string
  record: Record<string, string | null>
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  if (!checkSecret(req)) return json({ error: 'forbidden' }, 403)

  let hook: Hook
  try {
    hook = await req.json()
  } catch {
    return json({ error: 'bad json' }, 400)
  }

  if (hook.type !== 'INSERT') return json({ skipped: 'not_insert' })
  const r = hook.record || {}
  const db = admin()

  let to: string | null = null
  let from: string | null = null
  let body = ''
  let screen = ''

  if (hook.table === 'nudges') {
    to = r.to_user
    from = r.from_user
    const { data: pair } = await db
      .from('habit_pairs')
      .select('habit_name')
      .eq('id', r.pair_id)
      .maybeSingle()
    body = `${await nickOf(db, from!)} зовёт сделать ${pair?.habit_name || 'привычку'} прямо сейчас`
    screen = 'pair'
  } else if (hook.table === 'friendships') {
    // Пуш только на новую заявку; accepted/declined приходят через update.
    if (r.status !== 'pending') return json({ skipped: 'not_pending' })
    to = r.addressee_id
    from = r.requester_id
    body = `${await nickOf(db, from!)} хочет добавить тебя в друзья`
    screen = 'friends'
  } else if (hook.table === 'habit_pairs') {
    // Пара без invited_user — это приглашение по коду, адресата ещё нет.
    if (!r.invited_user) return json({ skipped: 'no_invited_user' })
    to = r.invited_user
    from = r.creator_id
    body = `${await nickOf(db, from!)} зовёт делать ${r.habit_name || 'привычку'} вместе`
    screen = 'pair'
  } else {
    return json({ skipped: 'unknown_table', table: hook.table })
  }

  if (!to || !from) return json({ skipped: 'no_recipient' })
  // Самому себе не шлём (например, тест-вставка руками).
  if (to === from) return json({ skipped: 'self' })

  const res = await sendPush({
    user_id: to,
    body,
    data: { screen, from_user: from, table: hook.table, record_id: r.id },
  })

  return json(res, res.ok ? 200 : 502)
})
