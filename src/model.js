export const resources = ['buildings', 'premises', 'systems', 'employees', 'crews', 'maintenance', 'incidents', 'materials', 'stock_moves', 'tickets']
export const apiUrl = (import.meta.env.VITE_MOKKY_URL || 'https://3e7d823b5c12a32d.mokky.dev').replace(/\/$/, '')
export const roles = { admin: 'Администратор', dispatcher: 'Диспетчер', specialist: 'Специалист', resident: 'Житель' }
export const categories = ['Водоснабжение', 'Отопление', 'Электрика', 'Лифты', 'Вентиляция', 'Общедомовое имущество', 'Другое']
export const priorities = ['Обычный', 'Высокий', 'Аварийный']
export const statuses = ['Новая', 'Назначена', 'В работе', 'Выполнена', 'Отклонена']
export const closed = (ticket) => ['Выполнена', 'Отклонена'].includes(ticket.status)
export const overdue = (ticket) => !closed(ticket) && ticket.dueAt && new Date(ticket.dueAt) < new Date()
export const conditions = ['Исправно', 'Под наблюдением', 'Требует ремонта']
export const zones = [
  { label: 'Управление', pages: [['dashboard', 'Обзор', 'grid'], ['tickets', 'Заявки', 'ticket'], ['buildings', 'Жилой фонд', 'building'], ['maintenance', 'Техобслуживание', 'calendar'], ['incidents', 'Аварии', 'alarm']] },
  { label: 'Ресурсы', pages: [['employees', 'Сотрудники', 'users'], ['materials', 'Склад', 'box'], ['analytics', 'Аналитика', 'chart']] },
]
const pagesByRole = {
  admin: zones.flatMap((zone) => zone.pages.map(([key]) => key)),
  dispatcher: zones.flatMap((zone) => zone.pages.map(([key]) => key)),
  specialist: ['dashboard', 'tickets', 'buildings', 'maintenance', 'incidents', 'materials'],
  resident: ['dashboard', 'tickets', 'buildings'],
}
export const canView = (role, page) => pagesByRole[role]?.includes(page) || false
export const managers = (role) => role === 'admin' || role === 'dispatcher'
export const canManage = (role, resource) => role === 'admin' || (role === 'dispatcher' && ['tickets', 'maintenance', 'incidents'].includes(resource))
export const localDay = (date = new Date()) => {
  const value = new Date(date)
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset())
  return value.toISOString().slice(0, 10)
}
export const shiftDate = (date, days) => {
  const value = new Date(date)
  value.setUTCDate(value.getUTCDate() + days)
  return date.length === 10 ? value.toISOString().slice(0, 10) : value.toISOString()
}
export const dateLabel = (date) => date ? new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short', ...(date.length === 10 ? { timeZone: 'UTC' } : {}) }).format(new Date(date)).replace('.', '') : '—'
export const dateTime = (date) => date ? dateLabel(date) + ', ' + new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' }).format(new Date(date)) : '—'
export const integer = (value) => new Intl.NumberFormat('ru', { maximumFractionDigits: 2 }).format(value || 0)
export const money = (value) => integer(value) + ' ₽'
export const quantity = (material, data) => {
  const adjustments = data.stock_moves.filter((move) => move.materialCode === material.code)
    .reduce((sum, move) => sum + (move.type === 'Приход' ? 1 : -1) * Number(move.quantity), 0)
  const used = data.tickets.flatMap((ticket) => ticket.materials || []).filter((item) => item.materialCode === material.code)
    .reduce((sum, item) => sum + Number(item.quantity), 0)
  return Number(material.initialQuantity || 0) + adjustments - used
}
export const materialCost = (ticket) => (ticket.materials || []).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
export const ticketCost = (ticket) => Number(ticket.laborCost || 0) + materialCost(ticket)

export function loadLocal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

export async function api(path, { method = 'GET', payload, token } = {}) {
  const response = await fetch(apiUrl + '/' + path, {
    method,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(payload && !(payload instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    },
    body: payload instanceof FormData ? payload : payload ? JSON.stringify(payload) : undefined,
    signal: AbortSignal.timeout(12000),
  })
  if (response.status === 204) return null
  const result = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(typeof result?.message === 'string' ? result.message : 'Ошибка API (' + response.status + ')')
    error.status = response.status
    throw error
  }
  return result
}

export async function photoUrl(file, token) {
  const payload = new FormData()
  payload.append('file', file)
  const result = await api('uploads', { method: 'POST', payload, token })
  if (!result?.url) throw new Error('Mokky не вернул ссылку на фотографию')
  return new URL(result.url.replace(/^http:/, 'https:'), apiUrl).href
}
