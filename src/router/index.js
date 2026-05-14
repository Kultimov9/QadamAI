import { createRouter, createWebHistory } from 'vue-router'
import { useHabitsStore } from '../stores/habits'
import HomeView from '../views/HomeView.vue'
import TimerView from '../views/TimerView.vue'
import HabitsView from '../views/HabitsView.vue'
import ReflectionView from '../views/ReflectionView.vue'
import OnboardingView from '../views/OnboardingView.vue'
import ProgressView from '../views/ProgressView.vue'
import TasksView from '../views/TasksView.vue'
import AIView from '../views/AIView.vue'

const routes = [
  { path: '/', component: HomeView },
  { path: '/timer/:id', component: TimerView },
  { path: '/habits', component: HabitsView },
  { path: '/reflection', component: ReflectionView },
  { path: '/onboarding', component: OnboardingView },
  { path: '/progress', component: ProgressView },
  { path: '/tasks', component: TasksView },
  { path: '/ai', component: AIView },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const store = useHabitsStore()
  if (!store.onboarded && to.path !== '/onboarding') {
    return '/onboarding'
  }
})

export default router
