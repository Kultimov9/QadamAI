<template>
  <div class="onboarding">
    <div class="slide" v-if="step === 0">
      <div class="big-emoji">🚀</div>
      <h1 class="title">Начни с малого</h1>
      <p class="desc">
        Не нужно менять всё сразу. Одно маленькое действие в день — и через месяц ты не узнаешь
        себя.
      </p>
      <button class="btn" @click="step++">Далее</button>
    </div>

    <div class="slide" v-if="step === 1">
      <div class="big-emoji">⚡</div>
      <h1 class="title">Барьер — ноль</h1>
      <p class="desc">
        Нажал одну кнопку — уже начал. Можешь остановиться через минуту. Главное — начать.
      </p>
      <button class="btn" @click="step++">Далее</button>
    </div>

    <div class="slide" v-if="step === 2">
      <div class="big-emoji">✨</div>
      <h1 class="title">Выбери привычки</h1>
      <p class="desc">Выбери с чего начнёшь. Можно добавить свои позже.</p>
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
      <button class="btn" :disabled="selectedHabits.length === 0" @click="finish">Начать →</button>
    </div>

    <div class="dots">
      <span v-for="i in 3" :key="i" class="dot" :class="{ active: step === i - 1 }" />
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

function finish() {
  store.habits = []
  selectedHabits.value.forEach((h, index) => {
    store.habits.push({
      id: index + 1,
      name: h.name,
      emoji: h.emoji,
      duration: h.duration,
      streak: 0,
      completedDates: [],
    })
  })
  store.setOnboarded()
  router.replace('/')
}
</script>

<style scoped>
.onboarding {
  min-height: 100vh;
  padding: 60px 24px 40px;
  display: flex;
  flex-direction: column;
  background: #f9f9f7;
}
.slide {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  flex: 1;
  justify-content: center;
  text-align: center;
  padding-bottom: 20px;
}
.big-emoji {
  font-size: 72px;
}
.title {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}
.desc {
  font-size: 16px;
  color: #888;
  line-height: 1.6;
  margin: 0;
  max-width: 300px;
}
.habit-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  width: 100%;
  margin: 8px 0;
}
.habit-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: #fff;
  border: 2px solid transparent;
  border-radius: 16px;
  padding: 14px 10px;
  cursor: pointer;
}
.habit-option.selected {
  border-color: #534ab7;
  background: #eeedfe;
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
  color: #1a1a1a;
}
.habit-duration {
  font-size: 11px;
  color: #aaa;
}
.btn {
  width: 100%;
  background: #534ab7;
  color: #fff;
  border: none;
  border-radius: 16px;
  padding: 18px;
  font-size: 17px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 8px;
}
.btn:disabled {
  background: #ccc;
  cursor: default;
}
.btn:active:not(:disabled) {
  transform: scale(0.98);
}
.dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 16px 0 40px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ddd;
}
.dot.active {
  background: #534ab7;
}
</style>
