<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import TopBarDocentStagecommissie from '@/components/TopBarDocentStagecommissie.vue'

const navLinks = ref([
  { label: 'Studenten', to: '/docent-studenten' },
  { label: 'Logboek', to: '/docent-logboek-overzicht' },
  { label: 'Evaluaties', to: '/docent-evaluaties' },
  { label: 'Aanvragen', to: '/docent-aanvragen' },
])

const route = useRoute()
const stageId = route.params.stageId

const logboeken = ref([])
const huidigWeek = ref(null)
const feedback = ref('')
const bestaandeFeedback = ref([])
const laadFout = ref('')
const feedbackBericht = ref('')
const bezig = ref(false)
const gebruiker = JSON.parse(localStorage.getItem('gebruiker') || '{}')

onMounted(async () => {
  await laadLogboeken()
})

async function laadLogboeken() {
  laadFout.value = ''
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/stages/${stageId}/logboeken`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Ophalen mislukt')
    logboeken.value = await res.json()
    if (logboeken.value.length > 0) {
      huidigWeek.value = logboeken.value[logboeken.value.length - 1].week_nummer
      await laadFeedback()
    }
  } catch {
    laadFout.value = 'Logboeken konden niet geladen worden.'
  }
}

const huidigLogboek = computed(() =>
  logboeken.value.find((l) => l.week_nummer === huidigWeek.value) || null
)

const weken = computed(() => logboeken.value.map((l) => l.week_nummer).sort((a, b) => a - b))

const vorigeWeek = computed(() => {
  const idx = weken.value.indexOf(huidigWeek.value)
  return idx > 0 ? weken.value[idx - 1] : null
})

const volgendeWeek = computed(() => {
  const idx = weken.value.indexOf(huidigWeek.value)
  return idx < weken.value.length - 1 ? weken.value[idx + 1] : null
})

async function navigeerNaarWeek(week) {
  huidigWeek.value = week
  feedback.value = ''
  feedbackBericht.value = ''
  await laadFeedback()
}

async function laadFeedback() {
  if (!huidigLogboek.value) return
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/logboeken/${huidigLogboek.value.logboek_id}/feedback`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    bestaandeFeedback.value = await res.json()
  } catch {
    bestaandeFeedback.value = []
  }
}

async function slaFeedbackOp() {
  if (!feedback.value.trim() || !huidigLogboek.value) return
  bezig.value = true
  feedbackBericht.value = ''
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/logboeken/${huidigLogboek.value.logboek_id}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ gebruiker_id: gebruiker.id, opmerking: feedback.value }),
    })
    if (res.ok) {
      feedback.value = ''
      feedbackBericht.value = 'Feedback opgeslagen!'
      await laadFeedback()
      setTimeout(() => (feedbackBericht.value = ''), 2500)
    }
  } catch {
    feedbackBericht.value = 'Opslaan mislukt.'
  } finally {
    bezig.value = false
  }
}

function statusBadge(status) {
  if (status === 'goedgekeurd') return 'badge-green'
  if (status === 'ingediend') return 'badge-yellow'
  if (status === 'draft') return 'badge-red'
  return ''
}

function formatDatum(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="page">
    <TopBarDocentStagecommissie :links="navLinks" />

    <main class="content">
      <router-link to="/docent-logboek-overzicht" class="text-secondary text-sm">
        ← Logboekenoverzicht
      </router-link>

      <p v-if="laadFout" class="text-secondary mt-16" style="color:#dc2626;">{{ laadFout }}</p>

      <div v-if="logboeken.length === 0 && !laadFout" class="card mt-24">
        <p class="text-secondary">Nog geen logboeken ingediend voor deze stage.</p>
      </div>

      <template v-if="huidigLogboek">
        <!-- Studentinfo -->
        <section class="card" style="margin-top:16px;">
          <div class="flex justify-between items-center">
            <div>
              <div class="td-name">
                {{ huidigLogboek.voornaam }} {{ huidigLogboek.student }}
              </div>
              <div class="td-sub">Week {{ huidigLogboek.week_nummer }}</div>
            </div>
            <span class="badge badge-pill" :class="statusBadge(huidigLogboek.status)">
              {{ huidigLogboek.status }}
            </span>
          </div>
        </section>

        <!-- Week-navigatie -->
        <div class="flex justify-between items-center" style="margin:16px 0;">
          <button
            class="btn btn-sm"
            :disabled="!vorigeWeek"
            @click="vorigeWeek && navigeerNaarWeek(vorigeWeek)"
          >
            ← Week {{ vorigeWeek ?? '—' }}
          </button>
          <div style="text-align:center;">
            <div class="font-semibold">Week {{ huidigLogboek.week_nummer }}</div>
            <div class="text-secondary text-sm">
              Ingediend op {{ formatDatum(huidigLogboek.ingediend_op) }}
            </div>
          </div>
          <button
            class="btn btn-sm"
            :disabled="!volgendeWeek"
            @click="volgendeWeek && navigeerNaarWeek(volgendeWeek)"
          >
            Week {{ volgendeWeek ?? '—' }} →
          </button>
        </div>

        <!-- Logboekinhoud -->
        <section class="card" style="margin-bottom:12px;">
          <h2 class="form-section-title">Uitgevoerde taken</h2>
          <p class="mt-8" style="white-space:pre-line;line-height:1.6;">
            {{ huidigLogboek.activiteiten || 'Niet ingevuld.' }}
          </p>
        </section>

        <section class="card" style="margin-bottom:12px;">
          <h2 class="form-section-title">Reflectie</h2>
          <p class="mt-8" style="white-space:pre-line;line-height:1.6;">
            {{ huidigLogboek.reflectie || 'Niet ingevuld.' }}
          </p>
        </section>

        <section class="card" style="margin-bottom:12px;">
          <h2 class="form-section-title">Problemen / Leerpunten</h2>
          <p class="mt-8" style="white-space:pre-line;line-height:1.6;">
            {{ huidigLogboek.leerpunten || 'Niet ingevuld.' }}
          </p>
        </section>

        <!-- Uren -->
        <section class="card" style="margin-bottom:12px;">
          <h2 class="form-section-title">Gewerkte uren</h2>
          <p class="mt-8">{{ huidigLogboek.uren ?? '—' }} uur</p>
        </section>

        <!-- Feedback van anderen -->
        <section class="card" style="margin-bottom:12px;">
          <h2 class="form-section-title">Feedback</h2>

          <div v-if="bestaandeFeedback.length === 0" class="mt-8">
            <p class="text-secondary text-sm">Nog geen feedback gegeven.</p>
          </div>
          <div
            v-for="f in bestaandeFeedback"
            :key="f.feedback_id"
            class="mt-12"
            style="border-bottom:1px solid var(--border);padding-bottom:12px;"
          >
            <p class="text-sm font-semibold">{{ f.voornaam }} {{ f.auteur }} <span class="text-secondary">({{ f.rol }})</span></p>
            <p class="mt-4" style="line-height:1.6;">{{ f.opmerking }}</p>
            <p class="text-secondary text-xs mt-4">{{ formatDatum(f.created_at) }}</p>
          </div>

          <!-- Feedback toevoegen -->
          <div class="form-group mt-16">
            <label>Uw feedback als docent</label>
            <textarea
              v-model="feedback"
              rows="4"
              class="form-input"
              placeholder="Geef feedback op dit logboek. Zichtbaar voor student en mentor."
            ></textarea>
          </div>

          <p v-if="feedbackBericht" class="text-sm mt-8" style="color:#15803d;">{{ feedbackBericht }}</p>

          <button
            class="btn btn-primary mt-12"
            @click="slaFeedbackOp"
            :disabled="!feedback.trim() || bezig"
          >
            Feedback opslaan
          </button>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped></style>
