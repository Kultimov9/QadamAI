<template>
  <div class="timer-view">
    <button class="back-btn" @click="router.back()">← Назад</button>

    <div class="habit-info">
      <span class="habit-emoji">{{ habit?.emoji }}</span>
      <h2 class="habit-name">{{ habit?.name }}</h2>
      <p class="hint">Просто начни — можешь остановиться в любой момент</p>
    </div>

    <div class="circle-wrap">
      <svg viewBox="0 0 120 120" class="circle-svg">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#1a1a1a" stroke-width="8" />
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="#f5f0e8"
          stroke-width="8"
          stroke-linecap="round"
          stroke-dasharray="339.3"
          :stroke-dashoffset="dashOffset"
          transform="rotate(-90 60 60)"
          style="transition: stroke-dashoffset 1s linear"
        />
      </svg>
      <div class="timer-text">{{ formattedTime }}</div>
    </div>

    <div class="actions">
      <button v-if="!started" class="main-btn" @click="start">Старт</button>
      <button v-else-if="running" class="main-btn pause" @click="pause">Пауза</button>
      <button v-else class="main-btn" @click="resume">Продолжить</button>

      <button class="secondary-btn" @click="postpone">Отложить на 10 мин</button>
      <button class="skip-btn" @click="skip">Пропустить сегодня</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useHabitsStore } from '../stores/habits'
import { App } from '@capacitor/app'

const router = useRouter()
const route = useRoute()
const store = useHabitsStore()

const habit = computed(() => store.habits.find((h) => h.id === route.params.id))
const totalSeconds = computed(() => (habit.value?.duration || 5) * 60)

const secondsLeft = ref(totalSeconds.value)
const started = ref(false)
const running = ref(false)
let interval = null
// let appStateListener = null
let startTime = null
let elapsed = 0

const formattedTime = computed(() => {
  const m = Math.floor(secondsLeft.value / 60)
  const s = secondsLeft.value % 60
  return `${m}:${s.toString().padStart(2, '0')}`
})

const dashOffset = computed(() => {
  const progress = secondsLeft.value / totalSeconds.value
  return 339.3 * (1 - progress)
})

function start() {
  started.value = true
  running.value = true
  startTime = Date.now()
  tick()
  enableWakeLock()
}

function tick() {
  interval = setInterval(() => {
    const now = Date.now()
    const delta = Math.floor((now - startTime) / 1000)
    secondsLeft.value = Math.max(0, totalSeconds.value - elapsed - delta)
    if (secondsLeft.value <= 0) {
      clearInterval(interval)
      running.value = false
      disableWakeLock()
      complete()
    }
  }, 1000)
}

function pause() {
  clearInterval(interval)
  elapsed += Math.floor((Date.now() - startTime) / 1000)
  running.value = false
}

function resume() {
  startTime = Date.now()
  running.value = true
  tick()
}

function complete() {
  store.completeHabit(habit.value.id)
  router.replace('/')
}

function postpone() {
  clearInterval(interval)
  disableWakeLock()
  router.replace('/')
}

function skip() {
  clearInterval(interval)
  disableWakeLock()
  router.replace('/')
}

// экран не гаснет пока таймер идёт
let wakeLock = null

async function enableWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen')
    }
  } catch (e) {
    console.log('WakeLock error:', e)
  }
}

function disableWakeLock() {
  if (wakeLock) {
    wakeLock.release()
    wakeLock = null
  }
}

// пауза когда уходим в другое приложение
// onMounted(async () => {
//   appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
//     if (!isActive && running.value) {
//       pause()
//     }
//   })
// })

// onUnmounted(() => {
//   clearInterval(interval)
//   disableWakeLock()
//   if (appStateListener) appStateListener.remove()
// })
</script>

<style scoped>
.timer-view {
  padding: 60px 24px 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  min-height: 100vh;
}
.back-btn {
  align-self: flex-start;
  background: none;
  border: none;
  font-size: 15px;
  color: #f5f0e8;
  cursor: pointer;
  padding: 0;
}
.habit-info {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.habit-emoji {
  font-size: 48px;
}
.habit-name {
  font-size: 22px;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
}
.hint {
  font-size: 13px;
  color: #9a9a92;
  margin: 0;
  text-align: center;
}
.circle-wrap {
  position: relative;
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.circle-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.timer-text {
  font-size: 42px;
  font-weight: 600;
  color: #f5f0e8;
  z-index: 1;
}
.actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}
.main-btn {
  background: #f5f0e8;
  color: #0a0a0a;
  border: none;
  border-radius: 16px;
  padding: 18px;
  font-size: 17px;
  font-weight: 500;
  cursor: pointer;
}
.main-btn.pause {
  background: #2a2a2a;
  color: #f5f0e8;
}
.main-btn:active {
  transform: scale(0.98);
}
.secondary-btn {
  background: #2a2a2a;
  border: none;
  border-radius: 12px;
  padding: 14px;
  font-size: 15px;
  color: #9a9a92;
  cursor: pointer;
}
.skip-btn {
  background: none;
  border: none;
  font-size: 14px;
  color: #5a5a55;
  cursor: pointer;
  padding: 8px;
}
</style>
