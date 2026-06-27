import { LocalNotifications } from '@capacitor/local-notifications'
import { useHabitsStore } from '../stores/habits'

export async function setupNotifications() {
  const store = useHabitsStore()
  const permission = await LocalNotifications.requestPermissions()
  if (permission.display !== 'granted') return

  const allIds = [{ id: 1 }, { id: 2 }, ...store.customNotifications.map((n) => ({ id: n.id }))]
  await LocalNotifications.cancel({ notifications: allIds })

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
    ...store.customNotifications.map((n) => ({
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

// Разовое напоминание на ближайшие 20:00 (сегодня, либо завтра если уже позже).
// id 99 не пересекается с фиксированными (1, 2) и кастомными уведомлениями.
export async function scheduleEveningReminder(habitName) {
  const permission = await LocalNotifications.requestPermissions()
  if (permission.display !== 'granted') return

  const at = new Date()
  at.setHours(20, 0, 0, 0)
  if (at.getTime() <= Date.now()) at.setDate(at.getDate() + 1)

  await LocalNotifications.cancel({ notifications: [{ id: 99 }] })
  await LocalNotifications.schedule({
    notifications: [
      {
        id: 99,
        title: 'Oyan AI',
        body: habitName
          ? `Вечер — хорошее время для «${habitName}». Сделаешь маленький шаг?`
          : 'Вечер — хорошее время для маленького шага.',
        schedule: { at, allowWhileIdle: true },
      },
    ],
  })
}
