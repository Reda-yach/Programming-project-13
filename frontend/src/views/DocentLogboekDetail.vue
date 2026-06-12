<template>
  <div class="page">
    <AppTopbar active="logboek" />
    <main class="content">

      <p class="breadcrumb">
        <router-link :to="`/docent/studenten/${route.params.studentId}`">
          ← Terug naar student
        </router-link>
      </p>

      <div v-if="laden" class="text-secondary">Laden...</div>
      <div v-else-if="fout" style="color:var(--red);">{{ fout }}</div>

      <div v-else>
        <div class="flex items-center gap-16">
          <h1 class="page-title">Logboek — Week {{ huidigWeek }}</h1>
        </div>

        <div class="flex items-center gap-16 mt-16">
          <button class="btn btn-secondary btn-sm" @click="vorigeWeek" :disabled="huidigWeek <= 1">
            ← Week {{ huidigWeek - 1 }}
          </button>
          <button class="btn btn-secondary btn-sm" @click="volgendeWeek" :disabled="huidigWeek >= maxWeek">
            Week {{ huidigWeek + 1 }} →
          </button>
        </div>

        <div v-if="huidigLogboek" style="margin-top:24px;">
          <div class="card">
            <div class="flex justify-between items-center">
              <h2 class="form-section-title">Week {{ huidigLogboek.week_nummer }}</h2>
              <span
                class="badge"
                :class="{
                  'badge-green': huidigLogboek.status === 'goedgekeurd',
                  'badge-yellow': huidigLogboek.status === 'ingediend',
                  'badge-red': huidigLogboek.status === 'draft'
                }"
              >
                {{ huidigLogboek.status }}
              </span>
            </div>
            <p class="text-secondary text-sm mt-4">
              Ingediend op: {{ formatDatum(huidigLogboek.ingediend_op) }}
            </p>
          </div>

          <div class="card mt-16">
            <h2 class="form-section-title">Beschrijving van uitgevoerde taken</h2>
            <p class="mt-8" style="white-space:pre-line;">{{ huidigLogboek.activiteiten || 'Niet ingevuld' }}</p>
          </div>

          <div class="card mt-16">
            <h2 class="form-section-title">Reflectie</h2>
            <p class="mt-8" style="white-space:pre-line;">{{ huidigLogboek.reflectie || 'Niet ingevuld' }}</p>
          </div>

          <div class="card mt-16">
            <h2 class="form-section-title">Problemen / Leerpunten</h2>
            <p class="mt-8" style="white-space:pre-line;">{{ huidigLogboek.leerpunten || 'Niet ingevuld' }}</p>
          </div>

          <div class="card mt-16">
            <h2 class="form-section-title">Mentorfeedback</h2>
            <div v-if="feedback.length === 0" class="mt-8">
              <p class="text-secondary text-sm">
                De mentor heeft nog geen feedback gegeven voor deze week.
              </p>
            </div>
            <div
              v-for="f in feedback"
              :key="f.feedback_id"
              class="mt-8"
              style="border-bottom:1px solid #e5e7eb;padding-bottom:8px;"
            >
              <p class="text-sm"><strong>{{ f.voornaam }} {{ f.auteur }}</strong></p>
              <p class="mt-4">{{ f.opmerking }}</p>
              <p class="text-secondary text-sm mt-4">{{ f.created_at?.split('T')[0] }}</p>
            </div>
          </div>
        </div>

        <div v-else class="card mt-24">
          <p class="text-secondary">Geen logboek gevonden voor week {{ huidigWeek }}.</p>
        </div>
      </div>

    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppTopbar from '@/components/AppTopbar.vue'

const route = useRoute()
const logboeken = ref([])
const feedback = ref([])
const laden = ref(true)
const fout = ref(null)
const huidigWeek = ref(1)
const API = 'http://localhost:3000/api'

const maxWeek = computed(() => {
  if (logboeken.value.length === 0) return 1
  return Math.max(...logboeken.value.map(l => l.week_nummer))
})

const huidigLogboek = computed(() => {
  return logboeken.value.find(l => l.week_nummer === huidigWeek.value) || null
})

onMounted(async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API}/stages/${route.params.studentId}/logboeken`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Laden mislukt')
    logboeken.value = data
    if (data.length > 0) {
      huidigWeek.value = Math.max(...data.map(l => l.week_nummer))
      await laadFeedback()
    }
  } catch (e) {
    fout.value = e.message
  } finally {
    laden.value = false
  }
})

async function laadFeedback() {
  if (!huidigLogboek.value) return
  const token = localStorage.getItem('token')
  const res = await fetch(`${API}/logboeken/${huidigLogboek.value.logboek_id}/feedback`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  feedback.value = await res.json()
}

async function vorigeWeek() {
  if (huidigWeek.value > 1) {
    huidigWeek.value--
    await laadFeedback()
  }
}

async function volgendeWeek() {
  if (huidigWeek.value < maxWeek.value) {
    huidigWeek.value++
    await laadFeedback()
  }
}

function formatDatum(datum) {
  if (!datum) return '—'
  return new Date(datum).toLocaleDateString('nl-BE', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}
</script>
