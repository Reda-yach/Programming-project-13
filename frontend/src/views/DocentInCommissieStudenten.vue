<script setup>
import { API_URL } from '@/api'
import { ref, onMounted } from 'vue'
import TopBarDocentStagecommissie from '@/components/TopBarDocentStagecommissie.vue'
import OvereenkomstDocument from '@/components/OvereenkomstDocument.vue'
import ContactPaneel from '@/components/ContactPaneel.vue'
import { docentNavLinks } from './docentNav'

// 'Aanvragen' enkel voor commissie-docenten (zie docentNav.js).
const navLinks = docentNavLinks()

const studenten = ref([])
const contracten = ref({})
const laadFout = ref('')
const inkijkStageId = ref(null) // stage waarvan het contract opengeklapt is
const contactStageId = ref(null) // stage waarvan het contactpaneel open staat
const ongelezen = ref({}) // ongelezen contactberichten per stage_id

onMounted(async () => {
  await laadStudenten()
  await laadOngelezen()
})

async function laadOngelezen() {
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`${API_URL}/api/contact/ongelezen`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const rows = await res.json()
      const map = {}
      for (const r of rows) map[r.stage_id] = r.aantal
      ongelezen.value = map
    }
  } catch { /* stil */ }
}

function openContact(stageId) {
  const opening = contactStageId.value !== stageId
  contactStageId.value = opening ? stageId : null
  if (opening) ongelezen.value = { ...ongelezen.value, [stageId]: 0 }
}

// De tussentijdse evaluatie-periode is voorbij zodra de finale fase begint
// (de laatste 2 weken vóór de einddatum). Dan verdwijnt de gespreksmelding.
const WEEK_MS = 7 * 24 * 60 * 60 * 1000
function tussentijdsVoorbij(student) {
  if (!student.einddatum) return false
  const eind = new Date(student.einddatum).getTime()
  return Date.now() >= eind - 2 * WEEK_MS
}

async function laadContract(stageId) {
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`${API_URL}/api/contracten/${stageId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    contracten.value[stageId] = res.ok ? await res.json() : null
  } catch {
    contracten.value[stageId] = null
  }
}

async function laadStudenten() {
  laadFout.value = ''
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`${API_URL}/api/docenten/mijn-studenten`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Ophalen mislukt')
    studenten.value = await res.json()
    for (const s of studenten.value) {
      if (s.status === 'goedgekeurd' || s.status === 'bezig' || s.status === 'afgerond') {
        await laadContract(s.stage_id)
      }
    }
  } catch {
    laadFout.value = 'Studenten konden niet geladen worden.'
  }
}

function statusBadge(status) {
  if (status === 'goedgekeurd') return 'badge-green'
  if (status === 'bezig') return 'badge-green'
  if (status === 'afgerond') return 'badge-green'
  if (status === 'ingediend' || status === 'in_behandeling') return 'badge-yellow'
  if (status === 'afgewezen') return 'badge-red'
  if (status === 'aanpassing_gevraagd') return 'badge-yellow'
  return ''
}

function statusLabel(status) {
  const labels = {
    ingediend: 'Ingediend',
    in_behandeling: 'In behandeling',
    goedgekeurd: 'Goedgekeurd',
    afgewezen: 'Afgewezen',
    aanpassing_gevraagd: 'Aanpassing gevraagd',
    bezig: 'Bezig',
    afgerond: 'Afgerond',
  }
  return labels[status] || status
}

function logboekBadge(status) {
  if (status === 'goedgekeurd') return 'badge-green'
  if (status === 'ingediend') return 'badge-yellow'
  if (status === 'draft') return 'badge-red'
  return ''
}

function formatDatum(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function initialen(student) {
  const v = (student.voornaam || '').trim()[0] || ''
  const n = (student.student_naam || '').trim()[0] || ''
  return (v + n).toUpperCase() || '?'
}

// Logboekstatus leesbaar maken (de DB-waarde is kort: draft/ingediend/goedgekeurd).
function logboekLabel(status) {
  const labels = { draft: 'In opmaak', ingediend: 'Ingediend', goedgekeurd: 'Bevestigd' }
  return labels[status] || status || '—'
}
</script>

<template>
  <div class="page">
    <TopBarDocentStagecommissie :links="navLinks" />

    <main class="content">
      <h1 class="page-title">Studenten</h1>

      <p v-if="laadFout" class="text-secondary mt-16" style="color:#dc2626;">{{ laadFout }}</p>

      <div v-if="studenten.length === 0 && !laadFout" class="card mt-24">
        <p class="text-secondary">Geen studenten toegewezen.</p>
      </div>

      <div class="studenten-grid">
        <div
          v-for="student in studenten"
          :key="student.stage_id"
          class="student-card"
        >
          <!-- Header: avatar + naam + status -->
          <div class="sc-head">
            <div class="sc-avatar">{{ initialen(student) }}</div>
            <div class="sc-headinfo">
              <div class="sc-name">{{ student.voornaam }} {{ student.student_naam }}</div>
              <div class="sc-meta">{{ student.opleiding }} · {{ student.studentnummer }}</div>
            </div>
            <span class="badge badge-pill" :class="statusBadge(student.status)">
              {{ statusLabel(student.status) }}
            </span>
          </div>

          <!-- Gegevens -->
          <div class="sc-grid">
            <div class="sc-field">
              <span class="sc-label">Bedrijf</span>
              <span class="sc-value">{{ student.bedrijf || '—' }}</span>
            </div>
            <div class="sc-field">
              <span class="sc-label">Stagetitel</span>
              <span class="sc-value">{{ student.stagetitel || '—' }}</span>
            </div>
            <div class="sc-field">
              <span class="sc-label">Periode</span>
              <span class="sc-value">{{ formatDatum(student.startdatum) }} – {{ formatDatum(student.einddatum) }}</span>
            </div>
          </div>

          <!-- Logboekstatus + acties -->
          <div class="sc-foot">
            <div class="sc-logboek">
              <template v-if="student.laatste_week !== null">
                <span class="sc-label">Logboek week {{ student.laatste_week }}</span>
                <span class="badge badge-pill" :class="logboekBadge(student.logboek_status)">
                  {{ logboekLabel(student.logboek_status) }}
                </span>
              </template>
              <span v-else class="text-secondary text-xs">Nog geen logboek ingediend</span>
            </div>
            <div class="sc-actions">
              <router-link :to="`/docent-logboek-detail/${student.stage_id}`" class="btn btn-secondary btn-sm">
                Logboek →
              </router-link>
              <router-link :to="`/docent/evaluaties/${student.stage_id}`" class="btn btn-secondary btn-sm">
                Evaluaties →
              </router-link>
            </div>
          </div>

          <!-- Contract: docent/commissie kan het enkel inkijken, niet tekenen -->
          <div v-if="contracten[student.stage_id]" class="sc-contract">
            <button
              class="btn btn-secondary btn-sm"
              @click="inkijkStageId = inkijkStageId === student.stage_id ? null : student.stage_id"
            >
              {{ inkijkStageId === student.stage_id ? 'Stagecontract verbergen' : 'Stagecontract inkijken' }}
            </button>
            <div v-if="inkijkStageId === student.stage_id" class="mt-12">
              <OvereenkomstDocument :contract="contracten[student.stage_id]" />
            </div>
          </div>

          <!-- Contact met de mentor van deze student -->
          <div class="sc-contract">
            <!-- Melding na de tussentijdse evaluatie -->
            <div v-if="student.tussentijds_mentor_klaar && !tussentijdsVoorbij(student)" class="gesprek-melding">
              📌 Tussentijdse evaluatie is ingediend — neem contact met de mentor voor een tussentijds gesprek.
            </div>

            <button
              class="btn btn-secondary btn-sm"
              @click="openContact(student.stage_id)"
            >
              {{ contactStageId === student.stage_id ? 'Berichten sluiten' : 'Contacteer mentor' }}
              <span v-if="ongelezen[student.stage_id]" class="contact-badge">{{ ongelezen[student.stage_id] }}</span>
            </button>
            <div v-if="contactStageId === student.stage_id" class="mt-12">
              <ContactPaneel :stage-id="student.stage_id" />
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.gesprek-melding {
  padding: 10px 14px;
  margin-bottom: 10px;
  background: #fef9c3;
  border: 1px solid #fde047;
  border-radius: 8px;
  font-size: 13px;
}
.contact-badge {
  display: inline-block;
  min-width: 18px;
  padding: 0 5px;
  margin-left: 6px;
  border-radius: 9px;
  background: #dc2626;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  line-height: 18px;
}
</style>
