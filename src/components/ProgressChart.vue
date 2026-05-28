<template>
  <div class="chart-wrap">
    <canvas ref="chartEl" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import {
  Chart,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  LineController,
  Filler,
} from 'chart.js'
import { useHabitsStore } from '../stores/habits'

Chart.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  LineController,
  Filler,
)

const store = useHabitsStore()
const chartEl = ref(null)
let chart = null

const last14Days = () => {
  const days = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    const completed = store.habits.filter((h) => h.completedDates.includes(dateStr)).length

    let maxStreak = 0
    store.habits.forEach((h) => {
      if (!h.completedDates.includes(dateStr)) return
      let s = 1
      let checkDate = new Date(d)
      checkDate.setDate(checkDate.getDate() - 1)
      while (true) {
        const checkStr = checkDate.toISOString().split('T')[0]
        if (h.completedDates.includes(checkStr)) {
          s++
          checkDate.setDate(checkDate.getDate() - 1)
        } else break
      }
      if (s > maxStreak) maxStreak = s
    })

    days.push({ label, completed, streak: maxStreak })
  }
  return days
}

onMounted(() => {
  const data = last14Days()

  chart = new Chart(chartEl.value, {
    type: 'line',
    data: {
      labels: data.map((d) => d.label),
      datasets: [
        {
          label: 'Привычки',
          data: data.map((d) => d.completed),
          borderColor: '#534AB7',
          backgroundColor: 'rgba(83, 74, 183, 0.1)',
          borderWidth: 2.5,
          pointBackgroundColor: '#534AB7',
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Streak',
          data: data.map((d) => d.streak),
          borderColor: '#1D9E75',
          backgroundColor: 'rgba(29, 158, 117, 0.1)',
          borderWidth: 2.5,
          pointBackgroundColor: '#1D9E75',
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: { family: 'Inter', size: 12 },
            color: '#888',
            boxWidth: 12,
            padding: 16,
          },
        },
        tooltip: {
          backgroundColor: '#fff',
          titleColor: '#1a1a1a',
          bodyColor: '#555',
          borderColor: '#f0f0ee',
          borderWidth: 1,
          padding: 10,
          titleFont: { family: 'Inter', weight: '600' },
          bodyFont: { family: 'Inter' },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { family: 'Inter', size: 10 },
            color: '#aaa',
            maxRotation: 0,
            maxTicksLimit: 7,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0,0,0,0.05)',
          },
          ticks: {
            font: { family: 'Inter', size: 11 },
            color: '#aaa',
            stepSize: 1,
          },
        },
      },
    },
  })
})

onUnmounted(() => {
  if (chart) chart.destroy()
})
</script>

<style scoped>
.chart-wrap {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  border: 1px solid #f0f0ee;
}
</style>
