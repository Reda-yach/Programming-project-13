<script setup>
import { API_URL } from '@/api'
import { ref, onMounted } from 'vue'
import TopBar from '../components/TopBar.vue'
import { navLinks } from './mentorNav'

const logboeken = ref([])
const geselecteerd = ref(null)
const bezig = ref(false)
const bericht = ref('')
const feedback = ref('')
const bestaandeFeedback = ref([])
const gebruiker = JSON.parse(localStorage.getItem('gebruiker'))

const detail = ref(null) // volledig logboek (incl. dag-entries) van de gekozen week
const dagNamen = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag']
const dagKort = { maandag: 'Maandag', dinsdag: 'Dinsdag', woensdag: 'Woensdag', donderdag: 'Donderdag', vrijdag: 'Vrijdag' }

onMounted(async () => {
  await laadLogboeken()
})

async function laadLogboeken() {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_URL}/api/mentors/${gebruiker.id}/logboeken`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  logboeken.value = await res.json()
}

const studentLogs = ref([])

function statusLabel(status) {
  const labels = { draft: 'In opmaak', ingediend: 'Ingediend', goedgekeurd: 'Bevestigd' }
  return labels[status] || status
}

// Een student kiezen: bewaar al zijn weken (gesorteerd) en toon de meest recente.
async function selecteerStudent(logs) {
  studentLogs.value = [...logs].sort((a, b) => a.week_nummer - b.week_nummer)
  await kiesLogboek(logs[0])
}

async function kiesLogboek(logboek) {
  geselecteerd.value = logboek
  bericht.value = ''
  feedback.value = ''
  detail.value = null
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`${API_URL}/api/logboeken/${logboek.logboek_id}/volledig`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) detail.value = await res.json()
  } catch { /* detail blijft null */ }
  await laadFeedback(logboek.logboek_id)
}

// De dag-entry (Ma–Vr) van de gekozen week, of null als die dag niet ingevuld is.
function dagVoorDetail(dagNaam) {
  return detail.value?.dagen?.find(d => d.dag === dagNaam) || null
}

// Wisselen tussen de weken van de gekozen student (dropdown).
function kiesWeek(weekNummer) {
  const log = studentLogs.value.find(l => l.week_nummer === Number(weekNummer))
  if (log) kiesLogboek(log)
}

function terugNaarLijst() {
  geselecteerd.value = null
  studentLogs.value = []
  bericht.value = ''
  feedback.value = ''
  bestaandeFeedback.value = []
}

async function laadFeedback(logboekId) {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_URL}/api/logboeken/${logboekId}/feedback`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  bestaandeFeedback.value = await res.json()
}

async function slaFeedbackOp() {
  if (!feedback.value.trim()) return true // niets in te dienen → ga gewoon door
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_URL}/api/logboeken/${geselecteerd.value.logboek_id}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      gebruiker_id: gebruiker.id,
      opmerking: feedback.value
    })
  })
  if (res.ok) {
    feedback.value = ''
    await laadFeedback(geselecteerd.value.logboek_id)
    return true
  }
  return false
}

// Eén actie: eventuele feedback opslaan én de week bevestigen.
async function bevestigMetFeedback() {
  const ok = await slaFeedbackOp()
  if (!ok) return
  await aftekenen()
}

async function aftekenen() {
  bezig.value = true
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_URL}/api/logboeken/${geselecteerd.value.logboek_id}/aftekenen`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const data = await res.json()
  bezig.value = false
  if (res.ok) {
    bericht.value = data.message
    geselecteerd.value.status = 'goedgekeurd'
    await laadLogboeken()
  } else {
    bericht.value = data.error
  }
}

function studenten() {
  const groepen = {}
  logboeken.value.forEach(l => {
    const key = `${l.voornaam} ${l.student_naam}`
    if (!groepen[key]) groepen[key] = []
    groepen[key].push(l)
  })
  return groepen
}
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />
    <main class="content">

      <!-- Overzicht logboeken per student -->
      <div v-if="!geselecteerd">
        <h1 class="page-title">Logboeken</h1>

        <div v-if="logboeken.length === 0" class="card mt-24">
          <p class="text-secondary">Geen logboeken gevonden.</p>
        </div>

        <div
          v-for="(logs, studentNaam) in studenten()"
          :key="studentNaam"
          class="card mt-16"
        >
          <h2 class="form-section-title">{{ studentNaam }}</h2>
          <p class="text-secondary text-sm mt-4">{{ logs[0].bedrijf }}</p>
          <p class="text-secondary text-sm">
            Meest recente entry: Week {{ logs[0].week_nummer }} — {{ logs[0].ingediend_op?.split('T')[0] }} — {{ logs.length }} entries
          </p>
          <button class="btn btn-primary mt-16" @click="selecteerStudent(logs)">
            Logboeken inkijken →
          </button>
        </div>
      </div>

      <!-- Detail van een logboek -->
      <div v-else>
        <button class="btn btn-secondary mb-16" @click="terugNaarLijst">
          ← Logboeken
        </button>

        <div class="flex items-center gap-16">
          <h1 class="page-title">
            {{ geselecteerd.voornaam }} {{ geselecteerd.student_naam }}
          </h1>
          <span
            class="badge"
            :class="{
              'badge-green': geselecteerd.status === 'goedgekeurd',
              'badge-yellow': geselecteerd.status === 'ingediend',
              'badge-red': geselecteerd.status === 'draft'
            }"
          >
            {{ geselecteerd.status }}
          </span>
        </div>

        <p class="text-secondary text-sm mt-4">{{ geselecteerd.bedrijf }}</p>

        <!-- Weekkeuze: scrollen tussen de weken van deze student -->
        <div class="week-selector" style="margin-top:12px;">
          <label class="week-selector-label">Week</label>
          <select class="week-select" :value="geselecteerd.week_nummer" @change="kiesWeek($event.target.value)">
            <option v-for="log in studentLogs" :key="log.logboek_id" :value="log.week_nummer">
              Week {{ log.week_nummer }} — {{ statusLabel(log.status) }}
            </option>
          </select>
        </div>

        <!-- Dag-voor-dag invoer van de student (Ma–Vr) -->
        <div v-for="dagNaam in dagNamen" :key="dagNaam" class="card mt-16">
          <div class="flex justify-between items-center" style="margin-bottom:10px;">
            <span class="font-semibold">{{ dagKort[dagNaam] }}</span>
            <span
              class="badge badge-pill"
              :class="dagVoorDetail(dagNaam) ? 'badge-green' : ''"
              style="font-size:11px;"
            >
              {{ dagVoorDetail(dagNaam) ? 'Ingevuld' : 'Leeg' }}
            </span>
          </div>

          <template v-if="dagVoorDetail(dagNaam)">
            <div class="text-sm" style="margin-bottom:8px;">
              <span class="text-secondary">Uitgevoerde taken</span>
              <div style="margin-top:4px;white-space:pre-wrap;">{{ dagVoorDetail(dagNaam).activiteiten || '—' }}</div>
            </div>
            <div class="text-sm" style="margin-bottom:8px;">
              <span class="text-secondary">Reflectie</span>
              <div style="margin-top:4px;white-space:pre-wrap;">{{ dagVoorDetail(dagNaam).reflectie || '—' }}</div>
            </div>
            <div class="text-sm">
              <span class="text-secondary">Problemen / leerpunten</span>
              <div style="margin-top:4px;white-space:pre-wrap;">{{ dagVoorDetail(dagNaam).leerpunten || '—' }}</div>
            </div>
          </template>
          <div v-else class="text-secondary text-sm">Geen invoer voor deze dag.</div>
        </div>

        <!-- Feedback + week bevestigen, gecombineerd in één actie -->
        <div class="card mt-16">
          <h2 class="form-section-title">Feedback &amp; week bevestigen</h2>

          <div v-if="bestaandeFeedback.length === 0" class="mt-8">
            <p class="text-secondary text-sm">Nog geen feedback gegeven.</p>
          </div>
          <div
            v-for="f in bestaandeFeedback"
            :key="f.feedback_id"
            class="mt-8"
            style="border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;"
          >
            <p class="text-sm"><strong>{{ f.voornaam }} {{ f.auteur }}</strong></p>
            <p class="mt-4">{{ f.opmerking }}</p>
            <p class="text-secondary text-sm mt-4">{{ f.created_at?.split('T')[0] }}</p>
          </div>

          <div class="form-group mt-16">
            <label>Uw feedback als mentor (optioneel)</label>
            <textarea
              v-model="feedback"
              rows="4"
              class="form-input"
              placeholder="Geef uw wekelijkse feedback. Zichtbaar voor student en docent."
            ></textarea>
          </div>

          <p v-if="bericht" class="text-sm mt-8 badge-green">{{ bericht }}</p>

          <div class="flex gap-8 mt-12" style="flex-wrap:wrap;">
            <button
              v-if="geselecteerd.status !== 'goedgekeurd'"
              class="btn btn-primary"
              @click="bevestigMetFeedback"
              :disabled="bezig"
            >
              {{ bezig ? 'Bezig…' : (feedback.trim() ? 'Feedback opslaan & week bevestigen' : 'Week bevestigen') }}
            </button>

            <template v-else>
              <span class="badge badge-green">✓ Logboek bevestigd</span>
              <button class="btn btn-secondary" @click="slaFeedbackOp" :disabled="!feedback.trim()">
                Feedback opslaan
              </button>
            </template>
          </div>
        </div>

      </div>

    </main>
  </div>
</template>

<style scoped></style>
