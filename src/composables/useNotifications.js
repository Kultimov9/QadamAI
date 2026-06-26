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
