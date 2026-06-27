import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'

// Кэш промиса загрузки данных. Живёт вне state, поэтому не персистится и не
// сериализуется. Гарантирует, что fetchAll() выполнится один раз, а параллельные
// вызовы (router guard + App.vue) переиспользуют один и тот же промис.
let loadPromise = null

export const useHabitsStore = defineStore('habits', {
  state: () => ({
    userId: null,
    habits: [],
    tasks: [],
    goals: [],
    reflections: [],
    onboarded: false,
    notifications: {
      morningHour: 9,
      eveningHour: 21,
    },
    customNotifications: [],
    lastNotifGenDate: '',
    aiMessages: [],
    aiMessagesDate: '',
  }),

  getters: {
    todayCompleted: (state) => {
      const today = new Date().toISOString().split('T')[0]
      return state.habits.filter((h) => h.completedDates.includes(today))
    },
    todayPending: (state) => {
      const today = new Date().toISOString().split('T')[0]
      return state.habits.filter((h) => !h.completedDates.includes(today))
    },
    todayTasks: (state) => {
      const today = new Date().toISOString().split('T')[0]
      return state.tasks.filter((t) => t.date === today)
    },
  },

  actions: {
    // === Загрузка всех данных пользователя ===
    async fetchAll() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      this.userId = user.id

      const [habitsRes, tasksRes, goalsRes, reflectionsRes, profileRes] = await Promise.all([
        supabase.from('habits').select('*').eq('user_id', user.id),
        supabase.from('tasks').select('*').eq('user_id', user.id),
        supabase.from('goals').select('*').eq('user_id', user.id),
        supabase.from('reflections').select('*').eq('user_id', user.id),
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      ])

      this.habits = (habitsRes.data || []).map((h) => ({
        id: h.id,
        name: h.name,
        emoji: h.emoji,
        duration: h.duration,
        streak: h.streak,
        completedDates: h.completed_dates || [],
      }))
      this.tasks = (tasksRes.data || []).map((t) => ({
        id: t.id,
        text: t.text,
        done: t.done,
        date: t.date,
      }))
      this.goals = (goalsRes.data || []).map((g) => ({
        id: g.id,
        title: g.title,
        deadline: g.deadline,
        steps: g.steps || [],
      }))
      this.reflections = (reflectionsRes.data || []).map((r) => ({
        date: r.date,
        mood: r.mood,
        obstacles: r.obstacles || [],
        note: r.note,
      }))
      this.onboarded = profileRes.data?.onboarded || false
    },

    // Загружает данные из Supabase один раз за сессию. Используется роутером и
    // App.vue, чтобы решение о редиректе принималось только после загрузки.
    // force=true сбрасывает кэш (например, после входа под другим аккаунтом).
    async ensureLoaded(force = false) {
      if (force) loadPromise = null
      if (!loadPromise) loadPromise = this.fetchAll()
      await loadPromise
    },

    async logout() {
      await supabase.auth.signOut()
      loadPromise = null
      this.userId = null
      this.habits = []
      this.tasks = []
      this.goals = []
      this.reflections = []
      this.onboarded = false
    },

    // === Привычки ===
    async addHabit(name, emoji, duration) {
      const id = crypto.randomUUID()
      this.habits.push({ id, name, emoji, duration, streak: 0, completedDates: [] })
      const { error } = await supabase.from('habits').insert({
        id,
        user_id: this.userId,
        name,
        emoji,
        duration,
        streak: 0,
        completed_dates: [],
      })
      if (error) console.error('addHabit error:', error)
    },

    async completeHabit(id) {
      const today = new Date().toISOString().split('T')[0]
      const habit = this.habits.find((h) => h.id === id)
      if (habit && !habit.completedDates.includes(today)) {
        habit.completedDates.push(today)
        habit.streak += 1
        const { error } = await supabase
          .from('habits')
          .update({
            completed_dates: habit.completedDates,
            streak: habit.streak,
          })
          .eq('id', id)
        if (error) console.error('completeHabit error:', error)
      }
    },

    async removeHabit(id) {
      this.habits = this.habits.filter((h) => h.id !== id)
      const { error } = await supabase.from('habits').delete().eq('id', id)
      if (error) console.error('removeHabit error:', error)
    },

    // === Задачи ===
    async addTask(text) {
      const id = crypto.randomUUID()
      const date = new Date().toISOString().split('T')[0]
      this.tasks.push({ id, text, done: false, date })
      const { error } = await supabase.from('tasks').insert({
        id,
        user_id: this.userId,
        text,
        done: false,
        date,
      })
      if (error) console.error('addTask error:', error)
    },

    async toggleTask(id) {
      const task = this.tasks.find((t) => t.id === id)
      if (task) {
        task.done = !task.done
        const { error } = await supabase.from('tasks').update({ done: task.done }).eq('id', id)
        if (error) console.error('toggleTask error:', error)
      }
    },

    async removeTask(id) {
      this.tasks = this.tasks.filter((t) => t.id !== id)
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) console.error('removeTask error:', error)
    },

    async clearOldTasks() {
      const today = new Date().toISOString().split('T')[0]
      const idsToUpdate = []
      this.tasks = this.tasks
        .map((t) => {
          if (t.date !== today && !t.done) {
            idsToUpdate.push(t.id)
            return { ...t, date: today }
          }
          return t
        })
        .filter((t) => t.date === today || !t.done)

      if (idsToUpdate.length > 0) {
        const { error } = await supabase.from('tasks').update({ date: today }).in('id', idsToUpdate)
        if (error) console.error('clearOldTasks error:', error)
      }
    },

    // === Цели ===
    async addGoal(title, deadline) {
      const id = crypto.randomUUID()
      this.goals.push({ id, title, deadline, steps: [] })
      const { error } = await supabase.from('goals').insert({
        id,
        user_id: this.userId,
        title,
        deadline,
        steps: [],
      })
      if (error) console.error('addGoal error:', error)
    },

    async removeGoal(id) {
      this.goals = this.goals.filter((g) => g.id !== id)
      const { error } = await supabase.from('goals').delete().eq('id', id)
      if (error) console.error('removeGoal error:', error)
    },

    async addStep(goalId, text) {
      const goal = this.goals.find((g) => g.id === goalId)
      if (!goal) return
      goal.steps.push({ id: Date.now(), text, done: false })
      const { error } = await supabase.from('goals').update({ steps: goal.steps }).eq('id', goalId)
      if (error) console.error('addStep error:', error)
    },

    async toggleStep(goalId, stepId) {
      const goal = this.goals.find((g) => g.id === goalId)
      if (!goal) return
      const step = goal.steps.find((s) => s.id === stepId)
      if (step) step.done = !step.done
      const { error } = await supabase.from('goals').update({ steps: goal.steps }).eq('id', goalId)
      if (error) console.error('toggleStep error:', error)
    },

    async removeStep(goalId, stepId) {
      const goal = this.goals.find((g) => g.id === goalId)
      if (!goal) return
      goal.steps = goal.steps.filter((s) => s.id !== stepId)
      const { error } = await supabase.from('goals').update({ steps: goal.steps }).eq('id', goalId)
      if (error) console.error('removeStep error:', error)
    },

    // === Рефлексия ===
    async saveReflection(data) {
      const existingIndex = this.reflections.findIndex((r) => r.date === data.date)
      if (existingIndex !== -1) this.reflections[existingIndex] = data
      else this.reflections.push(data)

      const { data: existing } = await supabase
        .from('reflections')
        .select('id')
        .eq('user_id', this.userId)
        .eq('date', data.date)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('reflections')
          .update({
            mood: data.mood,
            obstacles: data.obstacles,
            note: data.note,
          })
          .eq('id', existing.id)
        if (error) console.error('saveReflection update error:', error)
      } else {
        const { error } = await supabase.from('reflections').insert({
          user_id: this.userId,
          date: data.date,
          mood: data.mood,
          obstacles: data.obstacles,
          note: data.note,
        })
        if (error) console.error('saveReflection insert error:', error)
      }
    },

    // === Онбординг ===
    async setOnboarded() {
      this.onboarded = true
      const { error } = await supabase.from('profiles').upsert({
        id: this.userId,
        onboarded: true,
      })
      if (error) console.error('setOnboarded error:', error)
    },

    // === Уведомления (остаются локально) ===
    setNotificationTime(type, hour) {
      this.notifications[type] = hour
    },
    setCustomNotifications(notifications) {
      this.customNotifications = notifications
    },
    saveAIMessages(messages) {
      this.aiMessages = messages
      this.aiMessagesDate = new Date().toISOString().split('T')[0]
    },
    clearAIMessages() {
      this.aiMessages = []
      this.aiMessagesDate = ''
    },
  },

  persist: true,
})
