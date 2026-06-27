<template>
  <div class="onboarding" :class="step === 2 ? 'light' : 'dark'">
    <div class="slide" v-if="step === 0">
      <div class="icon-wrap">🚀</div>
      <h1 class="title">Начни с малого</h1>
      <p class="desc">
        Не нужно менять всё сразу. Одно маленькое действие в день — и через месяц ты не узнаешь
        себя.
      </p>
      <button class="btn" @click="step++">Далее</button>
    </div>

    <div class="slide" v-if="step === 1">
      <div class="icon-wrap">⚡</div>
      <h1 class="title">Барьер — ноль</h1>
      <p class="desc">
        Нажал одну кнопку — уже начал. Можешь остановиться через минуту. Главное — начать.
      </p>
      <button class="btn" @click="step++">Далее</button>
    </div>

    <div class="slide" v-if="step === 2">
      <div class="slide-header">
        <div class="icon-wrap light-icon">✨</div>
        <h1 class="title light-title">Выбери привычки</h1>
        <p class="desc light-desc">Выбери с чего начнёшь. Можно добавить свои позже.</p>
      </div>
      <div class="habit-grid">
        <button
          v-for="habit in defaultHabits"
          :key="habit.name"
          class="habit-option"
          :class="{ selected: selectedHabits.includes(habit) }"
          @click="toggleHabit(habit)"
        >
          <span class="habit-emoji">{{ habit.emoji }}</span>
          <span class="habit-name">{{ habit.name }}</span>
          <span class="habit-duration">{{ habit.duration }} мин</span>
        </button>
      </div>
      <p v-if="selectedHabits.length === 0" class="hint">Выбери хотя бы одну привычку</p>
      <button class="btn light-btn" :disabled="selectedHabits.length === 0" @click="finish">
        Начать →
      </button>
    </div>

    <div class="dots">
      <span
        v-for="i in 3"
        :key="i"
        class="dot"
        :class="{ active: step === i - 1, 'dot-light': step === 2 }"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useHabitsStore } from '../stores/habits'

const router = useRouter()
const store = useHabitsStore()
const step = ref(0)

const defaultHabits = [
  { emoji: '🏃', name: 'Пробежка', duration: 5 },
  { emoji: '💧', name: 'Выпить воду', duration: 1 },
  { emoji: '📝', name: 'Заметка дня', duration: 3 },
  { emoji: '🧘', name: 'Медитация', duration: 5 },
  { emoji: '📚', name: 'Чтение', duration: 10 },
  { emoji: '💪', name: 'Зарядка', duration: 7 },
  { emoji: '🚶', name: 'Прогулка', duration: 15 },
  { emoji: '😴', name: 'Режим сна', duration: 1 },
]

const selectedHabits = ref([])

function toggleHabit(habit) {
  const idx = selectedHabits.value.indexOf(habit)
  if (idx === -1) selectedHabits.value.push(habit)
  else selectedHabits.value.splice(idx, 1)
}

async function finish() {
  for (const h of selectedHabits.value) {
    await store.addHabit(h.name, h.emoji, h.duration)
  }
  await store.setOnboarded()
  router.replace('/')
}
</script>

<style scoped>
.onboarding {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: background 0.4s ease;
}

.onboarding.dark {
  background: linear-gradient(160deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%);
}

.onboarding.light {
  background: #0a0a0a;
}

.slide {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 28px 20px;
  text-align: center;
  gap: 16px;
}

.icon-wrap {
  font-size: 90px;
  line-height: 1;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.2));
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

.title {
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  margin: 0;
  line-height: 1.2;
}

.desc {
  font-size: 17px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  margin: 0;
  max-width: 300px;
}

.btn {
  width: 100%;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 18px;
  padding: 18px;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 12px;
  transition: all 0.2s;
}

.btn:active {
  transform: scale(0.97);
  background: rgba(255, 255, 255, 0.25);
}

.slide-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding-top: 60px;
  padding-bottom: 8px;
}

.light-icon {
  filter: none;
  animation: none;
}

.light-title {
  color: #ffffff !important;
  font-size: 28px;
}

.light-desc {
  color: #9a9a92 !important;
  font-size: 15px;
}

.habit-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  width: 100%;
  padding: 0 24px;
}

.habit-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: #1a1a1a;
  border: 2px solid transparent;
  border-radius: 16px;
  padding: 14px 10px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.2s;
}

.habit-option.selected {
  border-color: #f5f0e8;
  background: #2a2a2a;
}

.habit-option:active {
  transform: scale(0.97);
}
.habit-emoji {
  font-size: 28px;
}
.habit-name {
  font-size: 13px;
  font-weight: 500;
  color: #ffffff;
}
.habit-duration {
  font-size: 11px;
  color: #9a9a92;
}

.hint {
  font-size: 13px;
  color: #9a9a92;
  margin: 0;
  padding: 0 24px;
}

.light-btn {
  background: #f5f0e8 !important;
  border: none !important;
  color: #0a0a0a !important;
  margin: 0 24px;
  width: calc(100% - 48px);
}

.light-btn:disabled {
  background: #2a2a2a !important;
  cursor: default;
}

.dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 16px 0 48px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transition: all 0.3s;
}

.dot.active {
  background: #fff;
  width: 24px;
  border-radius: 4px;
}
.dot.dot-light {
  background: #2a2a2a;
}
.dot.dot-light.active {
  background: #f5f0e8;
}
</style>
