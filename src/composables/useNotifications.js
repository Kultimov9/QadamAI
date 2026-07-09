import { LocalNotifications } from '@capacitor/local-notifications'
import { useHabitsStore } from '../stores/habits'

// Относится ли уведомление к привычке. Надёжный путь — поле habit из AI;
// фолбэк — поиск названия в тексте. Для русских падежей («разминка» /
// «разминку») длинные названия сравниваем без последней буквы.
function mentionsHabit(n, habitName) {
  const name = habitName.toLowerCase().trim()
  if (n.habit && n.habit.toLowerCase().trim() === name) return true
  const text = (n.text || '').toLowerCase()
  const stem = name.length > 4 ? name.slice(0, -1) : name
  return text.includes(stem)
}

export async function setupNotifications() {
  const store = useHabitsStore()
  const permission = await LocalNotifications.requestPermissions()
  if (permission.display !== 'granted') return

  const allIds = [{ id: 1 }, { id: 2 }, ...store.customNotifications.map((n) => ({ id: n.id }))]
  await LocalNotifications.cancel({ notifications: allIds })

  // Не планируем пуши о привычках, которые сегодня уже выполнены.
  const today = new Date().toISOString().split('T')[0]
  const doneToday = store.habits.filter((h) => h.completedDates.includes(today))
  const isAboutDoneHabit = (n) => doneToday.some((h) => mentionsHabit(n, h.name))

  const notifications = [
    {
      id: 1,
      title: 'Доброе утро 👋',
      body: 'Одно маленькое дело изменит твой день. Начни прямо сейчас.',
      schedule: {
        on: { hour: store.notifications.morningHour, minute: 0 },
        repeats: true,
        allowWhileIdle: true,
      },
    },
    {
      id: 2,
      title: 'Как прошёл день? 💬',
      body: 'Запиши рефлексию — это займёт 30 секунд.',
      schedule: {
        on: { hour: store.notifications.eveningHour, minute: 0 },
        repeats: true,
        allowWhileIdle: true,
      },
    },
    ...store.customNotifications
      .filter((n) => !isAboutDoneHabit(n))
      .map((n) => ({
        id: n.id,
        title: 'Oyan AI ✨',
        body: n.text,
        schedule: {
          on: { hour: n.hour, minute: n.minute || 0 },
          repeats: true,
          allowWhileIdle: true,
        },
      })),
  ]

  console.log('scheduling notifications:', JSON.stringify(notifications))
  await LocalNotifications.schedule({ notifications })
}

// Отменяет сегодняшние запланированные пуши о конкретной привычке — вызывается,
// когда привычка выполнена. Отменённые кастомные уведомления вернутся при
// следующем открытии приложения (setupNotifications перепланирует всё заново).
export async function cancelNotificationsForHabit(habitName) {
  if (!habitName) return
  const store = useHabitsStore()

  const ids = store.customNotifications
    .filter((n) => mentionsHabit(n, habitName))
    .map((n) => ({ id: n.id }))

  // Разовое вечернее напоминание тоже может быть про эту привычку.
  if (store.eveningReminderHabit && mentionsHabit({ habit: store.eveningReminderHabit }, habitName)) {
    ids.push({ id: 99 })
    store.eveningReminderHabit = ''
  }

  if (ids.length === 0) return
  try {
    await LocalNotifications.cancel({ notifications: ids })
    console.log('cancelled notifications for done habit:', habitName, ids)
  } catch (e) {
    console.log('cancel for habit error:', e)
  }
}

// Разовое вечернее напоминание. Если 20:00 ещё впереди — ставим на 20:00 сегодня.
// Если уже позже (нажали вечером) — НЕ переносим на завтра, а напоминаем через 2 часа,
// чтобы напоминание пришло этим же вечером. Возвращаем время, на которое поставили.
// id 99 не пересекается с фиксированными (1, 2) и кастомными (100+) уведомлениями.
export async function scheduleEveningReminder(habitName) {
  const permission = await LocalNotifications.requestPermissions()
  if (permission.display !== 'granted') return null

  const store = useHabitsStore()
  const now = new Date()
  let at = new Date()
  at.setHours(20, 0, 0, 0)
  // 20:00 уже прошло (или вот-вот) — напомним через 2 часа от текущего момента.
  if (at.getTime() <= now.getTime() + 60 * 1000) {
    at = new Date(now.getTime() + 2 * 60 * 60 * 1000)
  }

  await LocalNotifications.cancel({ notifications: [{ id: 99 }] })
  await LocalNotifications.schedule({
    notifications: [
      {
        id: 99,
        title: 'Oyan AI',
        body: habitName
          ? `Самое время для «${habitName}». Сделаешь маленький шаг?`
          : 'Самое время для маленького шага.',
        schedule: { at, allowWhileIdle: true },
      },
    ],
  })
  // Запоминаем, о какой привычке напоминание — чтобы отменить, если её выполнят раньше.
  store.eveningReminderHabit = habitName || ''
  return at
}
