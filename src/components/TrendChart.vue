<script setup>
import { computed, ref } from 'vue'
import { integer } from '../model'
const props = defineProps({ rows: { type: Array, required: true } })
const active = ref(-1)
const maximum = computed(() => {
  const peak = Math.max(0, ...props.rows.flatMap((row) => [row.created, row.completed]))
  return Math.max(4, Math.ceil(peak / 4) * 4)
})
const axis = computed(() => Array.from({ length: 5 }, (_, i) => maximum.value * (4 - i) / 4))
const x = (i) => 44 + 690 * i / Math.max(1, props.rows.length - 1)
const y = (value) => 157 - 139 * value / maximum.value
const path = (key) => props.rows.map((row, i) => {
  if (!i) return 'M ' + x(0) + ' ' + y(row[key])
  const middle = (x(i - 1) + x(i)) / 2
  return ['C', middle, y(props.rows[i - 1][key]), middle, y(row[key]), x(i), y(row[key])].join(' ')
}).join(' ')
const labelEvery = computed(() => Math.max(1, Math.ceil(props.rows.length / 8)))
</script>

<template>
  <div class="chart-wrap" @mouseleave="active = -1">
    <svg viewBox="0 0 760 192" role="img" aria-label="Динамика поступления и выполнения заявок">
      <defs>
        <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#4f70ec" stop-opacity=".18" />
          <stop offset="100%" stop-color="#4f70ec" stop-opacity=".015" />
        </linearGradient>
      </defs>
      <g v-for="tick in axis" :key="tick">
        <path :d="'M44 '+ y(tick) +'H735'" stroke="#e7ebf2" stroke-dasharray="3 4" />
        <text x="27" :y="y(tick) + 4" text-anchor="end">{{ integer(tick) }}</text>
      </g>
      <template v-if="rows.length">
        <path :d="path('created') + ' L ' + x(rows.length - 1) + ' 157 L 44 157 Z'" fill="url(#trend-fill)" />
        <path :d="path('created')" fill="none" stroke="#496ae5" stroke-width="2.7" />
        <path :d="path('completed')" fill="none" stroke="#48a88b" stroke-width="2.2" stroke-dasharray="5 5" />
        <circle v-for="(row, i) in rows" :key="row.day" :cx="x(i)" :cy="y(row.created)" :r="rows.length > 10 ? 2 : 3.3" fill="white" stroke="#496ae5" stroke-width="1.7" />
        <g v-for="(row, i) in rows" :key="'label'+row.day">
          <text v-if="i % labelEvery === 0 || i === rows.length - 1" :x="x(i)" y="181" text-anchor="middle">{{ row.label }}</text>
          <rect :x="x(i)-Math.min(46,345/Math.max(1,rows.length-1))" y="8" :width="Math.min(92,690/Math.max(1,rows.length-1))" height="152" fill="transparent" @mouseenter="active = i">
            <title>{{ row.label }}: {{ row.created }} поступило, {{ row.completed }} выполнено</title>
          </rect>
        </g>
        <path v-if="active >= 0 && rows[active]" :d="'M'+x(active)+' 14V157'" stroke="#8d9fc8" stroke-dasharray="4 4" pointer-events="none" />
      </template>
    </svg>
    <div v-if="active >= 0 && rows[active]" class="chart-tooltip">
      {{ rows[active].label }} · {{ rows[active].created }} поступило · {{ rows[active].completed }} выполнено
    </div>
  </div>
</template>
