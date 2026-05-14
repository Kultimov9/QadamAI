import { useHabitsStore } from '../stores/habits'

export async function askAI(userMessage) {
  const store = useHabitsStore()
  const today = new Date().toISOString().split('T')[0]

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const completedToday = store.habits.filter((h) => h.completedDates.includes(today))
  const pendingToday = store.habits.filter((h) => !h.completedDates.includes(today))
  const todayTasks = store.todayTasks
  const undoneTasks = todayTasks.filter((t) => !t.done)
  const doneTasks = todayTasks.filter((t) => t.done)
  const lastReflection = store.reflections[store.reflections.length - 1]
  const bestStreak = Math.max(0, ...store.habits.map((h) => h.streak))

  const context = `
Ты личный помощник и коуч пользователя в приложении Qadam (в переводе с казахского — "шаг").
Приложение помогает людям начать действовать и менять жизнь маленькими шагами.
Отвечай коротко, по делу, по-русски. Будь дружелюбным и мотивирующим. Обращайся на "ты".

Данные пользователя на сегодня (${today}):

ПРИВЫЧКИ:
- Всего привычек: ${store.habits.length}
- Выполнено сегодня: ${completedToday.map((h) => h.name).join(', ') || 'пока ничего'}
- Осталось сегодня: ${pendingToday.map((h) => h.name).join(', ') || 'все выполнены!'}
- Лучший streak: ${bestStreak} дней

ЗАДАЧИ НА СЕГОДНЯ:
- Выполнено: ${doneTasks.map((t) => t.text).join(', ') || 'пока ничего'}
- Осталось: ${undoneTasks.map((t) => t.text).join(', ') || 'все выполнены!'}

${
  lastReflection
    ? `ПОСЛЕДНЯЯ РЕФЛЕКСИЯ (${lastReflection.date}):
- Настроение: ${lastReflection.mood}
- Что мешало: ${lastReflection.obstacles?.join(', ') || 'ничего'}
- Заметка: ${lastReflection.note || 'нет'}`
    : ''
}
`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 1000,
      system: context,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  const data = await response.json()
  console.log('AI response status:', response.status)
  console.log('AI response data:', JSON.stringify(data))
  const text = data.content[0].text
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/---/g, '—')
}
export async function generateNotifications() {
  const store = useHabitsStore()
  const today = new Date().toISOString().split('T')[0]
  const completedToday = store.habits.filter((h) => h.completedDates.includes(today))
  const pendingToday = store.habits.filter((h) => !h.completedDates.includes(today))
  const undoneTasks = store.todayTasks.filter((t) => !t.done)
  const lastReflection = store.reflections[store.reflections.length - 1]

  const context = `
Ты помощник в приложении Qadam. Твоя задача — придумать 4-6 персональных уведомления для пользователя на сегодня.
Учти его привычки, задачи и прогресс. Уведомления должны быть мотивирующими, короткими (до 100 символов) и в разное время дня.
Не ставь уведомления на утро (до 9) и поздний вечер (после 22).

Данные пользователя:
- Выполнено сегодня: ${completedToday.map((h) => h.name).join(', ') || 'пока ничего'}
- Осталось привычек: ${pendingToday.map((h) => h.name).join(', ') || 'все выполнены'}
- Невыполненные задачи: ${undoneTasks.map((t) => t.text).join(', ') || 'все выполнены'}
${lastReflection ? `- Последнее настроение: ${lastReflection.mood}` : ''}

Ответь ТОЛЬКО в формате JSON массива, без лишнего текста:
[
  { "hour": 12, "minute": 0, "text": "текст уведомления" },
  { "hour": 15, "minute": 30, "text": "текст уведомления" }
]
`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 500,
      system: context,
      messages: [{ role: 'user', content: 'Придумай уведомления для меня на сегодня' }],
    }),
  })

  const data = await response.json()
  const text = data.content[0].text
  const clean = text.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean)

  return parsed.map((n, i) => ({
    id: 100 + i,
    hour: n.hour,
    minute: n.minute || 0,
    text: n.text,
  }))
}
