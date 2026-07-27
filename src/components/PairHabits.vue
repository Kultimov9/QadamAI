<template>
  <div class="pair-wrap">
    <p class="section-label">Парные привычки</p>

    <div class="pair-list">
      <div
        v-for="pair in pairsStore.pairs"
        :key="pair.id"
        class="pair-card"
        @click="onCardTap(pair)"
      >
        <div class="pair-main">
          <span class="pair-emoji">{{ pair.emoji }}</span>
          <div class="pair-info">
            <p class="pair-name">{{ pair.habit_name }}</p>
            <p class="pair-sub" :class="{ pending: pair.status === 'pending' }">
              {{ pairSub(pair) }}
            </p>
          </div>
        </div>

        <!-- Статусы: Ты / Друг. Тап по «Ты» отмечает выполнение на сегодня. -->
        <div v-if="pair.status !== 'pending'" class="pair-status">
          <button class="status-item" @click.stop="complete(pair)">
            <span class="circle" :class="{ done: pairsStore.myStatusToday(pair) }">
              <Check v-if="pairsStore.myStatusToday(pair)" :size="15" />
              <span v-else class="plus">+</span>
            </span>
            <span class="status-label">Ты</span>
          </button>
          <div class="status-item">
            <span class="circle friend" :class="{ done: pairsStore.partnerStatusToday(pair) }">
              <Check v-if="pairsStore.partnerStatusToday(pair)" :size="15" />
            </span>
            <span class="status-label">Друг</span>
          </div>
        </div>

        <button v-else class="reshare-btn" @click.stop="reshare(pair)">Поделиться</button>
      </div>
    </div>

    <!-- Ввод кода от друга -->
    <button v-if="!showJoin" class="join-link" @click="showJoin = true">
      У меня есть код от друга
    </button>
    <div v-else class="join-form">
      <input
        v-model="joinCode"
        class="join-input"
        placeholder="Код (8 символов)"
        maxlength="8"
        @input="joinError = ''"
      />
      <button class="join-btn" :disabled="joining || joinCode.length < 4" @click="join">
        {{ joining ? '...' : 'Принять' }}
      </button>
    </div>
    <p v-if="joinError" class="join-error">{{ joinError }}</p>
    <p v-if="joined" class="join-ok">Готово — вы в паре</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Check } from 'lucide-vue-next'
import { usePairsStore } from '../stores/pairs'
import { shareInvite } from '../composables/share'

const pairsStore = usePairsStore()

const showJoin = ref(false)
const joinCode = ref('')
const joining = ref(false)
const joinError = ref('')
const joined = ref(false)

// Автоприём кода из deep-link (друг перешёл по ссылке → приложение → сюда).
onMounted(async () => {
  const code = pairsStore.pendingJoinCode
  if (!code) return
  pairsStore.pendingJoinCode = ''
  joining.value = true
  const res = await pairsStore.acceptInvite(code)
  joining.value = false
  if (res.ok) {
    joined.value = true
    setTimeout(() => (joined.value = false), 2500)
  } else {
    // Показываем поле с кодом, чтобы пользователь мог принять вручную/увидеть причину.
    showJoin.value = true
    joinCode.value = code
    joinError.value = res.error
  }
})

function complete(pair) {
  if (pair.status !== 'pending') pairsStore.completePairToday(pair.id)
}

function dayWord(n) {
  const a = n % 10
  const b = n % 100
  if (a === 1 && b !== 11) return 'день'
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return 'дня'
  return 'дней'
}

// Понятная подпись под названием: что происходит с парой прямо сейчас.
function pairSub(pair) {
  if (pair.status === 'pending') return 'ждём друга'
  const my = pairsStore.myStatusToday(pair)
  const partner = pairsStore.partnerStatusToday(pair)
  if (my && partner) {
    const s = pairsStore.pairStreak(pair)
    return s > 0 ? `${s} ${dayWord(s)} вместе подряд` : 'Оба сделали сегодня'
  }
  if (my && !partner) return 'Ты сделал. Ждём друга'
  if (!my && partner) return 'Друг сделал. Твой ход'
  return 'Отметься, когда сделаешь сегодня'
}

// Тап по карточке = отметить свою привычку (если пара активна).
function onCardTap(pair) {
  if (pair.status !== 'pending' && !pairsStore.myStatusToday(pair)) {
    pairsStore.completePairToday(pair.id)
  }
}

function reshare(pair) {
  shareInvite(pair.invite_code)
}

async function join() {
  joinError.value = ''
  const code = joinCode.value.trim().toUpperCase()
  if (code.length < 4) return
  joining.value = true
  const res = await pairsStore.acceptInvite(code)
  joining.value = false
  if (res.ok) {
    joined.value = true
    joinCode.value = ''
    showJoin.value = false
    setTimeout(() => (joined.value = false), 2500)
  } else {
    joinError.value = res.error
  }
}
</script>

<style scoped>
.pair-wrap {
  margin-bottom: 8px;
}
.section-label {
  font-size: 13px;
  color: #9a9a92;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 10px;
}
.pair-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pair-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #141414;
  border: 1px solid #242424;
  border-radius: 16px;
  padding: 14px 16px;
  cursor: pointer;
}
.pair-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.pair-emoji {
  font-size: 26px;
  flex-shrink: 0;
}
.pair-info {
  min-width: 0;
}
.pair-name {
  font-size: 15px;
  font-weight: 500;
  color: #ffffff;
  margin: 0;
}
.pair-sub {
  font-size: 12px;
  color: #9a9a92;
  margin: 2px 0 0;
}
.pair-sub.pending {
  color: #f5f0e8;
}
.pair-status {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}
.status-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}
.status-item:last-child {
  cursor: default;
}
.circle {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid #2a2a2a;
  background: #1a1a1a;
  color: #5a5a55;
  display: flex;
  align-items: center;
  justify-content: center;
}
.circle .plus {
  font-size: 20px;
  line-height: 1;
  color: #9a9a92;
}
.circle.done {
  background: #22c55e;
  border-color: #22c55e;
  color: #0a0a0a;
}
.status-label {
  font-size: 11px;
  color: #9a9a92;
}
.reshare-btn {
  flex-shrink: 0;
  background: transparent;
  border: 1px solid #2a2a2a;
  color: #f5f0e8;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
}
.join-link {
  display: block;
  width: 100%;
  background: none;
  border: none;
  color: #5a5a55;
  font-size: 13px;
  text-align: center;
  cursor: pointer;
  padding: 12px 0 2px;
}
.join-form {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.join-input {
  flex: 1;
  background: #141414;
  border: 1px solid #242424;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  color: #ffffff;
  outline: none;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.join-input::placeholder {
  color: #5a5a55;
  letter-spacing: normal;
}
.join-btn {
  background: #f5f0e8;
  color: #0a0a0a;
  border: none;
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.join-btn:disabled {
  opacity: 0.5;
}
.join-error {
  color: #f5f0e8;
  font-size: 12px;
  margin: 8px 0 0;
}
.join-ok {
  color: #22c55e;
  font-size: 12px;
  margin: 8px 0 0;
}
</style>
