<template>
  <div class="app">
    <router-view />
    <BottomNav v-if="route.path !== '/onboarding' && route.path !== '/auth'" />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import BottomNav from './components/BottomNav.vue'
import { setupNotifications } from './composables/useNotifications'
import { generateNotifications } from './composables/useAI'
import { useHabitsStore } from './stores/habits'
import { supabase } from './lib/supabase'

const route = useRoute()

onMounted(async () => {
  const store = useHabitsStore()

  document.body.style.position = 'fixed'
  document.body.style.width = '100%'
  document.body.style.height = '100%'
  document.body.style.overflow = 'hidden'

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (session) {
    // Тот же общий промис, что ждёт router guard — данные точно на месте,
    // и двойной загрузки не происходит.
    await store.ensureLoaded()

    const today = new Date().toISOString().split('T')[0]
    await setupNotifications()

    if (store.lastNotifGenDate !== today && store.onboarded) {
      try {
        const notifications = await generateNotifications()
        store.setCustomNotifications(notifications)
        store.lastNotifGenDate = today
        await setupNotifications()
      } catch (e) {
        console.log('AI notifs error:', e)
      }
    }
  }
})
</script>

<style scoped>
.app {
  max-width: 430px;
  margin: 0 auto;
  min-height: 100vh;
  position: relative;
  background: #0a0a0a;
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
