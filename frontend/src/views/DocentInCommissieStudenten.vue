<script setup>
import { ref, onMounted } from 'vue'
import TopBarDocentStagecommissie from '@/components/TopBarDocentStagecommissie.vue'
import SignaturePad from '@/components/SignaturePad.vue'
import { docentNavLinks } from './docentNav'

// 'Aanvragen' enkel voor commissie-docenten (zie docentNav.js).
const navLinks = docentNavLinks()

const studenten = ref([])
const contracten = ref({})
const berichtContract = ref({})
const laadFout = ref('')
const tekenStageId = ref(null) // stage waarvan de tekenpad open staat
const pad = ref(null)

onMounted(async () => {
  await laadStudenten()
})

async function laadContract(stageId) {
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/contracten/${stageId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    contracten.value[stageId] = res.ok ? await res.json() : null
  } catch {
    contracten.value[stageId] = null
  }
}

async function tekenContract(stageId) {
  const handtekening = pad.value?.getData()
  if (!handtekening) {
    berichtContract.value[stageId] = 'Teken eerst je handtekening in het vak.'
    return
  }
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/contracten/${stageId}/tekenen`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ handtekening }),
    })
    const data = await res.json()
    berichtContract.value[stageId] = data.message || data.error
    if (res.ok) {
      tekenStageId.value = null
      await laadContract(stageId)
    }
  } catch {
    berichtContract.value[stageId] = 'Er ging iets mis.'
  }
}

async function laadStudenten() {
  laadFout.value = ''
  const token = localStorage.getItem('token')
  try {
    const res = await fetch('http://localhost:3000/api/docenten/mijn-studenten', {
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

          <!-- Contract -->
          <div v-if="contracten[student.stage_id]" class="sc-contract">
            <div class="sc-contract-title">Stagecontract</div>
            <div class="sc-sign-row">
              <span class="sc-sign">
                <span class="sc-sign-role">Student</span>
                <span class="sc-dot" :class="contracten[student.stage_id].getekend_student ? 'ok' : 'wacht'"></span>
                <span class="sc-sign-status">{{ contracten[student.stage_id].getekend_student ? 'Ondertekend' : 'Wacht' }}</span>
              </span>
              <span class="sc-sign">
                <span class="sc-sign-role">Mentor</span>
                <span class="sc-dot" :class="contracten[student.stage_id].getekend_mentor ? 'ok' : 'wacht'"></span>
                <span class="sc-sign-status">{{ contracten[student.stage_id].getekend_mentor ? 'Ondertekend' : 'Wacht' }}</span>
              </span>
              <span class="sc-sign">
                <span class="sc-sign-role">Docent</span>
                <span class="sc-dot" :class="contracten[student.stage_id].getekend_docent ? 'ok' : 'wacht'"></span>
                <span class="sc-sign-status">{{ contracten[student.stage_id].getekend_docent ? 'Ondertekend' : 'Wacht' }}</span>
              </span>

              <span v-if="berichtContract[student.stage_id]" class="sc-contract-msg">
                {{ berichtContract[student.stage_id] }}
              </span>

              <button
                v-if="!contracten[student.stage_id].getekend_docent && tekenStageId !== student.stage_id"
                class="btn btn-primary btn-sm"
                style="margin-left:auto;"
                @click="tekenStageId = student.stage_id; berichtContract[student.stage_id] = ''"
              >
                Contract ondertekenen
              </button>
              <span v-else-if="contracten[student.stage_id].getekend_docent" class="sc-contract-msg" style="margin-left:auto;">
                Jij hebt al ondertekend
              </span>
            </div>

            <!-- Tekenpad voor de docent/commissie -->
            <div v-if="tekenStageId === student.stage_id" class="sc-pad">
              <SignaturePad ref="pad" />
              <div class="flex gap-8 mt-8">
                <button class="btn btn-primary btn-sm" @click="tekenContract(student.stage_id)">
                  Handtekening opslaan
                </button>
                <button class="btn btn-secondary btn-sm" @click="tekenStageId = null">Annuleren</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped></style>
