import { createRouter, createWebHistory } from 'vue-router'
import { useHabitsStore } from '../stores/habits'
import { supabase } from '../lib/supabase'
import HomeView from '../views/HomeView.vue'
import TimerView from '../views/TimerView.vue'
import HabitsView from '../views/HabitsView.vue'
import ReflectionView from '../views/ReflectionView.vue'
import OnboardingView from '../views/OnboardingView.vue'
import TasksView from '../views/TasksView.vue'
import AIView from '../views/AIView.vue'
import AuthView from '../views/AuthView.vue'

const routes = [
  { path: '/', component: HomeView },
  { path: '/timer/:id', component: TimerView },
  { path: '/habits', component: HabitsView },
  { path: '/reflection', component: ReflectionView },
  { path: '/onboarding', component: OnboardingView },
  { path: '/tasks', component: TasksView },
  { path: '/ai', component: AIView },
  { path: '/auth', component: AuthView },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const store = useHabitsStore()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session && to.path !== '/auth') {
    return '/auth'
  }

  if (session && to.path === '/auth') {
    return '/'
  }

  if (session && !store.onboarded && to.path !== '/onboarding' && to.path !== '/auth') {
    return '/onboarding'
  }
})

export default router
