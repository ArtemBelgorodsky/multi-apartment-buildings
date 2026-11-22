<script setup>
import Icon from './Icon.vue'
import { dateLabel, dateTime, overdue } from '../model'
defineProps({ rows: Array, address: Function, employee: Function, compact: Boolean, hideAssignee: Boolean })
defineEmits(['open'])
const priorityTone = { 'Аварийный': 'red', 'Высокий': 'orange', 'Обычный': 'neutral' }
const statusTone = { 'В работе': 'blue', 'Назначена': 'purple', 'Новая': 'orange', 'Выполнена': 'green', 'Отклонена': 'neutral' }
</script>

<template>
  <div v-if="rows.length" class="table-scroll">
    <table class="data-table">
      <thead><tr><th>Заявка</th><th>Объект</th><th>Приоритет</th><th>Статус</th><th>{{ compact ? 'Создана' : 'Срок' }}</th><th v-if="!compact && !hideAssignee">Исполнитель</th><th aria-label="Открыть"></th></tr></thead>
      <tbody>
        <tr v-for="row in rows" :key="row.code" @click="$emit('open', row)">
          <td><button type="button" class="table-link" @click.stop="$emit('open', row)">{{ row.title }}</button><small>№{{ row.code.replace(/^Z-/, '') }} · {{ row.category }}</small></td>
          <td>{{ address(row.buildingCode) }}</td>
          <td><span class="tag plain" :data-tone="priorityTone[row.priority]"><i></i>{{ row.priority }}</span></td>
          <td><span class="tag" :data-tone="statusTone[row.status]">{{ row.status }}</span></td>
          <td :class="{ late: !compact && overdue(row) }">{{ compact ? dateTime(row.createdAt) : dateLabel(row.dueAt) }}</td>
          <td v-if="!compact && !hideAssignee">{{ employee(row.assigneeCode) }}</td>
          <td><Icon name="chevron" :size="15" /></td>
        </tr>
      </tbody>
    </table>
  </div>
  <div v-else class="empty"><Icon name="ticket" :size="27" /><p>Заявок пока нет</p></div>
</template>
