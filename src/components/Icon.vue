<script setup>
defineProps({ name: String, size: { type: Number, default: 20 } })
const paths = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  ticket: 'M5 3h14v18H5z M8 8h8 M8 12h8 M8 16h4',
  building: 'M3 21h18 M6 21V5l7-2v18 M13 8h5v13 M9 8h1 M9 12h1 M9 16h1 M15 12h1 M15 16h1',
  calendar: 'M4 5h16v16H4z M4 10h16 M8 3v4 M16 3v4 M8 14h2 M14 14h2 M8 17h2',
  alarm: 'M12 3 2 20h20L12 3Z M12 9v4 M12 16h.01',
  users: 'M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2 M19 15a4 4 0 0 1 3 4v2 M13 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M17 4a3 3 0 0 1 0 6',
  box: 'M3 8 12 3l9 5v9l-9 5-9-5V8Z M3 8l9 5 9-5 M12 13v9 M7.5 5.5l9 5',
  chart: 'M4 4v16h16 M8 16v-3 M12 16V8 M16 16v-5 M20 16V5',
  chevron: 'm9 18 6-6-6-6',
  down: 'm6 9 6 6 6-6',
  arrow: 'M4 12h15 m-6-6 6 6-6 6',
  diagonal: 'M6 18 18 6 M8 6h10v10',
  plus: 'M12 5v14 M5 12h14',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9 M10 21h4',
  search: 'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z m-.5 4.5 5 5',
  clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z M12 7v5l3 2',
  check: 'm5 12 4 4L19 6',
  circlecheck: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z m-13 0 3 3 5-6',
  pin: 'M19 10c0 5-7 11-7 11s-7-6-7-11a7 7 0 1 1 14 0Z M12 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  close: 'm6 6 12 12 M18 6 6 18',
  filter: 'M4 7h16 M7 12h10 M10 17h4',
  download: 'M12 3v12 m-5-5 5 5 5-5 M4 16v4h16v-4',
  camera: 'M3 7h4l2-3h6l2 3h4v13H3z M15 13a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  login: 'M14 4h6v16h-6 M3 12h12 m-4-4 4 4-4 4',
  refresh: 'M20 8V4l-3 3a7 7 0 1 0 2 9 M20 8h-5',
  wrench: 'M14 6a5 5 0 0 0-6 6l-5 5 4 4 5-5a5 5 0 0 0 6-6l-3 3-3-3 2-4Z',
  layers: 'm12 3 9 5-9 5-9-5 9-5Z M3 12l9 5 9-5 M3 16l9 5 9-5',
  home: 'm3 11 9-8 9 8 M5 10v11h14V10 M10 21v-6h4v6',
  logout: 'M10 4H4v16h6 M9 12h12 m-4-4 4 4-4 4',
}
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path :d="paths[name]" />
  </svg>
</template>
