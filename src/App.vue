<template>
  <div class="app">
    <router-view />
    <BottomNav v-if="route.path !== '/onboarding'" />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import BottomNav from './components/BottomNav.vue'
import { setupNotifications } from './composables/useNotifications'
import { generateNotifications } from './composables/useAI'
import { useHabitsStore } from './stores/habits'

const route = useRoute()

onMounted(async () => {
  const store = useHabitsStore()
  const today = new Date().toISOString().split('T')[0]

  document.body.style.position = 'fixed'
  document.body.style.width = '100%'
  document.body.style.height = '100%'
  document.body.style.overflow = 'hidden'

  await setupNotifications()

  if (store.lastNotifGenDate !== today && store.onboarded) {
    try {
      const notifications = await generateNotifications()
      store.setCustomNotifications(notifications)
      store.lastNotifGenDate = today
      await setupNotifications()
      console.log('AI notifications:', notifications)
    } catch (e) {
      console.log('AI notifs error:', e.message, JSON.stringify(e))
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
  background: #f9f9f7;
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
