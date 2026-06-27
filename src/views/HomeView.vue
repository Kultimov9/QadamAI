<template>
  <div class="home">
    <div v-if="showGreeting" class="ai-greet">
      <div class="ai-greet-head">
        <img :src="logoUrl" class="ai-greet-eye" alt="" />
        <span class="ai-greet-brand">OYAN</span>
      </div>
      <Transition name="greet-fade" mode="out-in">
        <p class="ai-greet-text" :key="greetingText">{{ greetingText }}</p>
      </Transition>
      <div class="ai-greet-actions">
        <button class="ai-greet-primary" @click="startTarget">
          Начать {{ targetHabit.duration }} минут →
        </button>
        <button class="ai-greet-secondary" @click="remindLater">
          Не сейчас — напомни вечером
        </button>
      </div>
    </div>

    <div class="header">
      <p class="greeting">{{ greeting }}</p>
      <h1 class="title">
        <span v-if="pendingHabits.length > 0">
          Сегодня {{ pendingHabits.length }} {{ declinate(pendingHabits.length) }}.<br />Начни с
          малого.
        </span>
        <span v-else> Всё сделано! 🎉<br />Ты молодец. </span>
      </h1>
    </div>

    <button v-if="pendingHabits.length > 0" class="start-btn" @click="startFirst">
      Начать прямо сейчас
    </button>

    <div class="tags">
      <span v-for="habit in pendingHabits.slice(0, 3)" :key="habit.id" class="tag">
        {{ habit.emoji }} {{ habit.name }}
      </span>
    </div>

    <div v-if="completedHabits.length > 0" class="completed-section">
      <p class="section-label">Уже сделано сегодня</p>
      <div class="completed-list">
        <div v-for="habit in completedHabits" :key="habit.id" class="completed-item">
          <span class="check">✓</span>
          <span>{{ habit.emoji }} {{ habit.name }}</span>
          <span class="streak">{{ habit.streak }} дн.</span>
        </div>
      </div>
    </div>

    <button class="secondary-btn" @click="router.push('/habits')">Все привычки</button>
    <div class="challenge-card" style="background: #1a1a1a; border: 1px solid #2a2a2a">
      <p class="challenge-label">📅 Сравнение со вчера</p>
      <p class="challenge-text" style="color: #ffffff">{{ yesterdayMessage }}</p>
      <div class="challenge-bar-wrap" style="background: #2a2a2a">
        <div
          class="challenge-bar"
          :style="{
            width:
              yesterdayStats.done === 0
                ? '0%'
                : `${Math.round((todayCompleted.length / yesterdayStats.total) * 100)}%`,
          }"
        />
      </div>
      <div style="display: flex; justify-content: space-between">
        <p class="challenge-sub" style="color: #9a9a92">Вчера: {{ yesterdayStats.done }}</p>
        <p class="challenge-sub" style="color: #f5f0e8">Сегодня: {{ todayCompleted.length }}</p>
      </div>
    </div>

    <div v-if="lastWeekStats" class="challenge-card">
      <p class="challenge-label">⚡ Вызов себе</p>
      <p class="challenge-text">
        Неделю назад ты выполнил
        <span class="challenge-num">{{ lastWeekStats.done }} из {{ lastWeekStats.total }}</span>
        привычек. Сможешь повторить?
      </p>
      <div class="challenge-bar-wrap">
        <div class="challenge-bar" :style="{ width: challengeProgress }" />
      </div>
      <p class="challenge-sub">Сегодня: {{ todayCompleted.length }} из {{ lastWeekStats.total }}</p>
    </div>
    <HeatMap />
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useHabitsStore } from '../stores/habits'
import HeatMap from '../components/HeatMap.vue'
import { generateGreeting } from '../composables/useAI'
import { scheduleEveningReminder } from '../composables/useNotifications'
import logoUrl from '@/assets/logo-wordmark.png'

const router = useRouter()
const store = useHabitsStore()

const pendingHabits = computed(() => store.todayPending)
const completedHabits = computed(() => store.todayCompleted)
const todayCompleted = computed(() => store.todayCompleted)

// === AI-приветствие ===
const PLACEHOLDER = 'С чего начнём сегодня? Даже 5 минут — это шаг.'
const greetingText = ref(PLACEHOLDER)
const todayStr = () => new Date().toISOString().split('T')[0]

// Привычка, к которой ведём: первая невыполненная, иначе первая в списке.
// Её же имя/длительность передаём AI — текст и кнопка всегда про одну привычку.
const targetHabit = computed(() => pendingHabits.value[0] || store.habits[0] || null)
// Блок скрыт до конца дня, если пользователь нажал «Не сейчас» сегодня.
const showGreeting = computed(
  () => store.aiGreetingDismissedDate !== todayStr() && !!targetHabit.value,
)

function startTarget() {
  if (targetHabit.value) router.push(`/timer/${targetHabit.value.id}`)
}

async function remindLater() {
  store.dismissAiGreeting()
  try {
    await scheduleEveningReminder(targetHabit.value?.name)
  } catch (e) {
    console.log('evening reminder error:', e)
  }
}

onMounted(async () => {
  const today = todayStr()
  // Блок скрыт на сегодня («Не сейчас») — не генерируем, API не трогаем.
  if (store.aiGreetingDismissedDate === today) return
  // Уже есть приветствие на сегодня — показываем сохранённое, API не дёргаем.
  if (store.aiGreetingDate === today && store.aiGreeting) {
    greetingText.value = store.aiGreeting
    return
  }
  // Иначе: заглушка уже видна, тихо генерируем один раз и сохраняем.
  if (!targetHabit.value) return
  try {
    const text = await generateGreeting({
      habitName: targetHabit.value.name,
      duration: targetHabit.value.duration,
    })
    if (text) {
      greetingText.value = text
      store.setAiGreeting(text)
    }
  } catch (e) {
    // Нет интернета / ошибка — оставляем заглушку, ошибку не показываем.
    console.log('greeting error:', e)
  }
})

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Доброе утро'
  if (h < 18) return 'Добрый день'
  return 'Добрый вечер'
})

function declinate(n) {
  if (n === 1) return 'дело'
  if (n < 5) return 'дела'
  return 'дел'
}

function startFirst() {
  const first = pendingHabits.value[0]
  if (first) router.push(`/timer/${first.id}`)
}
const lastWeekStats = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  const date = d.toISOString().split('T')[0]
  const done = store.habits.filter((h) => h.completedDates.includes(date)).length
  if (done === 0) return null
  return { done, total: store.habits.length }
})

const yesterdayStats = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const date = d.toISOString().split('T')[0]
  const done = store.habits.filter((h) => h.completedDates.includes(date)).length
  return { done, total: store.habits.length }
})

const yesterdayMessage = computed(() => {
  const { done, total } = yesterdayStats.value
  const todayDone = todayCompleted.value.length
  if (done === 0) return `Вчера ты не выполнил ни одной привычки — сегодня самое время начать! 💪`
  if (todayDone > done) return `Уже лучше чем вчера! Вчера было ${done} из ${total} 🔥`
  if (todayDone === done && todayDone > 0)
    return `Идёшь в темпе вчерашнего дня (${done} из ${total}) ✅`
  return `Вчера ты сделал ${done} из ${total} — сможешь сегодня больше?`
})

const challengeProgress = computed(() => {
  if (!lastWeekStats.value) return '0%'
  const pct = Math.round((todayCompleted.value.length / lastWeekStats.value.total) * 100)
  return `${Math.min(pct, 100)}%`
})
</script>

<style scoped>
.home {
  padding: max(80px, env(safe-area-inset-top) + 24px) 24px 100px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* === AI-приветствие === */
.ai-greet {
  background: #141414;
  border: 1px solid #242424;
  border-radius: 18px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 4px;
}
.ai-greet-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ai-greet-eye {
  width: 26px;
  height: auto;
}
.ai-greet-brand {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.18em;
  color: #9a9a92;
}
.ai-greet-text {
  font-size: 15px;
  line-height: 1.55;
  color: #e2e2dc;
  margin: 0;
}
.ai-greet-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ai-greet-primary {
  background: #f5f0e8;
  color: #0a0a0a;
  border: none;
  border-radius: 12px;
  padding: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}
.ai-greet-primary:active {
  transform: scale(0.98);
}
.ai-greet-secondary {
  background: transparent;
  color: #9a9a92;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  padding: 12px;
  font-size: 14px;
  cursor: pointer;
}
.greet-fade-enter-active,
.greet-fade-leave-active {
  transition: opacity 0.4s ease;
}
.greet-fade-enter-from,
.greet-fade-leave-to {
  opacity: 0;
}
.greeting {
  font-size: 14px;
  color: #9a9a92;
  margin: 0 0 6px;
}
.title {
  font-size: 26px;
  font-weight: 600;
  line-height: 1.3;
  color: #ffffff;
  margin: 0;
}
.start-btn {
  background: #f5f0e8;
  color: #0a0a0a;
  border: none;
  border-radius: 16px;
  padding: 18px;
  font-size: 17px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 8px;
}
.start-btn:active {
  opacity: 0.85;
  transform: scale(0.98);
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag {
  background: #1a1a1a;
  color: #f5f0e8;
  font-size: 13px;
  padding: 6px 12px;
  border-radius: 20px;
}
.section-label {
  font-size: 12px;
  color: #9a9a92;
  margin: 0 0 8px;
}
.completed-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.completed-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #9a9a92;
}
.check {
  color: #f5f0e8;
  font-weight: 600;
}
.streak {
  margin-left: auto;
  font-size: 12px;
  color: #f5f0e8;
}
.secondary-btn {
  background: #2a2a2a;
  border: none;
  border-radius: 12px;
  padding: 14px;
  font-size: 15px;
  color: #9a9a92;
  cursor: pointer;
  margin-top: 8px;
}
.challenge-card {
  background: #1a1a1a;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.challenge-label {
  font-size: 12px;
  font-weight: 600;
  color: #f5f0e8;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.challenge-text {
  font-size: 15px;
  color: #f5f0e8;
  margin: 0;
  line-height: 1.4;
}
.challenge-num {
  font-weight: 600;
  color: #f5f0e8;
}
.challenge-bar-wrap {
  width: 100%;
  height: 6px;
  background: #5a5a55;
  border-radius: 10px;
  overflow: hidden;
}
.challenge-bar {
  height: 100%;
  background: #f5f0e8;
  border-radius: 10px;
  transition: width 0.3s ease;
}
.challenge-sub {
  font-size: 12px;
  color: #9a9a92;
  margin: 0;
}
</style>
