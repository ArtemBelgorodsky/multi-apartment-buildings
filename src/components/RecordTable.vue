<script setup>
import Icon from './Icon.vue'
import { schemas } from '../schema'
import { dateLabel, integer, money } from '../model'
defineProps({ resource: String, rows: Array, lookup: Function, stock: Function })
defineEmits(['open'])
const specialLabels = { available: 'В наличии' }
const tone = {
  Исправно: 'green', 'Под наблюдением': 'orange', 'Требует ремонта': 'red',
  Запланировано: 'purple', 'В работе': 'blue', Выполнено: 'green', Отменено: 'neutral',
  Аварийный: 'red', Высокий: 'orange', Обычный: 'neutral', Зафиксирована: 'red', Локализация: 'orange', Устранена: 'green',
  Да: 'green', Нет: 'neutral', Приход: 'green', Расход: 'orange',
}
function format(key, value) {
  if (value === '' || value === undefined || value === null) return '—'
  if (key === 'price') return money(value)
  if (key.endsWith('On')) return dateLabel(value)
  if (typeof value === 'number') return integer(value)
  return value
}
</script>

<template>
  <div v-if="rows.length" class="table-scroll">
    <table class="data-table">
      <thead><tr><th v-for="key in schemas[resource].columns" :key="key">{{ specialLabels[key] || schemas[resource].fields.find(field => field.key === key)?.label }}</th><th aria-label="Открыть"></th></tr></thead>
      <tbody>
        <tr v-for="row in rows" :key="row.code" @click="$emit('open', row)">
          <td v-for="(key, i) in schemas[resource].columns" :key="key">
            <button v-if="i === 0" class="table-link" @click.stop="$emit('open', row)">{{ format(key, row[key]) }}</button>
            <span v-else-if="key === 'available'" :class="{ late: stock(row) < row.minQuantity }">{{ integer(stock(row)) }}</span>
            <span v-else-if="key.endsWith('Code')">{{ lookup(schemas[resource].fields.find(field => field.key === key).relation, row[key]) }}</span>
            <span v-else-if="tone[row[key]]" class="tag" :data-tone="tone[row[key]]">{{ row[key] }}</span>
            <span v-else>{{ format(key, row[key]) }}</span>
          </td>
          <td><Icon name="chevron" :size="15" /></td>
        </tr>
      </tbody>
    </table>
  </div>
  <div v-else class="empty"><Icon name="layers" :size="27" /><p>Записей пока нет</p></div>
</template>
