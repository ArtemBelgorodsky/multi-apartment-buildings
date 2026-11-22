<script setup>
import Icon from './components/Icon.vue'
import Dashboard from './components/Dashboard.vue'
import TicketTable from './components/TicketTable.vue'
import RecordTable from './components/RecordTable.vue'
import RecordEditor from './components/RecordEditor.vue'
import Analytics from './components/Analytics.vue'
import AccountForm from './components/AccountForm.vue'
import Blueprint from './components/Blueprint.vue'
import { canManage, canView, categories, integer, priorities, roles, statuses, zones } from './model'
import { descriptions, schemas } from './schema'
import { useWorkspace } from './workspace'

const {
  token, user, role, data, page, detailTab, navOpen, popover, globalQuery, searchBox, dialog, modal, modalError, busy, loading, loadError, toast, authMode, authForm, filters, limit,
  pageName, initials, availableBuildings, currentBuilding, canCreateTicket, canEdit, baseTickets, lookup, address, employee, stock, filteredTickets, registry, registryRows, buildingTabs, buildingRelated, events, seen, unread, searchResults,
  navigate, resetFilters, setSub, openEditor, openRecord, closeDialog, markRead, setAuthMode, submitAuth, signOut, refresh, save, repeatWork, togglePopover,
} = useWorkspace()
</script>

<template>
  <div v-if="!token" class="auth-gate">
    <section class="auth-entry">
      <div class="auth-brand">
        <span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></span>
        <div><strong>Контур<span class="brand-dot">.</span></strong><p>Управление жилым фондом</p></div>
      </div>
      <AccountForm
        v-model:full-name="authForm.fullName" v-model:email="authForm.email" v-model:password="authForm.password"
        :mode="authMode" :error="modalError" :busy="busy" @switch="setAuthMode" @submit="submitAuth"
      />
    </section>
    <div class="auth-visual" aria-hidden="true"><Blueprint /></div>
  </div>
  <div v-else class="workspace" @click.self="popover = ''">
    <button v-if="navOpen" class="nav-overlay" aria-label="Закрыть меню" @click="navOpen = false"></button>
    <aside class="sidebar" :class="{ 'menu-open': navOpen }">
      <button class="brand" @click="navigate('dashboard')">
        <span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></span>
        <span><strong>Контур<span class="brand-dot">.</span></strong><small>Управление жилым фондом</small></span>
      </button>
      <nav class="nav" aria-label="Основная навигация">
        <div v-for="zone in zones" :key="zone.label" v-show="zone.pages.some(([key]) => canView(role, key))" class="nav-group">
          <p>{{ zone.label }}</p>
          <button v-for="[key, label, icon] in zone.pages.filter(([key]) => canView(role, key))" :key="key" :class="{ current: page === key }" :aria-current="page === key ? 'page' : undefined" @click="navigate(key)">
            <Icon :name="icon" :size="17" /><span>{{ label }}</span><Icon v-if="page === key" name="chevron" :size="14" class="nav-arrow" />
          </button>
        </div>
      </nav>
      <div class="sidebar-bottom">
        <button class="sidebar-login" :disabled="loading" @click="refresh()"><Icon name="refresh" :size="17" /> Обновить данные</button>
      </div>
    </aside>

    <div class="surface" @click.self="popover = ''">
      <header class="topbar">
        <div class="breadcrumbs">
          <button class="icon-button mobile-menu" aria-label="Открыть меню" @click="navOpen = true"><Icon name="menu" /></button>
          <span>Рабочее пространство</span><Icon name="chevron" :size="13" /><strong>{{ pageName }}</strong>
        </div>
        <div v-if="user" class="top-actions">
          <div class="popover-anchor search-anchor">
            <button class="top-search" aria-label="Поиск по системе" :aria-expanded="popover === 'search'" @click="togglePopover('search')"><Icon name="search" :size="18" /><span>Поиск</span><kbd>Ctrl K</kbd></button>
            <div v-if="popover === 'search'" class="popover search-popover">
              <input ref="searchBox" v-model="globalQuery" placeholder="Заявка, адрес, сотрудник…" aria-label="Поиск по системе" />
              <div v-if="globalQuery && !searchResults.length" class="popover-empty">Совпадений нет</div>
              <button v-for="item in searchResults" :key="item.resource + item.row.code" class="pop-row" @click="openRecord(item.resource, item.row)"><Icon :name="item.icon" :size="17" />{{ item.title }}</button>
            </div>
          </div>
          <div class="popover-anchor">
            <button class="icon-button bell" aria-label="Уведомления" :aria-expanded="popover === 'events'" @click="togglePopover('events')"><Icon name="bell" :size="20" /><i v-if="unread"></i></button>
            <div v-if="popover === 'events'" class="popover events-popover">
              <div class="pop-heading"><strong>Уведомления</strong><button v-if="unread" class="text-link" @click="markRead()">Прочитать все</button></div>
              <div v-if="!events.length" class="popover-empty">Новых событий нет</div>
              <button v-for="item in events" :key="item.key" class="pop-row" :class="{ unread: !seen.includes(item.key) }" @click="markRead(item.key); openRecord(item.resource, item.row)"><Icon :name="item.icon" :size="17" /><span>{{ item.title }}<small>{{ item.sub }}</small></span></button>
            </div>
          </div>
          <div class="top-divider"></div>
          <div class="popover-anchor">
            <button class="account" :aria-expanded="popover === 'account'" aria-label="Аккаунт" @click="togglePopover('account')"><span class="avatar">{{ initials }}</span><span class="account-name"><strong>{{ user.fullName }}</strong><small>{{ roles[role] }}</small></span><Icon name="down" :size="15" /></button>
            <div v-if="popover === 'account'" class="popover account-popover">
              <div class="pop-heading"><strong>{{ user.email }}</strong></div>
              <button class="pop-row" @click="signOut()"><Icon name="logout" :size="16" /> Выйти из аккаунта</button>
            </div>
          </div>
        </div>
      </header>

      <main class="content" @click.self="popover = ''">
        <div v-if="loading" class="notice"><Icon name="refresh" :size="18" /> Загрузка данных Mokky…</div>
        <div v-if="loadError" class="notice error" role="alert"><Icon name="alarm" :size="18" /> {{ loadError }} <button class="text-link" @click="refresh(true)">Повторить</button><button class="text-link" @click="signOut()">Выйти из аккаунта</button></div>

        <template v-if="user && !loadError && !loading">
          <div v-if="page === 'dashboard'" class="dashboard-intro">
            <div class="workspace-label"><span></span>{{ role === 'resident' ? 'Личный кабинет' : 'Оперативная сводка' }}</div>
            <button v-if="canCreateTicket" class="button primary" @click="openEditor('tickets')"><Icon name="plus" :size="18" /> Новая заявка</button>
          </div>
          <Dashboard v-if="page === 'dashboard'" :tickets="baseTickets" :data="data" :role="role" :has-home="!!user.buildingCode" :address="address" :employee="employee" @navigate="navigate" @ticket="openEditor('tickets', $event)" @record="openRecord" />

          <template v-else-if="currentBuilding">
            <button v-if="role !== 'resident' || !user.buildingCode" class="text-link back" @click="navigate('buildings')">← Все дома</button>
            <section class="object-card panel">
              <span class="icon-tile" data-tone="blue"><Icon name="building" :size="25" /></span>
              <div><p class="eyebrow">{{ currentBuilding.district }}</p><h1>{{ currentBuilding.address }}</h1><p>{{ currentBuilding.description }}</p></div>
              <button v-if="canManage(role, 'buildings')" class="button secondary" @click="openEditor('buildings', currentBuilding)">Редактировать</button>
              <div class="object-facts"><span>Год постройки <strong>{{ currentBuilding.year }}</strong></span><span>Этажей <strong>{{ currentBuilding.floors }}</strong></span><span>Подъездов <strong>{{ currentBuilding.entrances }}</strong></span><span>Квартир <strong>{{ currentBuilding.apartments }}</strong></span><span>Площадь <strong>{{ integer(currentBuilding.area) }} м²</strong></span><span>Состояние <strong>{{ currentBuilding.condition }}</strong></span></div>
            </section>
            <div class="tabs"><button v-for="[key,label] in buildingTabs" :key="key" :class="{ selected: detailTab === key }" @click="detailTab = key">{{ label }}</button></div>
            <section class="panel records-panel">
              <div class="panel-heading"><h2>{{ buildingTabs.find(([key]) => key === detailTab)?.[1] }}</h2><button v-if="canEdit(detailTab, null)" class="button secondary compact" @click="openEditor(detailTab, null, { buildingCode: currentBuilding.code })"><Icon name="plus" :size="17" /> Добавить</button></div>
              <TicketTable v-if="detailTab === 'tickets'" :rows="buildingRelated" :address="address" :employee="employee" :hide-assignee="role === 'resident'" @open="openEditor('tickets', $event)" />
              <RecordTable v-else :resource="detailTab" :rows="buildingRelated" :lookup="lookup" :stock="stock" @open="openEditor(detailTab, $event)" />
            </section>
          </template>


          <template v-else>
            <div class="page-heading">
              <div><p class="eyebrow">{{ page === 'analytics' ? 'Отчёты' : 'Рабочий раздел' }}</p><h1>{{ pageName }}</h1><p>{{ descriptions[page] }}</p></div>
              <button v-if="page === 'tickets' && canCreateTicket" class="button primary" @click="openEditor('tickets')"><Icon name="plus" :size="18" /> Новая заявка</button>
              <button v-else-if="schemas[registry] && canManage(role, registry)" class="button primary" @click="openEditor(registry)"><Icon name="plus" :size="18" /> Добавить {{ schemas[registry].single }}</button>
            </div>
            <Analytics v-if="page === 'analytics'" :data="data" :lookup="lookup" />
            <template v-else-if="page === 'tickets'">
              <section class="panel filters">
                <label class="filter-search"><Icon name="search" :size="18" /><input v-model="filters.query" aria-label="Найти заявку" placeholder="Тема, номер или адрес" @input="limit = 12" /></label>
                <select v-model="filters.status" aria-label="Статус заявки" @change="limit = 12"><option value="">Все статусы</option><option value="open">Открытые</option><option value="assigned">Назначены и в работе</option><option value="late">Просроченные</option><option v-for="status in statuses" :key="status" :value="status === 'Выполнена' ? 'done' : status">{{ status }}</option></select>
                <select v-model="filters.priority" aria-label="Приоритет заявки" @change="limit = 12"><option value="">Все приоритеты</option><option v-for="value in priorities" :key="value">{{ value }}</option></select>
                <select v-model="filters.category" aria-label="Категория заявки" @change="limit = 12"><option value="">Все категории</option><option v-for="value in categories" :key="value">{{ value }}</option></select>
                <select v-if="role !== 'resident'" v-model="filters.building" aria-label="Фильтр по дому" @change="limit = 12"><option value="">Все дома</option><option v-for="row in availableBuildings" :key="row.code" :value="row.code">{{ row.address }}</option></select>
                <button v-if="Object.values(filters).some(Boolean)" class="text-link" @click="resetFilters()">Сбросить</button>
              </section>
              <section class="panel records-panel">
                <div class="panel-heading"><h2>Журнал заявок <span class="count">{{ filteredTickets.length }}</span></h2></div>
                <TicketTable :rows="filteredTickets.slice(0,limit)" :address="address" :employee="employee" :hide-assignee="role === 'resident'" @open="openEditor('tickets', $event)" />
                <div v-if="filteredTickets.length > limit" class="load-more"><button class="button secondary compact" @click="limit += 12">Показать ещё</button></div>
              </section>
            </template>
            <template v-else-if="schemas[registry]">
              <div v-if="page === 'employees' || page === 'materials'" class="tabs">
                <button v-for="[key, label] in (page === 'employees' ? [['employees','Сотрудники'],['crews','Бригады']] : [['materials','Остатки'],['stock_moves','Движение материалов']])" :key="key" :class="{ selected: registry === key }" @click="setSub(key)">{{ label }}</button>
              </div>
              <section class="panel filters">
                <label class="filter-search"><Icon name="search" :size="18" /><input v-model="filters.query" aria-label="Поиск по реестру" placeholder="Поиск по реестру" /></label>
                <select v-if="['maintenance', 'incidents'].includes(registry)" v-model="filters.building" aria-label="Фильтр по дому"><option value="">Все дома</option><option v-for="row in availableBuildings" :key="row.code" :value="row.code">{{ row.address }}</option></select>
                <select v-if="['maintenance', 'incidents'].includes(registry)" v-model="filters.status" aria-label="Фильтр по статусу"><option value="">Все статусы</option><option v-for="status in schemas[registry].fields.find(field => field.key === 'status').options" :key="status">{{ status }}</option></select>
                <button v-if="Object.values(filters).some(Boolean)" class="text-link" @click="resetFilters()">Сбросить</button>
              </section>
              <section v-if="registry === 'buildings' && registryRows.length" class="buildings-grid">
                <button v-for="row in registryRows" :key="row.code" class="panel building-item" @click="openRecord('buildings', row)">
                  <span class="building-visual"><Icon name="building" :size="48" /><Icon name="diagonal" :size="17" /></span>
                  <span class="building-copy"><small>{{ row.district }}</small><strong>{{ row.address }}</strong><span>{{ row.floors }} эт. · {{ row.apartments }} кв. · {{ integer(row.area) }} м²</span><span class="tag" :data-tone="row.condition === 'Исправно' ? 'green' : row.condition === 'Под наблюдением' ? 'orange' : 'red'">{{ row.condition }}</span></span>
                </button>
              </section>
              <section v-else class="panel records-panel">
                <div class="panel-heading"><h2>{{ schemas[registry].title }} <span class="count">{{ registryRows.length }}</span></h2></div>
                <RecordTable :resource="registry" :rows="registryRows" :lookup="lookup" :stock="stock" @open="openRecord(registry, $event)" />
              </section>
            </template>
          </template>
        </template>
        <footer class="workspace-footer"><strong>Контур</strong><span>Управление жилым фондом</span></footer>
      </main>
    </div>

    <dialog ref="dialog" class="dialog" aria-label="Карточка записи" @cancel.prevent="closeDialog()" @click.self="closeDialog()">
      <template v-if="modal">
        <RecordEditor :key="modal.key" :resource="modal.resource" :row="modal.row" :role="role" :user="user" :data="data" :lookup="lookup" :editable="canEdit(modal.resource, modal.row)" :busy="busy" :error="modalError" :defaults="modal.defaults" @save="save" @close="closeDialog()" />
        <div v-if="modal.resource === 'maintenance' && modal.row?.status === 'Выполнено' && modal.row.repeatDays > 0 && canManage(role, 'maintenance')" class="repeat-action">
          <button class="button secondary" :disabled="busy" @click="repeatWork(modal.row)"><Icon name="calendar" :size="16" /> Запланировать повтор</button>
        </div>
      </template>
    </dialog>
  </div>
  <Transition><div v-if="toast" class="toast" role="status"><Icon name="circlecheck" :size="20" />{{ toast }}</div></Transition>
</template>
