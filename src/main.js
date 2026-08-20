import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { Capacitor } from '@capacitor/core'
import router from './router'
import App from './App.vue'
import './style.css'

// Класс платформы на <html> — от него зависят верхние отступы (см. style.css).
// На iOS webview уходит под статус-бар и нужен большой отступ, на Android он
// начинается ниже статус-бара, и тот же отступ давал пустую полосу сверху.
document.documentElement.classList.add(`platform-${Capacitor.getPlatform()}`)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

createApp(App).use(pinia).use(router).mount('#app')

// Отключить bounce на iOS
document.addEventListener(
  'touchmove',
  (e) => {
    if (e.target === document.documentElement || e.target === document.body) {
      e.preventDefault()
    }
  },
  { passive: false },
)
