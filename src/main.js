import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import router from './router'
import App from './App.vue'
import './style.css'

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
