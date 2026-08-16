// send-push — ручная отправка: { user_id, title, body, data }.
// Деплоится с --no-verify-jwt, доступ закрыт общим секретом x-push-secret.

import { sendPush, checkSecret, json } from '../_shared/push.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  if (!checkSecret(req)) return json({ error: 'forbidden' }, 403)

  let payload
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'bad json' }, 400)
  }

  const { user_id, title, body, data } = payload || {}
  if (!user_id || !body) return json({ error: 'user_id and body are required' }, 400)

  const res = await sendPush({ user_id, title, body, data })
  return json(res, res.ok ? 200 : 502)
})
