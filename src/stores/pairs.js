import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'
import { logEvent } from '../composables/useAnalytics'

const todayStr = () => new Date().toISOString().split('T')[0]
const iso = (d) => d.toISOString().split('T')[0]
const NUDGE_COOLDOWN_MS = 2 * 60 * 60 * 1000 // не чаще 1 раза в 2 часа на пару

// Realtime-каналы живут вне state (не сериализуются).
let nudgeChannel = null
let inviteChannel = null
// Схлопывает параллельные fetchPairs (переход между экранами + realtime).
let fetchPromise = null

// Код приглашения: 8 символов A-Z0-9 (без спецсимволов и регистра — безопасно
// для ссылок и парсинга). Если у колонки invite_code есть своя генерация в БД —
// вернём фактический код из ответа (data.invite_code).
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
    pairs: [], // { ...habit_pair, completions: [{ pair_id, user_id, date, created_at }] }
    userId: null,
    partnerNames: {}, // { [user_id]: { username, avatar_url } }
    myLastNudge: {}, // { [pair_id]: created_at(ms) } — последний мой nudge по паре
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

    // Имя друга (или «Друг», если профиль недоступен/без ника).
    partnerName() {
      return (pair) => {
        const pid = this.partnerId(pair)
        return this.partnerNames[pid]?.username || 'Друг'
      }
    },
    partnerAvatar() {
      return (pair) => this.partnerNames[this.partnerId(pair)]?.avatar_url || null
    },

    // Время выполнения сегодня у конкретного участника ("в 7:42") или ''.
    completionTimeToday: () => (pair, userId) => {
      const today = todayStr()
      const c = (pair.completions || []).find((x) => x.user_id === userId && x.date === today)
      if (!c?.created_at) return ''
      const t = new Date(c.created_at)
      return `в ${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}`
    },

    // Мини-хитмап 14 дней: [{ date, me, partner }] от старых к новым.
    heatmap14: (state) => (pair) => {
      const pid =
        pair.creator_id === state.userId ? pair.partner_id : pair.creator_id
      const comps = pair.completions || []
      const out = []
      const d = new Date()
      d.setDate(d.getDate() - 13)
      for (let i = 0; i < 14; i++) {
        const ds = iso(d)
        out.push({
          date: ds,
          me: comps.some((c) => c.user_id === state.userId && c.date === ds),
          partner: !!pid && comps.some((c) => c.user_id === pid && c.date === ds),
        })
        d.setDate(d.getDate() + 1)
      }
      return out
    },

    // Пары, куда меня пригласили друзья (pending, invited_user = я).
    pendingInvites: (state) =>
      state.pairs.filter((p) => p.invited_user === state.userId && p.status === 'pending'),

    // Обычные пары (не входящие приглашения) для основного списка.
    visiblePairs: (state) =>
      state.pairs.filter((p) => !(p.invited_user === state.userId && p.status === 'pending')),

    // Можно ли подтолкнуть: пара активна, друг ещё не сделал, кулдаун прошёл.
    canNudge() {
      return (pair) => {
        if (pair.status !== 'active') return false
        if (this.partnerStatusToday(pair)) return false
        return this.nudgeCooldownMs(pair) <= 0
      }
    },
    // Сколько мс осталось до возможности подтолкнуть снова (0 — можно).
    nudgeCooldownMs: (state) => (pair) => {
      const last = state.myLastNudge[pair.id]
      if (!last) return 0
      return Math.max(0, NUDGE_COOLDOWN_MS - (Date.now() - last))
    },
  },

  actions: {
    async fetchPairs() {
      if (fetchPromise) return fetchPromise
      fetchPromise = this._fetchPairs().finally(() => {
        fetchPromise = null
      })
      return fetchPromise
    },

    async _fetchPairs() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      this.userId = user.id

      const { data: pairsData, error } = await supabase
        .from('habit_pairs')
        .select('*')
        .or(`creator_id.eq.${user.id},partner_id.eq.${user.id},invited_user.eq.${user.id}`)
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
          .select('pair_id, user_id, date, created_at')
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

      // Имена/аватары друзей (RPC не течёт email). Если RPC нет — просто «Друг».
      try {
        const { data: partners } = await supabase.rpc('get_pair_partners')
        const map = {}
        for (const p of partners || []) map[p.user_id] = { username: p.username, avatar_url: p.avatar_url }
        this.partnerNames = map
      } catch (e) {
        console.log('get_pair_partners error:', e)
      }

      // Мои последние nudges по каждой паре — для кулдауна кнопки.
      try {
        const { data: nudges } = await supabase
          .from('nudges')
          .select('pair_id, created_at')
          .eq('from_user', user.id)
          .order('created_at', { ascending: false })
        const last = {}
        for (const n of nudges || []) {
          if (!last[n.pair_id]) last[n.pair_id] = new Date(n.created_at).getTime()
        }
        this.myLastNudge = last
      } catch (e) {
        console.log('fetch nudges error:', e)
      }
    },

    // Подтолкнуть друга (антиспам 2ч на пару).
    async nudge(pairId) {
      const pair = this.pairs.find((p) => p.id === pairId)
      if (!pair || this.nudgeCooldownMs(pair) > 0) return { ok: false }
      const toUser = pair.creator_id === this.userId ? pair.partner_id : pair.creator_id
      if (!toUser) return { ok: false }

      // Оптимистично взводим кулдаун.
      this.myLastNudge = { ...this.myLastNudge, [pairId]: Date.now() }

      const { error } = await supabase
        .from('nudges')
        .insert({ pair_id: pairId, from_user: this.userId, to_user: toUser })
      if (error) {
        console.error('nudge error:', error)
        return { ok: false, error: error.message }
      }
      logEvent('nudge_sent', { pair_id: pairId, habit_name: pair.habit_name })
      return { ok: true }
    },

    // invitedUser != null — приглашение конкретному другу (карточка-инвайт у него).
    async createPair(name, emoji, duration, invitedUser = null) {
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
          invited_user: invitedUser,
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
      if (invitedUser) logEvent('pair_invite_sent', { pair_id: data.id, to: invitedUser })
      // Реально сохранённый код (если у БД своя генерация — вернём её значение).
      return data.invite_code || code
    },

    // Принять приглашение в пару (от друга): я становлюсь partner, пара активна.
    async acceptPairInvite(pairId) {
      const { error } = await supabase
        .from('habit_pairs')
        .update({ partner_id: this.userId, invited_user: null, status: 'active' })
        .eq('id', pairId)
      if (error) {
        console.error('acceptPairInvite error:', error)
        return
      }
      const pair = this.pairs.find((p) => p.id === pairId)
      if (pair) {
        pair.partner_id = this.userId
        pair.invited_user = null
        pair.status = 'active'
      }
      logEvent('pair_invite_accepted', { pair_id: pairId, habit_name: pair?.habit_name })
    },

    // Отклонить приглашение в пару.
    async declinePairInvite(pairId) {
      const pair = this.pairs.find((p) => p.id === pairId)
      const { error } = await supabase
        .from('habit_pairs')
        .update({ status: 'ended' })
        .eq('id', pairId)
      if (error) {
        console.error('declinePairInvite error:', error)
        return
      }
      this.pairs = this.pairs.filter((p) => p.id !== pairId)
      logEvent('pair_invite_declined', { pair_id: pairId, habit_name: pair?.habit_name })
    },

    // Завершить пару (для обоих). Статус 'ended' виден обеим сторонам.
    async endPair(pairId) {
      const pair = this.pairs.find((p) => p.id === pairId)
      const { error } = await supabase
        .from('habit_pairs')
        .update({ status: 'ended' })
        .eq('id', pairId)
      if (error) {
        console.error('endPair error:', error)
        return
      }
      if (pair) pair.status = 'ended'
      logEvent('pair_ended', { pair_id: pairId, habit_name: pair?.habit_name })
    },

    // Убрать завершённую пару из списка (жёсткое удаление строки).
    async removePair(pairId) {
      const { error } = await supabase.from('habit_pairs').delete().eq('id', pairId)
      if (error) {
        console.error('removePair error:', error)
        return
      }
      this.pairs = this.pairs.filter((p) => p.id !== pairId)
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

    // Подписка на входящие подталкивания (Realtime). onNudge({ pair, fromName }) —
    // колбэк для показа тоста / локального пуша. Поднимать при старте приложения.
    async subscribeNudges(onNudge) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      this.userId = user.id
      if (nudgeChannel) return // уже подписаны

      nudgeChannel = supabase
        .channel('nudges-in')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'nudges', filter: `to_user=eq.${user.id}` },
          (payload) => {
            const row = payload.new
            const pair = this.pairs.find((p) => p.id === row.pair_id)
            const fromName = this.partnerNames[row.from_user]?.username || 'Друг'
            logEvent('nudge_received', { pair_id: row.pair_id, habit_name: pair?.habit_name })
            onNudge?.({
              pairId: row.pair_id,
              habitName: pair?.habit_name || 'привычку',
              fromName,
            })
          },
        )
        .subscribe()
    },

    unsubscribeNudges() {
      if (nudgeChannel) {
        supabase.removeChannel(nudgeChannel)
        nudgeChannel = null
      }
    },

    // Подписка на входящие приглашения в пару (habit_pairs.invited_user = я).
    // onInvite({ habitName, fromName }) — колбэк для тоста/пуша.
    async subscribePairInvites(onInvite) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      this.userId = user.id
      if (inviteChannel) return
      inviteChannel = supabase
        .channel('pair-invites-in')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'habit_pairs',
            filter: `invited_user=eq.${user.id}`,
          },
          async (payload) => {
            // Новая пара: ника создателя ещё нет в partnerNames, поэтому
            // подтягиваем список целиком (вызов дедуплицирован).
            await this.fetchPairs()
            const row = payload.new
            const fromName = this.partnerNames[row.creator_id]?.username || 'Друг'
            onInvite?.({ habitName: row.habit_name || 'привычку', fromName })
          },
        )
        // Статус приглашения поменялся (приняли/отклонили с другого устройства).
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'habit_pairs',
            filter: `invited_user=eq.${user.id}`,
          },
          ({ new: row }) => this.patchPair(row),
        )
        // Пары, где я уже партнёр. Фильтры Supabase не умеют OR, поэтому это
        // отдельная подписка, а не условие в предыдущей.
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'habit_pairs',
            filter: `partner_id=eq.${user.id}`,
          },
          ({ new: row }) => this.patchPair(row),
        )
        // Отметки в парах. Фильтр не умеет IN (список пар), поэтому подписка без
        // фильтра: RLS уже отдаёт только строки моих пар, а лишнее (если пара
        // ещё не подгружена) отсекаем в patchCompletion.
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'pair_completions' },
          ({ new: row }) => this.patchCompletion(row),
        )
        .subscribe()
    },

    // Локальные патчи по realtime — без полной перезагрузки.
    patchPair(row) {
      if (!row?.id) return
      const idx = this.pairs.findIndex((p) => p.id === row.id)
      if (idx === -1) {
        this.fetchPairs()
        return
      }
      // completions хранятся рядом с парой и в payload не приходят — сохраняем.
      this.pairs[idx] = { ...this.pairs[idx], ...row, completions: this.pairs[idx].completions }
    },

    patchCompletion(row) {
      if (!row?.pair_id) return
      const pair = this.pairs.find((p) => p.id === row.pair_id)
      if (!pair) return
      const dup = pair.completions.some(
        (c) => c.user_id === row.user_id && c.date === row.date,
      )
      if (dup) return
      pair.completions = [
        ...pair.completions,
        { pair_id: row.pair_id, user_id: row.user_id, date: row.date, created_at: row.created_at },
      ]
    },

    unsubscribePairInvites() {
      if (inviteChannel) {
        supabase.removeChannel(inviteChannel)
        inviteChannel = null
      }
    },
  },
})
