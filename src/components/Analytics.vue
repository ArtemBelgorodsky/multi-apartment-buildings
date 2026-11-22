<script setup>
import { computed, ref } from 'vue'
import Icon from './Icon.vue'
import { categories, localDay, shiftDate, dateLabel, overdue, materialCost, ticketCost, integer, money } from '../model'
const props = defineProps({ data: Object, lookup: Function })
const from = ref(shiftDate(localDay(), -29))
const to = ref(localDay())
const building = ref('')
const inScope = (row, date) => date && date >= from.value && date <= to.value && (!building.value || row.buildingCode === building.value)
const tickets = computed(() => props.data.tickets.filter((row) => inScope(row, row.createdAt && localDay(row.createdAt))))
const completed = computed(() => props.data.tickets.filter((row) => inScope(row, row.completedAt && localDay(row.completedAt))))
const incidents = computed(() => props.data.incidents.filter((row) => inScope(row, row.occurredOn)))
const works = computed(() => props.data.maintenance.filter((row) => row.status === 'Выполнено' && inScope(row, row.completedOn || row.dueOn)))
const total = computed(() => completed.value.reduce((sum, row) => sum + ticketCost(row), 0) + [...incidents.value, ...works.value].reduce((sum, row) => sum + Number(row.cost || 0), 0))
const completedOnTime = computed(() => completed.value.filter((row) => row.dueAt))
const onTime = computed(() => completedOnTime.value.filter((row) => row.completedAt <= row.dueAt).length)
const average = computed(() => completed.value.length ? completed.value.reduce((sum, row) => sum + (new Date(row.completedAt) - new Date(row.createdAt)) / 3600000, 0) / completed.value.length : 0)
const byCategory = computed(() => categories.map((name) => ({ name, count: tickets.value.filter((row) => row.category === name).length })).sort((a, b) => b.count - a.count))
const byBuilding = computed(() => props.data.buildings.filter((row) => !building.value || row.code === building.value).map((row) => ({
  name: row.address,
  tickets: tickets.value.filter((item) => item.buildingCode === row.code).length,
  late: tickets.value.filter((item) => item.buildingCode === row.code && overdue(item)).length,
  incidents: incidents.value.filter((item) => item.buildingCode === row.code).length,
  cost: completed.value.filter((item) => item.buildingCode === row.code).reduce((sum, item) => sum + ticketCost(item), 0) + [...incidents.value, ...works.value].filter((item) => item.buildingCode === row.code).reduce((sum, item) => sum + Number(item.cost || 0), 0),
})).sort((a, b) => (b.late+b.incidents) - (a.late+a.incidents) || b.tickets-a.tickets))
const bySystem = computed(() => props.data.systems.filter((row) => !building.value || row.buildingCode === building.value).map((row) => ({
  name: row.name,
  address: props.lookup('buildings', row.buildingCode),
  count: incidents.value.filter((item) => item.systemCode === row.code).length,
  condition: row.condition,
})).sort((a, b) => b.count - a.count))
const byMaterial = computed(() => props.data.materials.map((row) => ({
  name: row.name, unit: row.unit,
  cost: completed.value.reduce((sum, ticket) => sum + materialCost({materials: (ticket.materials || []).filter((item) => item.materialCode === row.code)}), 0),
  used: completed.value.flatMap((ticket) => ticket.materials || []).filter((item) => item.materialCode === row.code).reduce((sum, item) => sum + item.quantity, 0),
})).filter((row) => row.used).sort((a, b) => b.cost - a.cost))

function exportCsv() {
  const cells = [
    ['Период', from.value, to.value],
    ['Дом', 'Заявки', 'Просрочки', 'Аварии', 'Затраты, ₽'],
    ...byBuilding.value.map((row) => [row.name, row.tickets, row.late, row.incidents, row.cost]),
    [], ['Категория', 'Заявки'], ...byCategory.value.map((row) => [row.name, row.count]),
    [], ['Система', 'Дом', 'Аварии', 'Состояние'], ...bySystem.value.map((row) => [row.name, row.address, row.count, row.condition]),
    [], ['Материал', 'Единица', 'Расход', 'Затраты, ₽'], ...byMaterial.value.map((row) => [row.name, row.unit, row.used, row.cost]),
  ]
  const quote = (value) => '"' + (typeof value === 'string' && /^[=+@-]/.test(value) ? "'" + value : String(value)).replaceAll('"', '""') + '"'
  const url = URL.createObjectURL(new Blob(['\uFEFF' + cells.map((row) => row.map(quote).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'kontur-' + from.value + '-' + to.value + '.csv'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
</script>

<template>
  <section class="panel filters analytics-filter">
    <label><span>Дата начала</span><input v-model="from" type="date" :max="to" /></label>
    <label><span>Дата окончания</span><input v-model="to" type="date" :min="from" /></label>
    <label><span>Объект</span><select v-model="building"><option value="">Все дома</option><option v-for="row in data.buildings" :key="row.code" :value="row.code">{{ row.address }}</option></select></label>
    <button class="button secondary" :disabled="!from || !to || from > to" @click="exportCsv"><Icon name="download" :size="17" /> Выгрузить CSV</button>
  </section>
  <div v-if="from && to && from <= to" class="report">
    <div class="summary-grid">
      <div class="panel summary"><span>Поступило заявок</span><strong>{{ tickets.length }}</strong><small>{{ dateLabel(from) }} — {{ dateLabel(to) }}</small></div>
      <div class="panel summary"><span>Аварий</span><strong>{{ incidents.length }}</strong><small>Зарегистрировано за период</small></div>
      <div class="panel summary"><span>Выполнено в срок</span><strong>{{ completedOnTime.length ? Math.round(100 * onTime / completedOnTime.length) + '%' : '—' }}</strong><small>В среднем {{ integer(average) }} ч на заявку</small></div>
      <div class="panel summary"><span>Эксплуатационные затраты</span><strong>{{ money(total) }}</strong><small>Работы, материалы и аварии</small></div>
    </div>
    <div class="dashboard-row report-row">
      <section class="panel"><div class="panel-heading"><div><h2>Категории заявок</h2><p>По дате поступления</p></div></div>
        <div class="bars"><div v-for="item in byCategory" :key="item.name"><span>{{ item.name }}</span><div><i :style="{ width: (100 * item.count / Math.max(1, byCategory[0]?.count)) + '%' }"></i></div><strong>{{ item.count }}</strong></div></div>
      </section>
      <section class="panel"><div class="panel-heading"><div><h2>Расход материалов</h2><p>По выполненным заявкам</p></div></div>
        <div v-if="byMaterial.length" class="table-scroll"><table class="data-table"><thead><tr><th>Материал</th><th>Расход</th><th>Затраты</th></tr></thead><tbody><tr v-for="row in byMaterial" :key="row.name"><td>{{ row.name }}</td><td>{{ integer(row.used) }} {{ row.unit }}</td><td>{{ money(row.cost) }}</td></tr></tbody></table></div>
        <div v-else class="empty"><p>Расходов за период нет</p></div>
      </section>
    </div>
    <section class="panel"><div class="panel-heading"><div><h2>Нагрузка по домам</h2><p>Приоритет по числу аварий и текущих просрочек</p></div></div>
      <div class="table-scroll"><table class="data-table"><thead><tr><th>Адрес</th><th>Заявки</th><th>Просрочки</th><th>Аварии</th><th>Затраты</th></tr></thead><tbody><tr v-for="row in byBuilding" :key="row.name"><td>{{ row.name }}</td><td>{{ row.tickets }}</td><td>{{ row.late }}</td><td>{{ row.incidents }}</td><td>{{ money(row.cost) }}</td></tr></tbody></table></div>
    </section>
    <section class="panel"><div class="panel-heading"><div><h2>Инженерные системы</h2><p>Текущее состояние и аварии за период</p></div></div>
      <div class="table-scroll"><table class="data-table"><thead><tr><th>Система</th><th>Дом</th><th>Аварии</th><th>Состояние</th></tr></thead><tbody><tr v-for="row in bySystem" :key="row.name + row.address"><td>{{ row.name }}</td><td>{{ row.address }}</td><td>{{ row.count }}</td><td>{{ row.condition }}</td></tr></tbody></table></div>
    </section>
  </div>
  <div v-else class="empty" role="status">Выберите корректный период</div>
</template>
