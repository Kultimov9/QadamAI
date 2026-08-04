<template>
  <div class="profile-view">
    <div class="page-header">
      <button class="back-btn" @click="router.replace('/')">← Назад</button>
      <h1 class="title">Профиль</h1>
    </div>

    <div class="content">
      <!-- Аватар -->
      <button class="avatar-big" :class="{ img: store.avatarUrl }" @click="pickAvatar">
        <img v-if="store.avatarUrl" :src="store.avatarUrl" alt="" />
        <span v-else class="avatar-letter">{{ avatarLetter }}</span>
        <span class="avatar-edit">{{ uploading ? '...' : 'Изменить фото' }}</span>
      </button>
      <p v-if="avatarError" class="field-error">{{ avatarError }}</p>

      <!-- Никнейм -->
      <div class="section">
        <p class="section-label">Никнейм</p>
        <div class="nick-row">
          <input
            v-model="nick"
            class="nick-input"
            placeholder="никнейм"
            autocapitalize="off"
            autocomplete="off"
            @input="nickError = ''; nickSaved = false"
          />
          <button class="save-btn" :disabled="saving || !nick.trim()" @click="saveNick">
            {{ saving ? '...' : 'Сохранить' }}
          </button>
        </div>
        <p v-if="nickError" class="field-error">{{ nickError }}</p>
        <p v-else-if="nickSaved" class="field-ok">Сохранено</p>
        <p v-else class="field-hint">3–20 символов: латиница, цифры, _</p>
      </div>

      <button class="nav-row" @click="router.push('/friends')">
        <span class="nav-icon"><Users :size="18" /></span>
        <span class="nav-label">Друзья</span>
        <span class="nav-right">
          <span v-if="friends.incomingCount" class="badge">{{ friends.incomingCount }}</span>
          <span class="chevron">›</span>
        </span>
      </button>

      <p class="email">{{ store.email }}</p>

      <button class="logout-btn" @click="logout">Выйти из аккаунта</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Users } from 'lucide-vue-next'
import { useHabitsStore } from '../stores/habits'
import { useFriendsStore } from '../stores/friends'
import { logEvent } from '../composables/useAnalytics'

const router = useRouter()
const store = useHabitsStore()
const friends = useFriendsStore()

const nick = ref(store.username || '')
const saving = ref(false)
const nickError = ref('')
const nickSaved = ref(false)
const uploading = ref(false)
const avatarError = ref('')

const avatarLetter = computed(() =>
  (store.username || store.email || '?').charAt(0).toUpperCase(),
)

onMounted(() => {
  logEvent('profile_opened', {})
  friends.fetchFriends()
})

async function pickAvatar() {
  if (uploading.value) return
  avatarError.value = ''
  try {
    const photo = await Camera.getPhoto({
      source: CameraSource.Photos,
      resultType: CameraResultType.DataUrl,
      quality: 90,
    })
    if (!photo?.dataUrl) return
    uploading.value = true
    const res = await store.uploadAvatar(photo.dataUrl)
    if (!res.ok) avatarError.value = res.error
  } catch (e) {
    const msg = e?.message || String(e)
    // Пользователь отменил выбор — не ошибка.
    if (/cancel/i.test(msg)) return
    // Показываем реальную причину, чтобы диагностировать.
    avatarError.value = msg
    console.error('pickAvatar error:', e)
  } finally {
    uploading.value = false
  }
}

async function saveNick() {
  nickError.value = ''
  nickSaved.value = false
  saving.value = true
  const res = await store.updateUsername(nick.value)
  saving.value = false
  if (res.ok) {
    nick.value = store.username
    nickSaved.value = true
  } else {
    nickError.value = res.error
  }
}

async function logout() {
  await store.logout()
  router.replace('/auth')
}
</script>

<style scoped>
.profile-view {
  min-height: 100vh;
  background: #0a0a0a;
}
.page-header {
  position: sticky;
  top: 0;
  background: #0a0a0a;
  padding: max(env(safe-area-inset-top), 54px) 24px 12px;
  z-index: 10;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
}
.back-btn {
  justify-self: start;
  background: none;
  border: none;
  color: #f5f0e8;
  font-size: 15px;
  cursor: pointer;
  padding: 0;
}
.title {
  justify-self: center;
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
}
.content {
  padding: 24px 24px 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.avatar-big {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: #141414;
  border: 1px solid #242424;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  padding: 0;
  margin-top: 8px;
}
.avatar-big img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar-letter {
  font-size: 40px;
  font-weight: 700;
  color: #f5f0e8;
}
.avatar-edit {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.55);
  color: #f5f0e8;
  font-size: 10px;
  padding: 4px 0;
}
.section {
  width: 100%;
  margin-top: 8px;
}
.section-label {
  font-size: 13px;
  color: #9a9a92;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 10px;
}
.nick-row {
  display: flex;
  gap: 8px;
}
.nick-input {
  flex: 1;
  background: #141414;
  border: 1px solid #242424;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 15px;
  color: #ffffff;
  outline: none;
}
.nick-input::placeholder {
  color: #5a5a55;
}
.save-btn {
  background: #f5f0e8;
  color: #0a0a0a;
  border: none;
  border-radius: 12px;
  padding: 12px 18px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.save-btn:disabled {
  opacity: 0.5;
}
.field-error {
  color: #f5f0e8;
  font-size: 13px;
  margin: 8px 0 0;
  align-self: flex-start;
}
.field-ok {
  color: #22c55e;
  font-size: 13px;
  margin: 8px 0 0;
}
.field-hint {
  color: #5a5a55;
  font-size: 13px;
  margin: 8px 0 0;
}
.nav-row {
  width: 100%;
  margin-top: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: none;
  border: none;
  border-top: 1px solid #1c1c1c;
  border-bottom: 1px solid #1c1c1c;
  border-radius: 0;
  padding: 16px 4px;
  color: #ffffff;
  font-size: 15px;
  cursor: pointer;
  text-align: left;
}
.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9a9a92;
}
.nav-label {
  flex: 1;
}
.nav-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.badge {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: #f5f0e8;
  color: #0a0a0a;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.chevron {
  color: #5a5a55;
  font-size: 20px;
}
.email {
  color: #5a5a55;
  font-size: 14px;
  margin: 16px 0 0;
}
.logout-btn {
  margin-top: 24px;
  background: none;
  border: none;
  color: #9a9a92;
  font-size: 15px;
  cursor: pointer;
  padding: 12px;
}
</style>
