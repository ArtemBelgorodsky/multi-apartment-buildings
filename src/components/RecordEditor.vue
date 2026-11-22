<script setup>
import { computed, reactive, ref, watch } from 'vue'
import Icon from './Icon.vue'
import { categories, dateTime, integer, localDay, managers, money, priorities, statuses, ticketCost } from '../model'
import { schemas } from '../schema'

const props = defineProps({ resource: String, row: Object, role: String, user: Object, data: Object, lookup: Function, editable: Boolean, busy: Boolean, error: String, defaults: Object })
const emit = defineEmits(['save', 'close'])
const ticket = computed(() => props.resource === 'tickets')
const fresh = !props.row
const fixedAddress = computed(() => !!props.user?.buildingCode)
const managing = managers(props.role)
const readOnly = !props.editable
const schema = computed(() => schemas[props.resource])
const file = ref()
const fileError = ref('')
const ticketFields = [
  { key: 'title', label: 'Краткая тема', required: true },
  { key: 'buildingCode', label: 'Адрес дома', relation: 'buildings', required: true },
  { key: 'premiseCode', label: 'Помещение', relation: 'premises' },
  { key: 'category', label: 'Категория', options: categories, required: true },
  { key: 'locationNote', label: 'Квартира, подъезд или этаж' },
  { key: 'residentEmail', label: 'Электронная почта жителя', type: 'email' },
  { key: 'description', label: 'Описание проблемы', type: 'textarea', required: true },
  { key: 'priority', label: 'Приоритет', options: priorities, required: true },
  { key: 'assigneeCode', label: 'Исполнитель', relation: 'employees' },
  { key: 'dueAt', label: 'Срок выполнения', type: 'datetime-local' },
  { key: 'status', label: 'Статус', options: statuses, required: true },
  { key: 'result', label: 'Результат работ или причина отклонения', type: 'textarea' },
  { key: 'laborCost', label: 'Стоимость работ, ₽', type: 'number', default: 0, min: 0, step: '0.01' },
]
const fields = computed(() => {
  if (ticket.value) {
    if (props.role === 'resident') {
      if (!fresh) return ticketFields.filter((f) => !['residentEmail', 'assigneeCode', 'laborCost'].includes(f.key))
      const allowed = ['title', 'category', 'description', ...(fixedAddress.value ? [] : ['buildingCode']), ...(props.user?.premiseCode ? [] : ['locationNote'])]
      return ticketFields.filter((f) => allowed.includes(f.key))
    }
    if (props.role === 'specialist' && props.row?.status !== 'Выполнена') {
      return ticketFields.map((f) => ({ ...f, locked: !['status', 'result', 'laborCost'].includes(f.key), ...(f.key === 'status' ? { options: props.row?.status === 'Назначена' ? ['Назначена', 'В работе'] : ['В работе', 'Выполнена'] } : {}) }))
    }
    return ticketFields
  }
  if (props.resource === 'maintenance' && props.role === 'specialist') return schema.value.fields.map((f) => ({ ...f, locked: !['status', 'completedOn', 'description', 'cost'].includes(f.key), ...(f.key === 'status' ? { options: ['Запланировано', 'В работе', 'Выполнено'] } : {}) }))
  return schema.value.fields
})
const form = reactive({
  ...(ticket.value ? { category: '', priority: 'Обычный', status: 'Новая', residentEmail: '', materials: [], laborCost: 0 } : Object.fromEntries(schema.value.fields.map((field) => [field.key, field.default ?? field.options?.[0] ?? (field.type === 'date' && field.required ? localDay() : '')]))),
  ...props.defaults,
  ...structuredClone(props.row ? JSON.parse(JSON.stringify(props.row)) : {}),
})
if (ticket.value && props.row?.dueAt) {
  const date = new Date(props.row.dueAt)
  form.dueAt = localDay(date) + 'T' + [date.getHours(),date.getMinutes()].map((n) => String(n).padStart(2,'0')).join(':')
}
if (ticket.value && props.role === 'resident' && fresh) {
  form.buildingCode = props.user.buildingCode || form.buildingCode || ''
  form.premiseCode = props.user.premiseCode || ''
}
watch(() => form.buildingCode, () => { if (ticket.value) form.premiseCode = ''; else if ('systemCode' in form) form.systemCode = '' })
function choices(field) {
  const rows = props.data[field.relation]
  return rows.filter((item) => {
    if (['systems', 'premises'].includes(field.relation)) return item.buildingCode === form.buildingCode
    if (field.relation === 'employees') return item.active !== 'Нет' || item.code === form[field.key]
    return true
  })
}
function selectFile(event) {
  const selected = event.target.files?.[0]
  fileError.value = ''
  file.value = undefined
  if (!selected) return
  if (!['image/jpeg','image/png','image/webp'].includes(selected.type) || selected.size > 2 * 1024 * 1024) {
    fileError.value = 'Выберите JPG, PNG или WebP размером до 2 МБ.'
    event.target.value = ''
    return
  }
  file.value = selected
}
function send() {
  if (readOnly || props.busy) return
  const payload = JSON.parse(JSON.stringify(form))
  for (const field of fields.value) {
    const value = payload[field.key]
    if (typeof value === 'string') payload[field.key] = value.trim()
    if (field.type === 'number' && value !== '') payload[field.key] = Number(value)
  }
  if (ticket.value && payload.dueAt) payload.dueAt = new Date(payload.dueAt).toISOString()
  emit('save', payload, file.value)
}

const title = computed(() => ticket.value ? (fresh ? 'Новая заявка' : 'Заявка №' + props.row.code.replace(/^Z-/, '')) : (fresh ? 'Добавить ' + schema.value.single : schema.value.heading))
</script>

<template>
  <form class="editor" @submit.prevent="send">
    <header class="editor-head">
      <div><p v-if="row && ticket" class="eyebrow">{{ row.status }} · {{ dateTime(row.createdAt) }}</p><h2>{{ title }}</h2><p v-if="row">{{ row.title || row[schema?.label] }}</p></div>
      <button type="button" class="icon-button" aria-label="Закрыть" @click="$emit('close')"><Icon name="close" /></button>
    </header>
    <div class="editor-body">
      <div v-if="fresh && ticket && role === 'resident' && fixedAddress" class="notice"><Icon name="pin" :size="18" />{{ lookup('buildings', user.buildingCode) }}<template v-if="user.premiseCode"> · {{ lookup('premises', user.premiseCode) }}</template></div>
      <div v-if="readOnly" class="details">
        <div v-for="field in fields.filter(f => row[f.key] !== undefined && row[f.key] !== '')" :key="field.key" :class="{ wide: field.type === 'textarea' }">
          <span>{{ field.label }}</span><strong>{{ field.relation ? lookup(field.relation, row[field.key]) : field.type === 'datetime-local' ? dateTime(row[field.key]) : row[field.key] }}</strong>
        </div>
      </div>
      <div v-else class="form-grid">
        <label v-for="field in fields" :key="field.key" :class="{ wide: field.type === 'textarea' || field.key === 'title' }">
          <span>{{ field.label }}</span>
          <select v-if="field.options || field.relation" v-model="form[field.key]" :required="field.required" :disabled="field.locked || busy">
            <option value="">{{ field.required ? 'Выберите значение' : 'Не указано' }}</option>
            <option v-for="option in field.options" :key="option">{{ option }}</option>
            <option v-for="option in field.relation ? choices(field) : []" :key="option.code" :value="option.code">{{ lookup(field.relation, option.code) }}</option>
          </select>
          <textarea v-else-if="field.type === 'textarea'" v-model="form[field.key]" :required="field.required" :disabled="field.locked || busy" maxlength="2500" rows="3"></textarea>
          <input v-else v-model="form[field.key]" :type="field.type || 'text'" :required="field.required" :min="field.min" :step="field.step" :disabled="field.locked || busy" maxlength="220" />
        </label>
      </div>
      <div v-if="ticket && (row?.photoUrl || (editable && (fresh || managing)))" class="editor-section">
        <h3>Фотография</h3>
        <img v-if="row?.photoUrl" class="attached-photo" :src="row.photoUrl" alt="Фотография из заявки" />
        <label v-if="editable && (fresh || managing)" class="file-picker"><Icon name="camera" :size="18" /><span>{{ file?.name || 'Прикрепить JPG, PNG или WebP' }}</span><input type="file" accept="image/jpeg,image/png,image/webp" :disabled="busy" @change="selectFile" /></label>
        <p v-if="fileError" class="field-error">{{ fileError }}</p>
      </div>
      <div v-if="ticket && role !== 'resident' && (editable && !fresh || row?.materials?.length)" class="editor-section">
        <h3>Использованные материалы</h3>
        <template v-if="editable">
          <div v-for="(item, index) in form.materials" :key="index" class="material-entry">
            <select v-model="item.materialCode" required aria-label="Материал">
              <option value="">Выберите материал</option><option v-for="material in data.materials" :key="material.code" :value="material.code">{{ material.name }} · {{ material.unit }}</option>
            </select>
            <input v-model.number="item.quantity" type="number" min="0.01" step="any" required aria-label="Количество" />
            <button type="button" class="icon-button" aria-label="Убрать материал" @click="form.materials.splice(index, 1)"><Icon name="close" :size="16" /></button>
          </div>
          <button type="button" class="button secondary compact" @click="form.materials.push({ materialCode: '', quantity: 1 })"><Icon name="plus" :size="16" /> Добавить материал</button>
        </template>
        <template v-else><p v-for="item in row.materials" :key="item.materialCode">{{ lookup('materials', item.materialCode) }} · {{ integer(item.quantity) }}</p></template>
        <p v-if="row" class="detail-total">Затраты по заявке · {{ money(ticketCost(row)) }}</p>
      </div>
      <div v-if="ticket && row?.history?.length" class="editor-section">
        <h3>История заявки</h3>
        <ol class="history"><li v-for="(item, index) in [...row.history].reverse()" :key="index"><strong>{{ item.text }}</strong><small>{{ dateTime(item.at) }} · {{ item.author }}</small></li></ol>
      </div>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    </div>
    <footer class="editor-footer">
      <button type="button" class="button secondary" :disabled="busy" @click="$emit('close')">{{ editable ? 'Отмена' : 'Закрыть' }}</button>
      <button v-if="editable" type="submit" class="button primary" :disabled="busy || !!fileError">{{ busy ? 'Сохранение…' : fresh && ticket ? 'Отправить заявку' : 'Сохранить' }}</button>
    </footer>
  </form>
</template>
