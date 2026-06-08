<template>
  <div class="tasks-view">
    <div class="page-header">
      <div class="tabs">
        <button class="tab" :class="{ active: activeTab === 'tasks' }" @click="activeTab = 'tasks'">
          Задачи
        </button>
        <button class="tab" :class="{ active: activeTab === 'goals' }" @click="activeTab = 'goals'">
          Цели
        </button>
      </div>
    </div>
    <div class="content">
      <template v-if="activeTab === 'tasks'">
        <div class="header">
          <h1 class="title">Задачи на сегодня</h1>
          <p class="subtitle">{{ completedCount }} из {{ totalCount }} выполнено</p>
        </div>

        <div class="progress-bar-wrap">
          <div class="progress-bar" :style="{ width: progressWidth }" />
        </div>

        <div class="add-row">
          <input
            v-model="newTask"
            class="task-input"
            placeholder="Добавить задачу..."
            @keydown.enter="addTask"
          />
          <button class="add-btn" @click="addTask">
            <Plus :size="20" />
          </button>
        </div>

        <div v-if="pendingTasks.length > 0" class="section">
          <p class="section-label">Осталось</p>
          <div class="task-list">
            <div
              v-for="task in pendingTasks"
              :key="task.id"
              class="task-card"
              @click="store.toggleTask(task.id)"
            >
              <div class="checkbox" />
              <span class="task-text">{{ task.text }}</span>
              <button class="delete-btn" @click.stop="store.removeTask(task.id)">
                <Trash2 :size="15" />
              </button>
            </div>
          </div>
        </div>

        <div v-if="doneTasks.length > 0" class="section">
          <p class="section-label">Готово</p>
          <div class="task-list">
            <div
              v-for="task in doneTasks"
              :key="task.id"
              class="task-card done"
              @click="store.toggleTask(task.id)"
            >
              <div class="checkbox checked">
                <Check :size="12" color="#fff" />
              </div>
              <span class="task-text">{{ task.text }}</span>
              <button class="delete-btn" @click.stop="store.removeTask(task.id)">
                <Trash2 :size="15" />
              </button>
            </div>
          </div>
        </div>

        <div v-if="totalCount === 0" class="empty">
          <p class="empty-text">Добавь первую задачу на сегодня</p>
        </div>

        <div v-if="totalCount > 0 && completedCount === totalCount" class="congrats">
          <p class="congrats-text">🎉 Все задачи выполнены!</p>
        </div>
      </template>

      <template v-if="activeTab === 'goals'">
        <div class="header">
          <h1 class="title">Ближайшие цели</h1>
          <p class="subtitle">
            {{ store.goals.filter((g) => goalProgress(g) === 100).length }} из
            {{ store.goals.length }} достигнуто
          </p>
        </div>

        <div class="add-goal-form">
          <input v-model="newGoalTitle" class="task-input" placeholder="Название цели..." />
          <div class="add-row" style="margin-top: 8px">
            <input v-model="newGoalDeadline" class="task-input" type="date" />
            <button class="add-btn" @click="addGoal">
              <Plus :size="20" />
            </button>
          </div>
        </div>

        <div v-if="store.goals.length === 0" class="empty">
          <p class="empty-text">Добавь первую цель</p>
        </div>

        <div class="goal-list">
          <div
            v-for="goal in sortedGoals"
            :key="goal.id"
            class="goal-card"
            :class="deadlineClass(goal)"
          >
            <div class="goal-header">
              <div class="goal-title-row">
                <span class="goal-title">{{ goal.title }}</span>
                <button class="delete-btn" @click="store.removeGoal(goal.id)">
                  <Trash2 :size="15" />
                </button>
              </div>
              <div class="goal-meta">
                <span class="deadline-badge" :class="deadlineClass(goal)">
                  📅 {{ formatDeadline(goal) }}
                </span>
                <span class="progress-text">{{ goalProgress(goal) }}%</span>
              </div>
            </div>

            <div class="goal-progress-wrap">
              <div
                class="goal-progress-bar"
                :style="{ width: goalProgress(goal) + '%' }"
                :class="deadlineClass(goal)"
              />
            </div>

            <div class="steps-list">
              <div
                v-for="step in goal.steps"
                :key="step.id"
                class="step-row"
                @click="store.toggleStep(goal.id, step.id)"
              >
                <div class="checkbox" :class="{ checked: step.done }">
                  <Check v-if="step.done" :size="12" color="#fff" />
                </div>
                <span class="step-text" :class="{ done: step.done }">{{ step.text }}</span>
                <button class="delete-btn" @click.stop="store.removeStep(goal.id, step.id)">
                  <Trash2 :size="13" />
                </button>
              </div>
            </div>

            <div class="add-step-row">
              <input
                v-model="newSteps[goal.id]"
                class="step-input"
                placeholder="Добавить шаг..."
                @keydown.enter="addStep(goal.id)"
              />
              <button class="add-step-btn" @click="addStep(goal.id)">
                <Plus :size="16" />
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useHabitsStore } from '../stores/habits'
import { Plus, Trash2, Check } from 'lucide-vue-next'

const store = useHabitsStore()
store.clearOldTasks()

const activeTab = ref('tasks')

const newTask = ref('')
const newGoalTitle = ref('')
const newGoalDeadline = ref('')
const newSteps = ref({})

const pendingTasks = computed(() => store.todayTasks.filter((t) => !t.done))
const doneTasks = computed(() => store.todayTasks.filter((t) => t.done))
const totalCount = computed(() => store.todayTasks.length)
const completedCount = computed(() => doneTasks.value.length)
const progressWidth = computed(() => {
  if (totalCount.value === 0) return '0%'
  return `${Math.round((completedCount.value / totalCount.value) * 100)}%`
})

function addTask() {
  if (!newTask.value.trim()) return
  store.addTask(newTask.value.trim())
  newTask.value = ''
}

function addGoal() {
  if (!newGoalTitle.value.trim() || !newGoalDeadline.value) return
  store.addGoal(newGoalTitle.value.trim(), newGoalDeadline.value)
  newGoalTitle.value = ''
  newGoalDeadline.value = ''
}

function addStep(goalId) {
  const text = newSteps.value[goalId]
  if (!text?.trim()) return
  store.addStep(goalId, text.trim())
  newSteps.value[goalId] = ''
}

function goalProgress(goal) {
  if (!goal.steps.length) return 0
  return Math.round((goal.steps.filter((s) => s.done).length / goal.steps.length) * 100)
}

function daysLeft(deadline) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(deadline)
  return Math.ceil((d - today) / (1000 * 60 * 60 * 24))
}

function deadlineClass(goal) {
  if (goalProgress(goal) === 100) return 'completed'
  const days = daysLeft(goal.deadline)
  if (days < 0) return 'overdue'
  if (days <= 3) return 'urgent'
  return 'normal'
}

function formatDeadline(goal) {
  if (goalProgress(goal) === 100) return 'выполнено!'
  const days = daysLeft(goal.deadline)
  if (days < 0) return `просрочено на ${Math.abs(days)} дн.`
  if (days === 0) return 'сегодня!'
  if (days === 1) return 'завтра'
  return `через ${days} дн.`
}

const sortedGoals = computed(() =>
  [...store.goals].sort((a, b) => new Date(a.deadline) - new Date(b.deadline)),
)
</script>

<style scoped>
.tasks-view {
  padding: 0 0 100px;
  /* padding: max(80px, env(safe-area-inset-top) + 24px) 24px 100px;
  display: flex;
  flex-direction: column;
  gap: 16px; */
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
.header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.title {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}
.subtitle {
  font-size: 14px;
  color: #aaa;
  margin: 0;
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
  transition: width 0.3s ease;
}
.add-row {
  display: flex;
  gap: 10px;
  align-items: center;
}
.task-input {
  flex: 1;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 15px;
  outline: none;
  background: #fff;
  color: #1a1a1a;
  width: 100%;
}
.task-input:focus {
  border-color: #534ab7;
}
.add-btn {
  width: 44px;
  height: 44px;
  background: #534ab7;
  border: none;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  flex-shrink: 0;
}
.add-btn:active {
  transform: scale(0.95);
}
.section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.section-label {
  font-size: 12px;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}
.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.task-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border-radius: 14px;
  padding: 14px 16px;
  border: 1px solid #f0f0ee;
  cursor: pointer;
}
.task-card:active {
  transform: scale(0.98);
}
.task-card.done {
  opacity: 0.5;
}
.checkbox {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #ddd;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.checkbox.checked {
  background: #534ab7;
  border-color: #534ab7;
}
.task-text {
  flex: 1;
  font-size: 15px;
  color: #1a1a1a;
}
.task-card.done .task-text {
  text-decoration: line-through;
  color: #aaa;
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
.empty {
  text-align: center;
  padding: 40px 0;
}
.empty-text {
  font-size: 15px;
  color: #ccc;
}
.congrats {
  text-align: center;
  padding: 16px;
  background: #eeedfe;
  border-radius: 16px;
}
.congrats-text {
  font-size: 16px;
  color: #534ab7;
  font-weight: 500;
}
.add-goal-form {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.goal-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.goal-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  border: 1px solid #f0f0ee;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.goal-card.urgent {
  border-color: #fac775;
}
.goal-card.overdue {
  border-color: #f09595;
}
.goal-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.goal-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.goal-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}
.goal-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.deadline-badge {
  font-size: 12px;
  color: #888;
}
.deadline-badge.urgent {
  color: #ba7517;
}
.deadline-badge.overdue {
  color: #a32d2d;
}
.progress-text {
  font-size: 12px;
  font-weight: 600;
  color: #534ab7;
}
.goal-progress-wrap {
  width: 100%;
  height: 6px;
  background: #f0f0ee;
  border-radius: 10px;
  overflow: hidden;
}
.goal-progress-bar {
  height: 100%;
  background: #534ab7;
  border-radius: 10px;
  transition: width 0.3s ease;
}
.goal-progress-bar.urgent {
  background: #ba7517;
}
.goal-progress-bar.overdue {
  background: #a32d2d;
}
.steps-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.step-row {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.step-text {
  flex: 1;
  font-size: 14px;
  color: #333;
}
.step-text.done {
  text-decoration: line-through;
  color: #aaa;
}
.add-step-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.step-input {
  flex: 1;
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 14px;
  outline: none;
  background: #f9f9f7;
}
.step-input:focus {
  border-color: #534ab7;
}
.add-step-btn {
  width: 34px;
  height: 34px;
  background: #eeedfe;
  border: none;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #534ab7;
  flex-shrink: 0;
}
.goal-card.completed {
  border-color: #1d9e75;
}
.deadline-badge.completed {
  color: #1d9e75;
}
.goal-progress-bar.completed {
  background: #1d9e75;
}
.page-header {
  position: sticky;
  top: 7px;
  background: #f9f9f7;
  padding-top: max(env(safe-area-inset-top), 54px);
  padding-left: 24px;
  padding-right: 24px;
  padding-bottom: 12px;
  z-index: 10;
}
.content {
  padding: 0 24px 100px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
