import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'
import { logEvent } from '../composables/useAnalytics'

const todayStr = () => new Date().toISOString().split('T')[0]
const iso = (d) => d.toISOString().split('T')[0]

// 8 символов A-Z0-9 для invite-кода.
function genCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

// Понятное сообщение об ошибке accept_invite. RPC может кидать разные тексты —
// матчим по ключевым словам; для нераспознанных показываем реальную причину.
function mapAcceptError(error) {
  const m = (error?.message || '').toLowerCase()
  // Функция не найдена / неверная сигнатура (частый кейс: параметр не `code`).
  if (error?.code === 'PGRST202' || m.includes('could not find the function') || m.includes('schema cache'))
    return 'Функция accept_invite не найдена. Проверь имя и параметр (должен быть code) в Supabase.'
  if (m.includes('not found') || m.includes('не найд') || m.includes('invalid') || m.includes('no rows'))
    return 'Код не найден'
  if (m.includes('own') || m.includes('self') || m.includes('свой') || m.includes('creator'))
    return 'Нельзя принять собственный код'
  if (m.includes('taken') || m.includes('already') || m.includes('занят') || m.includes('active') || m.includes('partner'))
    return 'Эта пара уже занята'
  // Нераспознанное — показываем реальный текст, чтобы было видно причину.
  return error?.message ? `Ошибка: ${error.message}` : 'Не удалось присоединиться. Проверь код.'
}

export const usePairsStore = defineStore('pairs', {
  state: () => ({
    pairs: [], // { ...habit_pair, completions: [{ pair_id, user_id, date }] }
    userId: null,
    // Код из deep-link (oyan://join/CODE), который надо принять при открытии «Привычек».
    pendingJoinCode: '',
  }),

  getters: {
    // Партнёр относительно текущего юзера (или null, пока пара pending).
    partnerId: (state) => (pair) =>
      pair.creator_id === state.userId ? pair.partner_id : pair.creator_id,

    myStatusToday: (state) => (pair) => {
      const today = todayStr()
      return (pair.completions || []).some((c) => c.user_id === state.userId && c.date === today)
    },

    partnerStatusToday() {
      return (pair) => {
        const pid = this.partnerId(pair)
        if (!pid) return false
        const today = todayStr()
        return (pair.completions || []).some((c) => c.user_id === pid && c.date === today)
      }
    },

    // Сколько дней подряд ОБА участника выполняли (заканчивая сегодня/вчера).
    pairStreak: () => (pair) => {
      if (!pair.partner_id) return 0
      const comps = pair.completions || []
      const bothOn = (ds) => {
        const c = comps.filter((x) => x.date === ds)
        return (
          c.some((x) => x.user_id === pair.creator_id) &&
          c.some((x) => x.user_id === pair.partner_id)
        )
      }
      const d = new Date()
      if (!bothOn(iso(d))) d.setDate(d.getDate() - 1) // сегодня может быть ещё не закрыт обоими
      let streak = 0
      while (bothOn(iso(d))) {
        streak++
        d.setDate(d.getDate() - 1)
      }
      return streak
    },
  },

  actions: {
    async fetchPairs() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      this.userId = user.id

      const { data: pairsData, error } = await supabase
        .from('habit_pairs')
        .select('*')
        .or(`creator_id.eq.${user.id},partner_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
      if (error) {
        console.log('fetchPairs error:', error)
        return
      }
      const pairs = pairsData || []

      let completions = []
      if (pairs.length) {
        const since = iso(new Date(Date.now() - 14 * 86400000))
        const { data: comp } = await supabase
          .from('pair_completions')
          .select('pair_id, user_id, date')
          .in(
            'pair_id',
            pairs.map((p) => p.id),
          )
          .gte('date', since)
        completions = comp || []
      }

      this.pairs = pairs.map((p) => ({
        ...p,
        completions: completions.filter((c) => c.pair_id === p.id),
      }))
    },

    async createPair(name, emoji, duration) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null

      const code = genCode()
      const { data, error } = await supabase
        .from('habit_pairs')
        .insert({
          habit_name: name,
          emoji,
          duration,
          creator_id: user.id,
          invite_code: code,
          status: 'pending',
        })
        .select()
        .single()
      if (error) {
        console.error('createPair error:', error)
        return null
      }
      this.userId = user.id
      this.pairs.unshift({ ...data, completions: [] })
      logEvent('pair_created', { pair_id: data.id, habit_name: name })
      return code
    },

    async acceptInvite(code) {
      const { error } = await supabase.rpc('accept_invite', { code })
      if (error) {
        console.error('accept_invite error:', error.code, error.message, error.details, error.hint)
        return { ok: false, error: mapAcceptError(error) }
      }
      await this.fetchPairs()
      logEvent('pair_joined', { code })
      return { ok: true }
    },

    async completePairToday(pairId) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const today = todayStr()
      const pair = this.pairs.find((p) => p.id === pairId)

      // Оптимистично отмечаем локально.
      if (pair && !pair.completions.some((c) => c.user_id === user.id && c.date === today)) {
        pair.completions.push({ pair_id: pairId, user_id: user.id, date: today })
      }

      const { error } = await supabase
        .from('pair_completions')
        .insert({ pair_id: pairId, user_id: user.id, date: today })
      // 23505 — нарушение unique(pair_id, user_id, date): уже отмечено сегодня, игнорируем.
      if (error && error.code !== '23505') {
        console.error('completePairToday error:', error)
        return
      }
      logEvent('pair_completed', { pair_id: pairId, habit_name: pair?.habit_name })
    },
  },
})
