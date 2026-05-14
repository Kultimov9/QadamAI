<template>
  <div class="habits-view">
    <h1 class="title">Привычки</h1>

    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'habits' }" @click="activeTab = 'habits'">
        Привычки
      </button>
      <button
        class="tab"
        :class="{ active: activeTab === 'progress' }"
        @click="activeTab = 'progress'"
      >
        Прогресс
      </button>
    </div>

    <template v-if="activeTab === 'habits'">
      <div class="section">
        <p class="section-label">Сегодня осталось</p>
        <div class="habit-list">
          <div
            v-for="habit in pendingHabits"
            :key="habit.id"
            class="habit-card"
            @click="router.push(`/timer/${habit.id}`)"
          >
            <span class="emoji">{{ habit.emoji }}</span>
            <div class="info">
              <p class="name">{{ habit.name }}</p>
              <p class="duration">{{ habit.duration }} мин</p>
            </div>
            <button class="delete-btn" @click.stop="confirmDelete(habit)">
              <Trash2 :size="16" />
            </button>
          </div>
        </div>
      </div>

      <div v-if="completedHabits.length > 0" class="section">
        <p class="section-label">Сделано сегодня</p>
        <div class="habit-list">
          <div v-for="habit in completedHabits" :key="habit.id" class="habit-card done">
            <span class="emoji">{{ habit.emoji }}</span>
            <div class="info">
              <p class="name">{{ habit.name }}</p>
              <p class="streak">🔥 {{ habit.streak }} дней подряд</p>
            </div>
            <button class="delete-btn" @click.stop="confirmDelete(habit)">
              <Trash2 :size="16" />
            </button>
          </div>
        </div>
      </div>

      <div class="section">
        <p class="section-label">Добавить привычку</p>
        <div class="add-form">
          <div class="form-row">
            <input v-model="newEmoji" class="emoji-input" placeholder="😀" maxlength="2" />
            <input v-model="newName" class="name-input" placeholder="Название" />
          </div>
          <div class="form-row">
            <label class="duration-label">Минут: {{ newDuration }}</label>
            <input v-model="newDuration" type="range" min="1" max="60" class="slider" />
          </div>
          <button class="add-btn" @click="addHabit">Добавить</button>
        </div>
      </div>

      <div class="section">
        <p class="section-label">Уведомления</p>
        <div class="notif-card">
          <div class="notif-row">
            <span class="notif-label">🌅 Утреннее напоминание</span>
            <select
              class="time-select"
              :value="store.notifications.morningHour"
              @change="updateNotif('morningHour', $event.target.value)"
            >
              <option v-for="h in hours" :key="h" :value="h">{{ h }}:00</option>
            </select>
          </div>
          <div class="notif-row">
            <span class="notif-label">🌙 Вечернее напоминание</span>
            <select
              class="time-select"
              :value="store.notifications.eveningHour"
              @change="updateNotif('eveningHour', $event.target.value)"
            >
              <option v-for="h in hours" :key="h" :value="h">{{ h }}:00</option>
            </select>
          </div>
        </div>
      </div>
    </template>

    <template v-if="activeTab === 'progress'">
      <div class="stats-grid">
        <div class="stat-card">
          <p class="stat-num">{{ totalCompleted }}</p>
          <p class="stat-label">всего выполнено</p>
        </div>
        <div class="stat-card">
          <p class="stat-num">{{ bestStreak }}</p>
          <p class="stat-label">лучший streak</p>
        </div>
        <div class="stat-card">
          <p class="stat-num">{{ activeDays }}</p>
          <p class="stat-label">активных дней</p>
        </div>
        <div class="stat-card">
          <p class="stat-num">{{ store.habits.length }}</p>
          <p class="stat-label">привычек</p>
        </div>
      </div>

      <div class="section">
        <p class="section-label">График за 14 дней</p>
        <ProgressChart />
      </div>

      <div class="section">
        <p class="section-label">Активность за 7 дней</p>
        <div class="bar-chart">
          <div v-for="day in last7Days" :key="day.date" class="bar-col">
            <div class="bar-wrap">
              <div
                class="bar"
                :style="{ height: barHeight(day.count) }"
                :class="{ active: day.count > 0 }"
              />
            </div>
            <span class="bar-label">{{ day.label }}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <p class="section-label">По привычкам</p>
        <div class="habit-stats">
          <div v-for="habit in habitStats" :key="habit.id" class="habit-stat-card">
            <div class="habit-stat-top">
              <span class="habit-emoji">{{ habit.emoji }}</span>
              <span class="habit-name-stat">{{ habit.name }}</span>
              <span class="habit-streak-stat">🔥 {{ habit.streak }}</span>
            </div>
            <div class="progress-bar-wrap">
              <div
                class="progress-bar"
                :style="{ width: habitProgress(habit.completedDates.length) }"
              />
            </div>
            <p class="habit-count">{{ habit.completedDates.length }} дней выполнено</p>
          </div>
        </div>
      </div>
    </template>

    <div v-if="habitToDelete" class="modal-overlay" @click="habitToDelete = null">
      <div class="modal" @click.stop>
        <p class="modal-title">Удалить привычку?</p>
        <p class="modal-desc">«{{ habitToDelete.name }}» и весь прогресс будут удалены.</p>
        <div class="modal-actions">
          <button class="modal-cancel" @click="habitToDelete = null">Отмена</button>
          <button class="modal-confirm" @click="deleteHabit">Удалить</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useHabitsStore } from '../stores/habits'
import { setupNotifications } from '../composables/useNotifications'
import { Trash2 } from 'lucide-vue-next'
import ProgressChart from '../components/ProgressChart.vue'

const router = useRouter()
const store = useHabitsStore()
const activeTab = ref('habits')

const pendingHabits = computed(() => store.todayPending)
const completedHabits = computed(() => store.todayCompleted)

const newEmoji = ref('⭐')
const newName = ref('')
const newDuration = ref(5)
const habitToDelete = ref(null)

function addHabit() {
  if (!newName.value.trim()) return
  store.addHabit(newName.value.trim(), newEmoji.value, Number(newDuration.value))
  newName.value = ''
  newEmoji.value = '⭐'
  newDuration.value = 5
}

function confirmDelete(habit) {
  habitToDelete.value = habit
}
function deleteHabit() {
  store.removeHabit(habitToDelete.value.id)
  habitToDelete.value = null
}

const hours = Array.from({ length: 24 }, (_, i) => i)
function updateNotif(type, value) {
  store.setNotificationTime(type, Number(value))
  setupNotifications()
}

// прогресс
const totalCompleted = computed(() =>
  store.habits.reduce((sum, h) => sum + h.completedDates.length, 0),
)
const bestStreak = computed(() => Math.max(0, ...store.habits.map((h) => h.streak)))
const activeDays = computed(() => new Set(store.habits.flatMap((h) => h.completedDates)).size)

const last7Days = computed(() => {
  const labels = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    return {
      date: dateStr,
      count: store.habits.filter((h) => h.completedDates.includes(dateStr)).length,
      label: labels[d.getDay()],
    }
  })
})

const maxCount = computed(() => Math.max(1, ...last7Days.value.map((d) => d.count)))
function barHeight(count) {
  if (count === 0) return '4px'
  return `${Math.round((count / maxCount.value) * 100)}%`
}

const habitStats = computed(() =>
  [...store.habits].sort((a, b) => b.completedDates.length - a.completedDates.length),
)
const maxCompleted = computed(() =>
  Math.max(1, ...store.habits.map((h) => h.completedDates.length)),
)
function habitProgress(count) {
  return `${Math.round((count / maxCompleted.value) * 100)}%`
}
</script>

<style scoped>
.habits-view {
  padding: 60px 24px 100px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.title {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}
.tabs {
  display: flex;
  background: #f0f0ee;
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
}
.tab {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  background: transparent;
  color: #aaa;
  transition: all 0.2s;
}
.tab.active {
  background: #fff;
  color: #534ab7;
}
.section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.section-label {
  font-size: 12px;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}
.habit-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.habit-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fff;
  border-radius: 16px;
  padding: 14px 16px;
  border: 1px solid #f0f0ee;
  cursor: pointer;
}
.habit-card:active {
  transform: scale(0.98);
}
.habit-card.done {
  opacity: 0.5;
  cursor: default;
}
.emoji {
  font-size: 28px;
}
.info {
  flex: 1;
}
.name {
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
  margin: 0;
}
.duration,
.streak {
  font-size: 12px;
  color: #aaa;
  margin: 2px 0 0;
}
.streak {
  color: #f59e0b;
}
.delete-btn {
  background: none;
  border: none;
  color: #ddd;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
}
.delete-btn:active {
  color: #ff4444;
}
.add-form {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  border: 1px solid #f0f0ee;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.form-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.emoji-input {
  width: 48px;
  font-size: 24px;
  text-align: center;
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 8px;
  outline: none;
}
.name-input {
  flex: 1;
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 15px;
  outline: none;
}
.duration-label {
  font-size: 13px;
  color: #888;
  min-width: 70px;
}
.slider {
  flex: 1;
}
.add-btn {
  background: #534ab7;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 14px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}
.notif-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  border: 1px solid #f0f0ee;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.notif-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.notif-label {
  font-size: 14px;
  color: #333;
}
.time-select {
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 14px;
  color: #534ab7;
  outline: none;
  background: #eeedfe;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.stat-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  border: 1px solid #f0f0ee;
  text-align: center;
}
.stat-num {
  font-size: 32px;
  font-weight: 600;
  color: #534ab7;
  margin: 0;
}
.stat-label {
  font-size: 12px;
  color: #aaa;
  margin: 4px 0 0;
}
.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  border: 1px solid #f0f0ee;
  height: 140px;
}
.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  height: 100%;
}
.bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
}
.bar {
  width: 100%;
  background: #f0f0ee;
  border-radius: 6px;
  min-height: 4px;
}
.bar.active {
  background: #534ab7;
}
.bar-label {
  font-size: 11px;
  color: #aaa;
}
.habit-stats {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.habit-stat-card {
  background: #fff;
  border-radius: 16px;
  padding: 14px 16px;
  border: 1px solid #f0f0ee;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.habit-stat-top {
  display: flex;
  align-items: center;
  gap: 10px;
}
.habit-emoji {
  font-size: 22px;
}
.habit-name-stat {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}
.habit-streak-stat {
  font-size: 13px;
  color: #f59e0b;
}
.progress-bar-wrap {
  width: 100%;
  height: 6px;
  background: #f0f0ee;
  border-radius: 10px;
  overflow: hidden;
}
.progress-bar {
  height: 100%;
  background: #534ab7;
  border-radius: 10px;
  min-width: 4px;
}
.habit-count {
  font-size: 11px;
  color: #aaa;
  margin: 0;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 24px;
}
.modal {
  background: #fff;
  border-radius: 20px;
  padding: 24px;
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.modal-title {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}
.modal-desc {
  font-size: 14px;
  color: #888;
  margin: 0;
}
.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}
.modal-cancel {
  flex: 1;
  background: #f0f0ee;
  border: none;
  border-radius: 12px;
  padding: 14px;
  font-size: 15px;
  color: #555;
  cursor: pointer;
}
.modal-confirm {
  flex: 1;
  background: #ff4444;
  border: none;
  border-radius: 12px;
  padding: 14px;
  font-size: 15px;
  color: #fff;
  font-weight: 500;
  cursor: pointer;
}
</style>
