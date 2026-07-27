// Шаринг invite-ссылки для парных привычек. Без нативного плагина: пробуем
// Web Share API, при отсутствии/отмене — копируем ссылку в буфер.

export function inviteLink(code) {
  return `https://oyan-app.netlify.app/join/${code}`
}

// Возвращает: true — поделились, 'copied' — скопировали в буфер, false — не вышло.
export async function shareInvite(code) {
  const url = inviteLink(code)
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Oyan',
        text: 'Присоединяйся к парной привычке в Oyan',
        url,
      })
      return true
    } catch {
      // Пользователь отменил шаринг — не считаем ошибкой, но и не копируем.
      return false
    }
  }
  return (await copyText(url)) ? 'copied' : false
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
