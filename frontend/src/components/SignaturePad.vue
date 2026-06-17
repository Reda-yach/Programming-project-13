<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

// Herbruikbaar teken-canvas: ondersteunt muis én touch.
// Gebruik: <SignaturePad ref="pad" /> en haal de handtekening op met pad.value.getData()
// (geeft een PNG data-URL terug, of null wanneer het canvas leeg is).

const canvas = ref(null)
const leeg = ref(true)
let ctx = null
let tekenen = false
let vorige = null

function positie(e) {
  const rect = canvas.value.getBoundingClientRect()
  const bron = e.touches ? e.touches[0] : e
  // Het canvas wordt via CSS geschaald; reken de displaycoördinaten om naar
  // de interne canvasresolutie zodat de lijn op de juiste plek komt.
  const schaalX = canvas.value.width / rect.width
  const schaalY = canvas.value.height / rect.height
  return {
    x: (bron.clientX - rect.left) * schaalX,
    y: (bron.clientY - rect.top) * schaalY,
  }
}

function start(e) {
  e.preventDefault()
  tekenen = true
  vorige = positie(e)
}

function beweeg(e) {
  if (!tekenen) return
  e.preventDefault()
  const huidig = positie(e)
  ctx.beginPath()
  ctx.moveTo(vorige.x, vorige.y)
  ctx.lineTo(huidig.x, huidig.y)
  ctx.stroke()
  vorige = huidig
  leeg.value = false
}

function stop() {
  tekenen = false
  vorige = null
}

function wis() {
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)
  leeg.value = true
}

function getData() {
  if (leeg.value) return null
  return canvas.value.toDataURL('image/png')
}

defineExpose({ getData, wis, leeg })

onMounted(() => {
  const c = canvas.value
  // Vaste interne resolutie zodat de handtekening scherp blijft.
  c.width = 600
  c.height = 200
  ctx = c.getContext('2d')
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#111827'

  c.addEventListener('mousedown', start)
  c.addEventListener('mousemove', beweeg)
  window.addEventListener('mouseup', stop)
  c.addEventListener('touchstart', start, { passive: false })
  c.addEventListener('touchmove', beweeg, { passive: false })
  c.addEventListener('touchend', stop)
})

onBeforeUnmount(() => {
  window.removeEventListener('mouseup', stop)
})
</script>

<template>
  <div class="signature-pad">
    <canvas ref="canvas" class="signature-canvas"></canvas>
    <div class="flex items-center justify-between mt-8">
      <span class="text-secondary text-xs">Teken hier met je muis</span>
      <button type="button" class="btn btn-outline btn-sm" @click="wis">Wissen</button>
    </div>
  </div>
</template>

<style scoped>
.signature-canvas {
  width: 100%;
  max-width: 600px;
  height: 200px;
  border: 1px dashed var(--border, #cbd5e1);
  border-radius: 8px;
  background: #fff;
  touch-action: none;
  cursor: crosshair;
  display: block;
}
</style>
