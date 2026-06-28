import { supabase } from './supabase'
import { App } from '@capacitor/app'

// Антидребезг: возврат из фона считается новым «заходом» только если прошло > 5 минут.
const RESUME_THRESHOLD_MS = 5 * 60 * 1000
let lastOpenAt = Date.now()

// Логирует один вход/открытие приложения в таблицу login_events.
// Используется для аналитики в админке (сколько раз в день заходит каждый юзер).
// Устойчиво: если таблицы ещё нет или вставку отклонил RLS — просто молчим,
// приложение не должно падать из-за аналитики.
// Любой залогированный вход сбрасывает таймер антидребезга.
export async function logLoginEvent() {
  lastOpenAt = Date.now()
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('login_events').insert({ user_id: user.id })
  } catch (e) {
    console.log('login event error:', e)
  }
}

function maybeLogResume() {
  if (Date.now() - lastOpenAt > RESUME_THRESHOLD_MS) {
    logLoginEvent() // сам обновит lastOpenAt
  }
}

// Считает возврат приложения на передний план как новый заход (с антидребезгом).
// Вызывать один раз при старте приложения.
let resumeTrackingStarted = false
export function setupResumeTracking() {
  if (resumeTrackingStarted) return
  resumeTrackingStarted = true

  // iOS / Android (Capacitor): приложение вернулось из фона на передний план.
  App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) maybeLogResume()
  })

  // Веб / PWA fallback: вкладка снова стала видимой.
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') maybeLogResume()
    })
  }
}
