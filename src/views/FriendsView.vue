<template>
  <div class="friends-view">
    <div class="page-header">
      <button class="back-btn" @click="router.replace('/profile')">← Назад</button>
      <h1 class="title">Друзья</h1>
      <span />
    </div>

    <div class="content">
      <!-- Входящие запросы -->
      <div v-if="store.incoming.length" class="section">
        <p class="section-label">Запросы</p>
        <div class="row" v-for="f in store.incoming" :key="f.friendship_id">
          <span class="avatar" :class="{ img: f.avatar_url }">
            <img v-if="f.avatar_url" :src="f.avatar_url" alt="" />
            <span v-else>{{ initial(f.username) }}</span>
          </span>
          <span class="name">{{ f.username || 'Без ника' }}</span>
          <button class="btn-primary sm" @click="store.acceptRequest(f.friendship_id)">Принять</button>
          <button class="btn-ghost sm" @click="store.declineRequest(f.friendship_id)">Отклонить</button>
        </div>
      </div>

      <!-- Мои друзья -->
      <div class="section">
        <p class="section-label">Мои друзья</p>
        <div v-if="store.friends.length">
          <div class="row" v-for="f in store.friends" :key="f.other_id">
            <span class="avatar" :class="{ img: f.avatar_url }">
              <img v-if="f.avatar_url" :src="f.avatar_url" alt="" />
              <span v-else>{{ initial(f.username) }}</span>
            </span>
            <span class="name">{{ f.username || 'Без ника' }}</span>
            <button class="icon-btn" title="Создать общую привычку" @click="createWith(f)">
              <Users :size="18" />
            </button>
          </div>
        </div>
        <p v-else class="empty">
          Пока нет друзей — найди по нику ниже или отправь другу инвайт-код привычки.
        </p>
      </div>

      <!-- Поиск -->
      <div class="section">
        <p class="section-label">Найти по нику</p>
        <input v-model="query" class="search-input" placeholder="Ник друга" autocapitalize="off" />
        <div v-if="query.trim() && store.searchResults.length">
          <div class="row" v-for="r in store.searchResults" :key="r.id">
            <span class="avatar" :class="{ img: r.avatar_url }">
              <img v-if="r.avatar_url" :src="r.avatar_url" alt="" />
              <span v-else>{{ initial(r.username) }}</span>
            </span>
            <span class="name">{{ r.username }}</span>
            <button
              class="btn-primary sm"
              :disabled="store.statusWith(r.id) !== 'none'"
              @click="add(r.id)"
            >
              {{ addLabel(r.id) }}
            </button>
          </div>
        </div>
        <p v-else-if="query.trim() && !searching" class="empty">Никого не нашли по «{{ query }}»</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Users } from 'lucide-vue-next'
import { useFriendsStore } from '../stores/friends'
import { pendingPairFriend } from '../composables/uiState'

const router = useRouter()
const store = useFriendsStore()

const query = ref('')
const searching = ref(false)
let debounce = null

onMounted(() => store.fetchFriends())

// Дебаунс поиска 300мс.
watch(query, (q) => {
  clearTimeout(debounce)
  searching.value = true
  debounce = setTimeout(async () => {
    await store.search(q)
    searching.value = false
  }, 300)
})

function initial(name) {
  return (name || '?').charAt(0).toUpperCase()
}

function addLabel(id) {
  const s = store.statusWith(id)
  if (s === 'friends') return 'Уже в друзьях'
  if (s === 'pending') return 'Запрос отправлен'
  return 'Добавить'
}

async function add(id) {
  await store.sendRequest(id)
}

function createWith(friend) {
  pendingPairFriend.value = { id: friend.other_id, username: friend.username }
  router.push('/habits')
}
</script>

<style scoped>
.friends-view {
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
  padding: 8px 24px 100px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.section-label {
  font-size: 13px;
  color: #9a9a92;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 10px;
}
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #141414;
  border: 1px solid #242424;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f5f0e8;
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
}
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.name {
  flex: 1;
  font-size: 15px;
  color: #ffffff;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.btn-primary {
  background: #f5f0e8;
  color: #0a0a0a;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:disabled {
  background: #2a2a2a;
  color: #5a5a55;
}
.btn-ghost {
  background: transparent;
  border: 1px solid #2a2a2a;
  color: #9a9a92;
  border-radius: 10px;
  cursor: pointer;
}
.sm {
  padding: 8px 12px;
  font-size: 13px;
}
.icon-btn {
  background: transparent;
  border: 1px solid #2a2a2a;
  color: #f5f0e8;
  border-radius: 10px;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.search-input {
  width: 100%;
  background: #141414;
  border: 1px solid #242424;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 15px;
  color: #ffffff;
  outline: none;
  margin-bottom: 8px;
}
.search-input::placeholder {
  color: #5a5a55;
}
.empty {
  color: #5a5a55;
  font-size: 14px;
  line-height: 1.5;
  margin: 4px 0 0;
}
</style>
