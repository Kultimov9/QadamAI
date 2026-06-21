<template>
  <div class="auth-view">
    <div class="auth-content">
      <h1 class="title">Qadam</h1>
      <p class="subtitle">{{ isLogin ? 'Войди в аккаунт' : 'Создай аккаунт' }}</p>

      <input v-model="email" type="email" class="input" placeholder="Email" autocomplete="email" />
      <input
        v-model="password"
        type="password"
        class="input"
        placeholder="Пароль"
        autocomplete="current-password"
      />

      <p v-if="error" class="error">{{ error }}</p>

      <button class="btn" @click="handleAuth" :disabled="loading">
        {{ loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться' }}
      </button>

      <button class="switch-btn" @click="isLogin = !isLogin">
        {{ isLogin ? 'Нет аккаунта? Создать' : 'Уже есть аккаунт? Войти' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { useHabitsStore } from '../stores/habits'

const router = useRouter()
const store = useHabitsStore()

const email = ref('')
const password = ref('')
const isLogin = ref(true)
const loading = ref(false)
const error = ref('')

async function handleAuth() {
  error.value = ''
  if (!email.value || !password.value) {
    error.value = 'Заполни email и пароль'
    return
  }

  loading.value = true

  try {
    if (isLogin.value) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value,
      })
      if (signInError) throw signInError
    } else {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
      })
      if (signUpError) throw signUpError
    }

    router.replace('/')
  } catch (e) {
    error.value = e.message || 'Что-то пошло не так'
  }

  loading.value = false
}
</script>

<style scoped>
.auth-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(160deg, #1a1040 0%, #2d1f6e 50%, #3d2a8a 100%);
}
.auth-content {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.title {
  font-size: 36px;
  font-weight: 700;
  color: #fff;
  text-align: center;
  margin: 0;
}
.subtitle {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  margin: 0 0 16px;
}
.input {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 14px;
  padding: 14px 16px;
  font-size: 15px;
  color: #fff;
  outline: none;
}
.input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}
.input:focus {
  border-color: rgba(255, 255, 255, 0.5);
}
.error {
  color: #ff8a8a;
  font-size: 13px;
  text-align: center;
  margin: 0;
}
.btn {
  background: #fff;
  color: #534ab7;
  border: none;
  border-radius: 14px;
  padding: 16px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
}
.btn:disabled {
  opacity: 0.6;
}
.btn:active:not(:disabled) {
  transform: scale(0.98);
}
.switch-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  cursor: pointer;
  padding: 8px;
}
</style>
