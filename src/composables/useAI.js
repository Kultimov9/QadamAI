import { useHabitsStore } from '../stores/habits'

export async function askAI(userMessage) {
  const store = useHabitsStore()
  const today = new Date().toISOString().split('T')[0]

  const completedToday = store.habits.filter((h) => h.completedDates.includes(today))
  const pendingToday = store.habits.filter((h) => !h.completedDates.includes(today))
  const todayTasks = store.todayTasks
  const undoneTasks = todayTasks.filter((t) => !t.done)
  const doneTasks = todayTasks.filter((t) => t.done)
  const lastReflection = store.reflections[store.reflections.length - 1]
  const bestStreak = Math.max(0, ...store.habits.map((h) => h.streak))

  // цели
  const activeGoals = store.goals.filter((g) => {
    const totalSteps = g.steps.length
    const doneSteps = g.steps.filter((s) => s.done).length
    return totalSteps === 0 || doneSteps < totalSteps
  })

  function daysLeft(deadline) {
    const d = new Date(deadline)
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return Math.ceil((d - t) / (1000 * 60 * 60 * 24))
  }

  const goalsInfo =
    activeGoals
      .map((g) => {
        const days = daysLeft(g.deadline)
        const doneSteps = g.steps.filter((s) => s.done).length
        const deadlineText =
          days < 0
            ? `просрочено на ${Math.abs(days)} дн.`
            : days === 0
              ? 'сегодня дедлайн!'
              : `осталось ${days} дн.`
        return `- "${g.title}" (${doneSteps}/${g.steps.length} шагов, ${deadlineText})`
      })
      .join('\n') || 'нет активных целей'

  const context = `
Ты личный помощник и коуч пользователя в приложении Oyan AI.
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

АКТИВНЫЕ ЦЕЛИ:
${goalsInfo}

${
  lastReflection
    ? `ПОСЛЕДНЯЯ РЕФЛЕКСИЯ (${lastReflection.date}):
- Настроение: ${lastReflection.mood}
- Что мешало: ${lastReflection.obstacles?.join(', ') || 'ничего'}
- Заметка: ${lastReflection.note || 'нет'}`
    : 'Рефлексий ещё нет'
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
  const text = data.content[0].text
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/---/g, '—')
}

// Персональное приветствие на главном экране (первый контакт после онбординга).
// Тёплый наставник: упоминает конкретную привычку и зовёт сделать микро-шаг.
export async function generateGreeting({ habitName, duration } = {}) {
  const store = useHabitsStore()
  const today = new Date().toISOString().split('T')[0]

  const completedToday = store.habits.filter((h) => h.completedDates.includes(today))
  const allHabits = store.habits.map((h) => h.name).join(', ') || 'нет привычек'
  const bestStreak = Math.max(0, ...store.habits.map((h) => h.streak))

  const context = `
Ты — личный наставник пользователя в приложении Oyan AI. Тон: тёплый, спокойный, поддерживающий.
Пиши по-русски. Без восклицательных знаков. Без эмодзи. Без канцелярита и общих фраз.
Строго 2-3 коротких предложения.

Задача: поприветствовать пользователя лично и подвести к одному маленькому действию.
1. Обратись к пользователю по-человечески.
2. Упомяни КОНКРЕТНУЮ привычку: "${habitName}".
3. Дай короткий тёплый инсайт, почему даже малый шаг сегодня важен.
4. Мягко позови начать прямо сейчас (${duration} минут).

Контекст:
- Привычки пользователя: ${allHabits}
- Сегодня уже выполнено: ${completedToday.map((h) => h.name).join(', ') || 'пока ничего'}
- Лучший streak: ${bestStreak} дней
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
      max_tokens: 300,
      system: context,
      messages: [{ role: 'user', content: 'Поприветствуй меня.' }],
    }),
  })

  const data = await response.json()
  const text = data.content?.[0]?.text
  if (!text) throw new Error('empty greeting')
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/---/g, '—')
    .trim()
}

export async function generateNotifications() {
  const store = useHabitsStore()
  const today = new Date().toISOString().split('T')[0]
  const completedToday = store.habits.filter((h) => h.completedDates.includes(today))
  const pendingToday = store.habits.filter((h) => !h.completedDates.includes(today))
  const undoneTasks = store.todayTasks.filter((t) => !t.done)
  const lastReflection = store.reflections[store.reflections.length - 1]

  function daysLeft(deadline) {
    const d = new Date(deadline)
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return Math.ceil((d - t) / (1000 * 60 * 60 * 24))
  }

  const activeGoals = store.goals.filter((g) => {
    const totalSteps = g.steps.length
    const doneSteps = g.steps.filter((s) => s.done).length
    return totalSteps === 0 || doneSteps < totalSteps
  })

  const goalsInfo =
    activeGoals
      .map((g) => {
        const days = daysLeft(g.deadline)
        const deadlineText =
          days < 0
            ? `просрочено на ${Math.abs(days)} дн.`
            : days === 0
              ? 'дедлайн сегодня!'
              : `осталось ${days} дн.`
        return `"${g.title}" (${deadlineText})`
      })
      .join('; ') || 'нет активных целей'

  const context = `
Ты помощник в приложении Oyan AI. Твоя задача — придумать 2-3 персональных уведомления для пользователя на сегодня.
Учти его привычки, задачи, цели и последнюю рефлексию. Уведомления должны быть мотивирующими, короткими (до 100 символов) и в разное время дня.
Не ставь уведомления на утро (до 9) и поздний вечер (после 22).
Если у цели близкий или просроченный дедлайн — обязательно сделай напоминание про неё.
Если в последней рефлексии пользователь писал о трудностях — мягко спроси как дела сегодня.

Данные пользователя:
- Выполнено сегодня: ${completedToday.map((h) => h.name).join(', ') || 'пока ничего'}
- Осталось привычек: ${pendingToday.map((h) => h.name).join(', ') || 'все выполнены'}
- Невыполненные задачи: ${undoneTasks.map((t) => t.text).join(', ') || 'все выполнены'}
- Активные цели: ${goalsInfo}
${lastReflection ? `- Последняя рефлексия (${lastReflection.date}): настроение ${lastReflection.mood}, мешало: ${lastReflection.obstacles?.join(', ') || 'ничего'}, заметка: "${lastReflection.note || ''}"` : '- Рефлексий ещё нет'}

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
