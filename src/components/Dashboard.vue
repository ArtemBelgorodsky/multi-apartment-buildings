<script setup>
import { computed, ref } from 'vue'
import Icon from './Icon.vue'
import Blueprint from './Blueprint.vue'
import TrendChart from './TrendChart.vue'
import TicketTable from './TicketTable.vue'
import { closed, dateLabel, integer, localDay, overdue, shiftDate } from '../model'

const props = defineProps({ tickets: Array, data: Object, role: String, hasHome: Boolean, address: Function, employee: Function })
const emit = defineEmits(['navigate', 'ticket', 'record'])
const period = ref(7)
const today = localDay()
const chart = computed(() => Array.from({ length: period.value }, (_, i) => {
  const day = shiftDate(today, i - period.value + 1)
  return {
    day, label: dateLabel(day),
    created: props.tickets.filter((item) => item.createdAt && localDay(item.createdAt) === day).length,
    completed: props.tickets.filter((item) => item.completedAt && localDay(item.completedAt) === day).length,
  }
}))
const active = computed(() => props.tickets.filter((ticket) => !closed(ticket)))
const latest = computed(() => props.tickets.slice(0, 5))
const stats = computed(() => [
  { icon: 'ticket', name: props.role === 'resident' ? 'Мои обращения' : 'Открытые заявки', value: active.value.length, sub: active.value.filter((r) => r.status === 'Новая').length + ' ожидают обработки', tone: 'blue', filter: 'open' },
  { icon: 'clock', name: 'В работе', value: active.value.filter((r) => ['В работе', 'Назначена'].includes(r.status)).length, sub: 'Включая назначенные', tone: 'purple', filter: 'assigned' },
  { icon: 'alarm', name: 'Просрочено', value: active.value.filter(overdue).length, sub: 'Истёк срок выполнения', tone: 'orange', filter: 'late' },
  { icon: 'circlecheck', name: 'Выполнено', value: props.tickets.filter((r) => r.status === 'Выполнена').length, sub: 'За всё время', tone: 'green', filter: 'done' },
])
const attention = computed(() => {
  const incidents = props.role === 'resident' ? [] : props.data.incidents.filter((row) => row.status !== 'Устранена').map((row) => ({ ...row, resource: 'incidents', text: row.title, detail: props.address(row.buildingCode), icon: 'alarm', tone: 'red' }))
  const expired = active.value.filter(overdue).map((row) => ({ ...row, resource: 'tickets', text: row.title, detail: props.address(row.buildingCode), icon: 'clock', tone: 'orange' }))
  const stock = props.role === 'resident' ? [] : props.data.maintenance.filter((row) => row.status === 'Запланировано' && row.dueOn).sort((a, b) => a.dueOn.localeCompare(b.dueOn)).map((row) => ({ ...row, resource: 'maintenance', text: row.title, detail: dateLabel(row.dueOn) + ' · ' + props.address(row.buildingCode), icon: 'wrench', tone: 'blue' }))
  return [...incidents, ...expired, ...stock].slice(0, 3)
})
const totals = computed(() => chart.value.reduce((total, row) => total + row.created, 0))
const dateHeader = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long', weekday: 'long' }).format(new Date())
function openNotice(row) {
  if (row.resource === 'tickets') emit('ticket', row)
  else emit('record', row.resource, row)
}
</script>

<template>
  <div class="dashboard">
    <section class="hero">
      <div class="hero-copy">
        <div class="hero-date"><Icon name="calendar" :size="15" />{{ dateHeader }}</div>
        <h1>{{ role === 'resident' ? (hasHome ? 'Мой дом' : 'Кабинет жителя') : 'Обзор эксплуатации' }}</h1>
        <p>{{ role === 'resident' ? 'Обращения в управляющую организацию и сведения о доме.' : 'Состояние жилого фонда, заявки и работы в едином окне.' }}</p>
        <button class="hero-link" @click="$emit('navigate', 'buildings')">{{ role === 'resident' && hasHome ? 'Открыть карточку дома' : 'Перейти к жилому фонду' }} <Icon name="arrow" :size="17" /></button>
      </div>
      <Blueprint />
      <div class="hero-coordinate" aria-hidden="true"><span></span> ЖИЛОЙ ФОНД / КОНТУР</div>
    </section>

    <section class="metrics" aria-label="Сводка по заявкам">
      <button v-for="stat in stats" :key="stat.name" class="metric panel" @click="$emit('navigate', 'tickets', stat.filter)">
        <span class="metric-top"><span class="icon-tile" :data-tone="stat.tone"><Icon :name="stat.icon" :size="18" /></span><Icon name="diagonal" :size="16" class="metric-arrow" /></span>
        <span class="metric-label">{{ stat.name }}</span>
        <strong>{{ integer(stat.value) }}</strong>
        <span class="metric-sub"><i v-if="stat.tone === 'orange'"></i>{{ stat.sub }}</span>
      </button>
    </section>

    <div class="dashboard-row">
      <section class="panel trend-panel">
        <div class="panel-heading">
          <div><h2>Динамика заявок</h2><p>{{ totals }} поступило за выбранный период</p></div>
          <div class="mini-switch" aria-label="Период"><button :class="{ selected: period === 7 }" @click="period = 7">7 дней</button><button :class="{ selected: period === 30 }" @click="period = 30">30 дней</button></div>
        </div>
        <TrendChart :rows="chart" />
        <div class="chart-legend"><span><i></i> Поступило</span><span><i></i> Выполнено</span></div>
      </section>
      <section class="panel attention-panel">
        <div class="panel-heading"><div><h2>Требуют внимания</h2><p>События и ближайшие работы</p></div><span v-if="attention.length" class="count">{{ attention.length }}</span></div>
        <div v-if="attention.length" class="attention-list">
          <button v-for="row in attention" :key="row.code" class="attention-item" @click="openNotice(row)">
            <span class="icon-tile" :data-tone="row.tone"><Icon :name="row.icon" :size="17" /></span>
            <span><strong>{{ row.text }}</strong><small>{{ row.detail }}</small></span>
            <Icon name="chevron" :size="15" />
          </button>
        </div>
        <div v-else class="empty"><Icon name="circlecheck" :size="25" /><p>Срочных событий нет</p></div>
        <button v-if="role !== 'resident'" class="section-link" @click="$emit('navigate', 'incidents')">Журнал аварий <Icon name="arrow" :size="16" /></button>
      </section>
    </div>

    <section class="panel recent">
      <div class="panel-heading"><div><h2>Последние заявки</h2><p>Недавние обращения и их текущий статус</p></div><button class="button secondary compact" @click="$emit('navigate', 'tickets')">Все заявки <Icon name="arrow" :size="16" /></button></div>
      <TicketTable :rows="latest" :address="address" :employee="employee" compact @open="$emit('ticket', $event)" />
    </section>
  </div>
</template>
