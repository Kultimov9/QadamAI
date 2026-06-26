import { useHabitsStore } from './stores/habits'

export async function migrateLocalDataToSupabase() {
  // Старые данные из localStorage (Pinia persist хранит под этим ключом)
  const raw = localStorage.getItem('habits')
  if (!raw) {
    console.log('Нет старых данных для миграции')
    return
  }

  const oldData = JSON.parse(raw)
  const store = useHabitsStore()

  console.log('Найдено старых привычек:', oldData.habits?.length || 0)
  console.log('Найдено старых задач:', oldData.tasks?.length || 0)
  console.log('Найдено старых целей:', oldData.goals?.length || 0)
  console.log('Найдено старых рефлексий:', oldData.reflections?.length || 0)

  // Привычки — переносим с сохранением streak и completedDates
  if (oldData.habits) {
    for (const h of oldData.habits) {
      const id = crypto.randomUUID()
      store.habits.push({
        id,
        name: h.name,
        emoji: h.emoji,
        duration: h.duration,
        streak: h.streak,
        completedDates: h.completedDates,
      })
      const { error } = await (await import('./lib/supabase')).supabase.from('habits').insert({
        id,
        user_id: store.userId,
        name: h.name,
        emoji: h.emoji,
        duration: h.duration,
        streak: h.streak,
        completed_dates: h.completedDates,
      })
      if (error) console.error('Ошибка переноса привычки:', h.name, error)
    }
  }

  // Задачи
  if (oldData.tasks) {
    for (const t of oldData.tasks) {
      const id = crypto.randomUUID()
      const { error } = await (await import('./lib/supabase')).supabase
        .from('tasks')
        .insert({ id, user_id: store.userId, text: t.text, done: t.done, date: t.date })
      if (error) console.error('Ошибка переноса задачи:', t.text, error)
    }
  }

  // Цели
  if (oldData.goals) {
    for (const g of oldData.goals) {
      const id = crypto.randomUUID()
      const { error } = await (await import('./lib/supabase')).supabase
        .from('goals')
        .insert({ id, user_id: store.userId, title: g.title, deadline: g.deadline, steps: g.steps })
      if (error) console.error('Ошибка переноса цели:', g.title, error)
    }
  }

  // Рефлексии
  if (oldData.reflections) {
    for (const r of oldData.reflections) {
      const { error } = await (await import('./lib/supabase')).supabase.from('reflections').insert({
        user_id: store.userId,
        date: r.date,
        mood: r.mood,
        obstacles: r.obstacles,
        note: r.note,
      })
      if (error) console.error('Ошибка переноса рефлексии:', r.date, error)
    }
  }

  console.log('✅ Миграция завершена!')
  await store.fetchAll()
}
