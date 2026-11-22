import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import { api, canManage, canView, closed, dateLabel, loadLocal, localDay, managers, overdue, photoUrl, quantity, resources, roles, shiftDate, zones } from './model'
import { schemas } from './schema'

export function useWorkspace() {
  const token = ref(loadLocal('kontur-session-v1', ''))
  const user = ref(null)
  const role = computed(() => user.value?.role)
  const emptyData = () => Object.fromEntries(resources.map((key) => [key, []]))
  const data = ref(emptyData())
  const page = ref('dashboard')
  const sub = ref('')
  const buildingCode = ref('')
  const detailTab = ref('premises')
  const navOpen = ref(false)
  const popover = ref('')
  const globalQuery = ref('')
  const searchBox = ref(null)
  const dialog = ref(null)
  const modal = ref(null)
  const modalError = ref('')
  const busy = ref(false)
  const loading = ref(false)
  const loadError = ref('')
  const toast = ref('')
  const authMode = ref('signin')
  const authForm = reactive({ fullName: '', email: '', password: '' })
  const filters = reactive({ query: '', status: '', priority: '', category: '', building: '' })
  const limit = ref(12)
  let toastTimer

  const pages = zones.flatMap((zone) => zone.pages)
  const pageName = computed(() => pages.find(([key]) => key === page.value)?.[1] || 'Обзор')
  const initials = computed(() => (user.value?.fullName || 'Пользователь').split(' ').slice(0, 2).map((part) => part[0]).join(''))
  const ownEmployee = computed(() => data.value.employees.find((row) => row.email?.toLowerCase() === user.value?.email?.toLowerCase()))
  const availableBuildings = computed(() => role.value === 'resident' && user.value?.buildingCode
    ? data.value.buildings.filter((row) => row.code === user.value.buildingCode)
    : data.value.buildings)
  const currentBuilding = computed(() => page.value === 'buildings' ? availableBuildings.value.find((row) => row.code === buildingCode.value) : null)
  const canCreateTicket = computed(() => managers(role.value) || role.value === 'resident')
  function canEdit(resource, row) {
    if (!row && resource === 'tickets') return canCreateTicket.value
    if (canManage(role.value, resource)) return true
    if (role.value !== 'specialist' || !ownEmployee.value || row?.assigneeCode !== ownEmployee.value.code) return false
    if (resource === 'tickets') return ['Назначена', 'В работе'].includes(row.status)
    return resource === 'maintenance' && !['Выполнено', 'Отменено'].includes(row.status)
  }
  const baseTickets = computed(() => data.value.tickets.filter((row) => {
    if (role.value === 'resident') return row.residentEmail?.toLowerCase() === user.value?.email?.toLowerCase()
    if (role.value === 'specialist') return !!ownEmployee.value && row.assigneeCode === ownEmployee.value.code
    return managers(role.value)
  }).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')))
  function visibleRows(resource) {
    if (resource === 'tickets') return baseTickets.value
    if (role.value !== 'resident') return data.value[resource] || []
    if (resource === 'buildings') return availableBuildings.value
    if (resource === 'premises') return data.value.premises.filter((row) => row.code === user.value.premiseCode && row.buildingCode === user.value.buildingCode)
    return []
  }
  function lookup(resource, code) {
    if (!code) return '—'
    const row = data.value[resource]?.find((item) => item.code === code)
    return row?.[schemas[resource]?.label] || code
  }
  const address = (code) => lookup('buildings', code)
  const employee = (code) => lookup('employees', code)
  const stock = (material) => quantity(material, data.value)
  const filteredTickets = computed(() => baseTickets.value.filter((row) => {
    const query = filters.query.trim().toLowerCase()
    const matches = [row.title, row.code, row.category, address(row.buildingCode)].some((field) => String(field).toLowerCase().includes(query))
    const groups = { open: !closed(row), assigned: ['Назначена','В работе'].includes(row.status), late: overdue(row), done: row.status === 'Выполнена' }
    return matches && (!filters.status || (filters.status in groups ? groups[filters.status] : row.status === filters.status))
      && (!filters.priority || row.priority === filters.priority) && (!filters.category || row.category === filters.category)
      && (!filters.building || row.buildingCode === filters.building)
  }))
  const registry = computed(() => sub.value || page.value)
  const registryRows = computed(() => visibleRows(registry.value).filter((row) => {
    const query = filters.query.trim().toLowerCase()
    return Object.values(row).some((value) => typeof value === 'string' && value.toLowerCase().includes(query)) &&
      (!filters.building || row.buildingCode === filters.building) && (!filters.status || row.status === filters.status)
  }))
  const hasPremise = computed(() => !!user.value?.buildingCode && !!user.value?.premiseCode)
  const buildingTabs = computed(() => role.value === 'resident'
    ? [...(hasPremise.value ? [['premises', 'Моё помещение']] : []), ['tickets', 'Мои заявки']]
    : [['premises', 'Помещения'], ['systems', 'Инженерные системы'], ['tickets', 'Заявки'], ['maintenance', 'Техобслуживание'], ['incidents', 'Аварии']])
  const buildingRelated = computed(() => visibleRows(detailTab.value).filter((row) => row.buildingCode === currentBuilding.value?.code))
  const events = computed(() => {
    if (!role.value) return []
    const latest = [...baseTickets.value].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 12).map((row) => ({ resource: 'tickets', row, key: row.code + ':' + (row.updatedAt || row.createdAt), title: row.title, sub: row.status + ' · ' + address(row.buildingCode), icon: 'ticket' }))
    if (role.value === 'resident') return latest
    const incidents = data.value.incidents.filter((row) => row.status !== 'Устранена').map((row) => ({ resource: 'incidents', row, key: row.code + ':' + (row.updatedAt || row.occurredOn), title: row.title, sub: 'Авария · ' + address(row.buildingCode), icon: 'alarm' }))
    const upcoming = data.value.maintenance.filter((row) => row.status === 'Запланировано' && row.dueOn >= localDay() && row.dueOn <= shiftDate(localDay(), 7)).map((row) => ({ resource: 'maintenance', row, key: row.code + ':' + (row.updatedAt || row.dueOn), title: row.title, sub: 'Плановая работа · ' + dateLabel(row.dueOn), icon: 'calendar' }))
    const late = baseTickets.value.filter(overdue).map((row) => ({ resource: 'tickets', row, key: 'late:' + row.code + ':' + row.dueAt, title: row.title, sub: 'Истёк срок · ' + address(row.buildingCode), icon: 'clock' }))
    return [...incidents, ...late, ...upcoming, ...latest]
  })
  const seen = ref([])
  const seenKey = () => 'kontur-seen:live:' + (user.value?.email || '')
  const unread = computed(() => events.value.filter((event) => !seen.value.includes(event.key)).length)
  const searchResults = computed(() => {
    const query = globalQuery.value.trim().toLowerCase()
    if (!query) return []
    const resources = ['tickets','buildings','maintenance','incidents','employees','materials']
    return resources.filter((resource) => canView(role.value, resource)).flatMap((resource) => visibleRows(resource).filter((row) => [row.code,row.title,row.name,row.address].some((part) => part?.toLowerCase().includes(query))).map((row) => ({ resource, row, icon: schemas[resource]?.icon || 'ticket', title: row.title || row[schemas[resource]?.label] }))).slice(0, 9)
  })

  function showToast(message) {
    toast.value = message
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => { toast.value = '' }, 3600)
  }
  function resetFilters(status = '') {
    Object.assign(filters, { query: '', status, priority: '', category: '', building: '' })
    limit.value = 12
  }
  function navigate(target, status = '', code = '', replace = false) {
    if (!canView(role.value, target)) return
    page.value = target
    sub.value = ''
    buildingCode.value = target === 'buildings' ? code || (role.value === 'resident' ? user.value.buildingCode : '') : ''
    detailTab.value = role.value === 'resident' && !hasPremise.value ? 'tickets' : 'premises'
    resetFilters(status)
    const hash = target === 'dashboard' ? '#/' : '#/' + target + (buildingCode.value ? '/' + encodeURIComponent(buildingCode.value) : '')
    if (location.hash !== hash) history[replace ? 'replaceState' : 'pushState'](null, '', hash)
    navOpen.value = false
    popover.value = ''
    window.scrollTo(0, 0)
  }
  function restoreRoute() {
    const [target, code] = location.hash.slice(2).split('/')
    let building = ''
    try { building = decodeURIComponent(code || '') } catch { /* invalid route */ }
    navigate(canView(role.value, target) ? target : 'dashboard', '', building, true)
  }
  function setSub(value) {
    sub.value = value
    resetFilters()
  }
  function openEditor(resource, row = null, defaults = {}) {
    popover.value = ''
    if (!row && !canEdit(resource, row)) return
    modalError.value = ''
    modal.value = { resource, row, defaults, key: resource + (row?.code || 'new') }
    nextTick(() => { if (!dialog.value.open) dialog.value.showModal() })
  }
  function closeDialog(force = false) {
    if (busy.value && !force) return
    dialog.value?.close()
    modal.value = null
    modalError.value = ''
  }
  function openRecord(resource, row) {
    popover.value = ''
    if (resource === 'buildings') navigate('buildings', '', row.code)
    else openEditor(resource, row)
  }
  function markRead(key) {
    seen.value = [...new Set([...seen.value, ...(key ? [key] : events.value.map((item) => item.key))])]
    localStorage.setItem(seenKey(), JSON.stringify(seen.value))
  }
  function setAuthMode(nextMode) {
    authMode.value = nextMode
    authForm.password = ''
    modalError.value = ''
  }
  function signOut() {
    user.value = null
    token.value = ''
    data.value = emptyData()
    loadError.value = ''
    loading.value = false
    page.value = 'dashboard'
    popover.value = ''
    localStorage.removeItem('kontur-session-v1')
    history.replaceState(null, '', '#/')
    setAuthMode('signin')
  }
  async function fetchData(authUser = user.value, authToken = token.value) {
    if (!roles[authUser?.role]) throw new Error('Для аккаунта не назначена роль. Проверьте поле role в ресурсе users.')
    const scoped = authUser.role === 'resident'
    const needed = scoped
      ? ['buildings', 'tickets', ...(authUser.buildingCode && authUser.premiseCode ? ['premises'] : [])]
      : resources
    const query = (resource) => {
      if (!scoped) return resource
      if (resource === 'tickets') return resource + '?residentEmail=' + encodeURIComponent(authUser.email)
      const code = resource === 'buildings' ? authUser.buildingCode : authUser.premiseCode
      return code ? resource + '?code=' + encodeURIComponent(code) : resource
    }
    const results = await Promise.allSettled(needed.map((key) => api(query(key), { token: authToken })))
    const denied = results.find((item) => item.status === 'rejected' && item.reason.status === 401)
    if (denied) throw denied.reason
    const missing = needed.filter((_, index) => results[index].status === 'rejected' || !Array.isArray(results[index].value))
    if (missing.length) throw new Error('Не удалось прочитать ресурсы Mokky: ' + missing.join(', ') + '. Проверьте их наличие и настройки.')
    return { ...emptyData(), ...Object.fromEntries(needed.map((key, index) => [key, results[index].value])) }
  }
  async function submitAuth() {
    if (busy.value) return
    const registering = authMode.value === 'register'
    const fullName = authForm.fullName.trim()
    if (registering && !fullName) {
      modalError.value = 'Укажите имя и фамилию.'
      return
    }
    busy.value = true
    modalError.value = ''
    try {
      const credentials = { email: authForm.email.trim().toLowerCase(), password: authForm.password }
      const session = await api(registering ? 'register' : 'auth', {
        method: 'POST',
        payload: registering ? { fullName, role: 'resident', ...credentials } : credentials,
      })
      if (typeof session?.token !== 'string' || !session.token || !session.data?.email) {
        throw new Error('Mokky вернул неполные данные сессии.')
      }
      localStorage.setItem('kontur-session-v1', JSON.stringify(session.token))
      data.value = emptyData()
      user.value = null
      token.value = session.token
      authForm.password = ''
      history.replaceState(null, '', '#/')
      await refresh(true, session.data)
      if (token.value && !loadError.value) showToast(registering ? 'Аккаунт создан' : 'Вход выполнен')
    } catch (error) {
      if (error.status === 403) modalError.value = registering ? 'Регистрация отключена в настройках проекта Mokky.' : 'Вход отключён в настройках проекта Mokky.'
      else if (!registering && [400, 401, 404].includes(error.status)) modalError.value = 'Проверьте электронную почту и пароль.'
      else if (registering && error.status === 409) modalError.value = 'С этим адресом уже есть аккаунт. Войдите с его паролем.'
      else modalError.value = error.message
    } finally {
      busy.value = false
    }
  }
  async function refresh(restore = false, sessionUser = null) {
    if (!token.value || loading.value) return
    const currentToken = token.value
    loading.value = true
    loadError.value = ''
    try {
      let profile = user.value
      if (!profile) {
        const result = await api('auth_me', { token: currentToken })
        profile = { ...sessionUser, ...(result?.data || result) }
        if (!profile.email) throw new Error('Mokky не вернул профиль пользователя.')
        profile.role ||= 'resident'
      }
      const records = await fetchData(profile, currentToken)
      if (token.value !== currentToken) return
      user.value = profile
      data.value = records
      seen.value = loadLocal(seenKey(), [])
      if (restore) restoreRoute()
      else showToast('Данные обновлены')
    } catch (error) {
      if (token.value !== currentToken) return
      if ([401, 404].includes(error.status)) {
        signOut()
        showToast('Сессия завершена. Войдите снова.')
      } else loadError.value = error.message
    } finally {
      if (token.value === currentToken) loading.value = false
    }
  }

  function prepareTicket(payload, previous) {
    const now = new Date().toISOString()
    const next = { ...payload }
    if (role.value === 'resident') {
      Object.assign(next, {
        residentEmail: user.value.email, buildingCode: user.value.buildingCode || next.buildingCode,
        premiseCode: user.value.premiseCode || '', status: 'Новая', priority: 'Обычный', materials: [], laborCost: 0,
      })
      if (!availableBuildings.value.some((row) => row.code === next.buildingCode)) throw new Error('Выберите дом из реестра.')
    }
    if (!next.title || !next.description || !next.buildingCode) throw new Error('Заполните тему, адрес и описание заявки.')
    if (['Назначена','В работе','Выполнена'].includes(next.status) && !next.assigneeCode) throw new Error('Назначьте исполнителя.')
    if (['Выполнена','Отклонена'].includes(next.status) && !next.result) throw new Error('Укажите результат работ или причину отклонения.')
    if (next.dueAt && next.dueAt < (previous?.createdAt || now) && next.dueAt !== previous?.dueAt) throw new Error('Срок не может быть раньше создания заявки.')
    if (next.residentEmail) next.residentEmail = next.residentEmail.toLowerCase()
    next.materials = (next.materials || []).map((item) => {
      const material = data.value.materials.find((row) => row.code === item.materialCode)
      if (!material || !Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error('Проверьте материалы и их количество.')
      const oldItem = previous?.materials?.find((row) => row.materialCode === item.materialCode)
      if (item.quantity - (oldItem?.quantity || 0) > Math.max(0, stock(material)) + 0.000001) throw new Error('Недостаточно на складе: ' + material.name)
      return { materialCode: item.materialCode, quantity: item.quantity, unitPrice: oldItem?.unitPrice ?? material.price }
    })
    if (new Set(next.materials.map((item) => item.materialCode)).size !== next.materials.length) throw new Error('Укажите каждый материал одной строкой.')
    next.createdAt = previous?.createdAt || now
    next.updatedAt = now
    next.completedAt = next.status === 'Выполнена' ? previous?.completedAt || now : ''
    const changes = []
    if (!previous) changes.push('Заявка зарегистрирована')
    if (previous && previous.status !== next.status) changes.push('Статус: ' + next.status)
    if (previous?.assigneeCode !== next.assigneeCode && next.assigneeCode) changes.push('Исполнитель: ' + employee(next.assigneeCode))
    if (previous && previous.priority !== next.priority) changes.push('Приоритет: ' + next.priority)
    next.history = [...(previous?.history || []), { at: now, text: changes.join(' · ') || 'Данные заявки обновлены', author: user.value.fullName || roles[role.value] }]
    return next
  }
  function prepareRecord(resource, payload, previous) {
    const next = { ...payload, updatedAt: new Date().toISOString() }
    for (const field of schemas[resource].fields) {
      if (field.required && (next[field.key] === '' || next[field.key] === null || next[field.key] === undefined)) throw new Error('Заполните поле «' + field.label + '».')
      if (field.type === 'number' && next[field.key] !== '' && (!Number.isFinite(next[field.key]) || next[field.key] < field.min)) throw new Error('Проверьте поле «' + field.label + '».')
    }
    if (resource === 'maintenance') {
      if (next.status === 'Выполнено') next.completedOn ||= localDay()
      else next.completedOn = ''
    }
    if (resource === 'incidents') {
      if (next.status === 'Устранена') next.resolvedOn ||= localDay()
      else next.resolvedOn = ''
      if (next.resolvedOn && next.resolvedOn < next.occurredOn) throw new Error('Дата устранения раньше даты происшествия.')
    }
    if (resource === 'stock_moves') {
      const delta = (move) => move.type === 'Приход' ? move.quantity : -move.quantity
      const affected = new Set([next.materialCode, previous?.materialCode].filter(Boolean))
      for (const code of affected) {
        const material = data.value.materials.find((row) => row.code === code)
        const after = stock(material) + (next.materialCode === code ? delta(next) : 0) - (previous?.materialCode === code ? delta(previous) : 0)
        if (after < -0.000001) throw new Error('Недостаточно на складе: ' + material.name)
      }
    }
    if (resource === 'materials' && previous && stock(previous) + next.initialQuantity - previous.initialQuantity < -0.000001) throw new Error('Начальный остаток недостаточен с учётом уже проведённых операций.')
    if (resource === 'premises' && data.value.premises.some((row) => row.code !== previous?.code && row.buildingCode === next.buildingCode && row.number === next.number)) throw new Error('Помещение с этим номером уже есть в доме.')
    return next
  }
  async function save(payload, file) {
    if (busy.value || !modal.value) return
    const { resource, row } = modal.value
    if (!canEdit(resource, row)) return
    busy.value = true
    modalError.value = ''
    try {
      const next = resource === 'tickets' ? prepareTicket(payload, row) : prepareRecord(resource, payload, row)
      if (file) next.photoUrl = await photoUrl(file, token.value)
      const codePrefixes = { tickets: 'Z', buildings: 'B', premises: 'P', systems: 'S', employees: 'E', crews: 'C', maintenance: 'M', incidents: 'I', materials: 'SKU', stock_moves: 'SM' }
      next.code = row?.code || codePrefixes[resource] + '-' + crypto.randomUUID().slice(0, 8).toUpperCase()
      delete next.id
      const saved = await api(resource + (row ? '/' + encodeURIComponent(row.id) : ''), { method: row ? 'PATCH' : 'POST', payload: next, token: token.value })
      const entry = { ...next, ...saved, id: saved?.id ?? row?.id }
      if (!entry.id) throw new Error('Mokky не вернул идентификатор. Обновите данные перед повтором.')
      const records = row ? data.value[resource].map((item) => item.code === row.code ? entry : item) : [...data.value[resource], entry]
      data.value = { ...data.value, [resource]: records }
      closeDialog(true)
      showToast(row ? 'Изменения сохранены' : resource === 'tickets' ? 'Заявка зарегистрирована' : 'Запись добавлена')
    } catch (error) {
      modalError.value = error.message
    } finally {
      busy.value = false
    }
  }
  function repeatWork(row) {
    const { title, buildingCode, systemCode, assigneeCode, repeatDays, description, cost } = row
    const dueOn = shiftDate(row.dueOn, repeatDays)
    if (data.value.maintenance.some((item) => item.buildingCode === buildingCode && item.systemCode === systemCode && item.dueOn === dueOn && item.title === title && item.status !== 'Отменено')) {
      showToast('Повтор на эту дату уже запланирован')
      return
    }
    openEditor('maintenance', null, { title, buildingCode, systemCode, assigneeCode, repeatDays, description, cost, dueOn })
  }
  function togglePopover(name) {
    popover.value = popover.value === name ? '' : name
    if (popover.value === 'search') nextTick(() => searchBox.value?.focus())
  }
  function onKey(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !modal.value) {
      event.preventDefault()
      togglePopover('search')
    }
    if (event.key === 'Escape') {
      popover.value = ''
      navOpen.value = false
    }
  }

  onMounted(() => {
    window.addEventListener('popstate', restoreRoute)
    window.addEventListener('keydown', onKey)
    if (token.value) refresh(true)
  })
  onUnmounted(() => {
    window.removeEventListener('popstate', restoreRoute)
    window.removeEventListener('keydown', onKey)
    clearTimeout(toastTimer)
  })

  return {
    token, user, role, data, page, detailTab, navOpen, popover, globalQuery, searchBox, dialog, modal, modalError, busy, loading, loadError, toast, authMode, authForm, filters, limit, pageName, initials, availableBuildings, currentBuilding, canCreateTicket, canEdit, baseTickets, lookup, address, employee, stock, filteredTickets, registry, registryRows, buildingTabs, buildingRelated, events, seen, unread, searchResults,
    navigate, resetFilters, setSub, openEditor, openRecord, closeDialog, markRead, setAuthMode, submitAuth, signOut, refresh, save, repeatWork, togglePopover,
  }
}
