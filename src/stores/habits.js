import { defineStore } from 'pinia'

export const useHabitsStore = defineStore('habits', {
  state: () => ({
    habits: [
      { id: 1, name: 'Пробежка 5 мин', emoji: '🏃', duration: 5, streak: 0, completedDates: [] },
      { id: 2, name: 'Выпить воду', emoji: '💧', duration: 1, streak: 0, completedDates: [] },
      { id: 3, name: 'Заметка дня', emoji: '📝', duration: 3, streak: 0, completedDates: [] },
    ],
    reflections: [],
    notifications: {
      morningHour: 9,
      eveningHour: 21,
    },
    onboarded: false,
    tasks: [],
    lastNotifGenDate: '',
    customNotifications: [],
    lastNotifGenDate: '',
    goals: [],
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
    completeHabit(id) {
      const today = new Date().toISOString().split('T')[0]
      const habit = this.habits.find((h) => h.id === id)
      if (habit && !habit.completedDates.includes(today)) {
        habit.completedDates.push(today)
        habit.streak += 1
      }
    },
    addHabit(name, emoji, duration) {
      const maxId = this.habits.length > 0 ? Math.max(...this.habits.map((h) => h.id)) : 0
      this.habits.push({
        id: maxId + 1,
        name,
        emoji,
        duration,
        streak: 0,
        completedDates: [],
      })
    },
    removeHabit(id) {
      this.habits = this.habits.filter((h) => h.id !== id)
    },
    saveReflection(data) {
      const existing = this.reflections.findIndex((r) => r.date === data.date)
      if (existing !== -1) this.reflections[existing] = data
      else this.reflections.push(data)
    },
    setNotificationTime(type, hour) {
      this.notifications[type] = hour
    },
    setOnboarded() {
      this.onboarded = true
    },
    addTask(text) {
      this.tasks.push({
        id: Date.now(),
        text,
        done: false,
        date: new Date().toISOString().split('T')[0],
      })
    },

    toggleTask(id) {
      const task = this.tasks.find((t) => t.id === id)
      if (task) task.done = !task.done
    },

    removeTask(id) {
      this.tasks = this.tasks.filter((t) => t.id !== id)
    },

    clearOldTasks() {
      const today = new Date().toISOString().split('T')[0]
      this.tasks = this.tasks
        .map((t) => {
          if (t.date !== today && !t.done) {
            return { ...t, date: today }
          }
          return t
        })
        .filter((t) => t.date === today || !t.done)
    },
    setCustomNotifications(notifications) {
      this.customNotifications = notifications
    },
    addGoal(title, deadline) {
      this.goals.push({
        id: Date.now(),
        title,
        deadline,
        steps: [],
        createdAt: new Date().toISOString().split('T')[0],
      })
    },

    removeGoal(id) {
      this.goals = this.goals.filter((g) => g.id !== id)
    },

    addStep(goalId, text) {
      const goal = this.goals.find((g) => g.id === goalId)
      if (goal) goal.steps.push({ id: Date.now(), text, done: false })
    },

    toggleStep(goalId, stepId) {
      const goal = this.goals.find((g) => g.id === goalId)
      if (goal) {
        const step = goal.steps.find((s) => s.id === stepId)
        if (step) step.done = !step.done
      }
    },

    removeStep(goalId, stepId) {
      const goal = this.goals.find((g) => g.id === goalId)
      if (goal) goal.steps = goal.steps.filter((s) => s.id !== stepId)
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
