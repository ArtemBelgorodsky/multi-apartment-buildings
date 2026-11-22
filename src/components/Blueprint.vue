<script setup>
import { onMounted, ref } from 'vue'

const canvas = ref(null)
onMounted(() => {
  const ctx = canvas.value.getContext('2d')
  ctx.scale(2, 2)
  const project = ([x, y, z]) => [266 + (x - y) * 0.90, 163 + (x + y) * 0.30 - z]
  const line = (points, stroke, close = false, fill) => {
    ctx.beginPath()
    points.forEach((point, index) => ctx[index ? 'lineTo' : 'moveTo'](...project(point)))
    if (close) ctx.closePath()
    if (fill) { ctx.fillStyle = fill; ctx.fill() }
    ctx.strokeStyle = stroke
    ctx.stroke()
  }
  ctx.lineWidth = .55
  for (let i = -150; i <= 190; i += 15) {
    line([[-150, i, 0], [190, i, 0]], '#345084')
    line([[i, -150, 0], [i, 190, 0]], '#345084')
  }
  line([[112,-103,0],[112,102,0],[-89,102,0],[-89,44,0]], '#dd8960')
  line([[-52,-85,0],[103,-85,0],[103,81,0],[-52,81,0]], '#708bd0', true)
  const buildings = [
    [-65,-62,62,54,57], [39,-57,52,43,82], [-33,-25,76,50,134], [53,24,40,40,63],
  ]
  for (const [x,y,w,d,h] of buildings) {
    const edge = '#7398e5'
    line([[x+w,y,0],[x+w,y+d,0],[x+w,y+d,h],[x+w,y,h]],edge,true,'#284981')
    line([[x,y+d,0],[x+w,y+d,0],[x+w,y+d,h],[x,y+d,h]],edge,true,'#21386a')
    line([[x,y,h],[x+w,y,h],[x+w,y+d,h],[x,y+d,h]],edge,true,'#36598e')
    line([[x+5,y+5,h],[x+w-5,y+5,h],[x+w-5,y+d-5,h],[x+5,y+d-5,h]], '#83a9ec',true)
    for (let z=9;z<h-6;z+=9) {
      line([[x+2,y+d,z],[x+w,y+d,z],[x+w,y+2,z]], '#5678b5')
      for (let j=5;j<w-5;j+=10) line([[x+j,y+d,z+2],[x+j+5,y+d,z+2],[x+j+5,y+d,z+6],[x+j,y+d,z+6]], '#6084c9',true)
      for (let j=5;j<d-5;j+=10) line([[x+w,y+j,z+2],[x+w,y+j+5,z+2],[x+w,y+j+5,z+6],[x+w,y+j,z+6]], '#6a8dcc',true)
    }
  }
  const markers = [[43,25,107],[93,64,32],[112,102,0],[-89,44,0]]
  for (const point of markers) {
    const [x,y] = project(point)
    ctx.fillStyle = '#f7a16e'
    ctx.fillRect(x-2,y-2,4,4)
    ctx.strokeStyle = '#f7a16e'
    ctx.strokeRect(x-5,y-5,10,10)
  }
})
</script>

<template><canvas ref="canvas" width="1080" height="500" class="blueprint" aria-hidden="true"></canvas></template>
