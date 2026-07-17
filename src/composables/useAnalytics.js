import { supabase } from '../lib/supabase'

// Логирование действий пользователя для аналитики (таблица events).
// Fire-and-forget: не блокирует UI и никогда не бросает ошибку наверх —
// аналитика не должна влиять на работу приложения.
//
// В payload кладём только минимальный неперсональный контекст (id, название
// привычки, дата и т.п.). Текст задач, заметки рефлексии и содержимое
// AI-сообщений НЕ логируем.
export function logEvent(type, payload = {}) {
  // Не ждём результат — вызывающий код продолжает работать сразу.
  ;(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (!userId) return
      await supabase.from('events').insert({ user_id: userId, type, payload })
    } catch (e) {
      if (import.meta.env.DEV) console.log('logEvent error:', e)
    }
  })()
}
