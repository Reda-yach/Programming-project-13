<script setup>
import { ref, onMounted } from 'vue'
import TopBarDocentStagecommissie from '@/components/TopBarDocentStagecommissie.vue'

const navLinks = ref([
  { label: 'Studenten', to: '/docent-studenten' },
  { label: 'Logboek', to: '/docent-logboek-overzicht' },
  { label: 'Evaluaties', to: '/docent-evaluaties' },
  { label: 'Aanvragen', to: '/docent-aanvragen' },
])

const studenten = ref([])
const contracten = ref({})
const berichtContract = ref({})
const laadFout = ref('')

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
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/contracten/${stageId}/tekenen`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ rol: 'docent' }),
    })
    const data = await res.json()
    berichtContract.value[stageId] = data.message || data.error
    await laadContract(stageId)
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

      <div
        v-for="student in studenten"
        :key="student.stage_id"
        class="card mt-16"
      >
        <div class="flex justify-between items-start">
          <div style="flex:1;">
            <div class="td-name">{{ student.voornaam }} {{ student.student_naam }}</div>
            <div class="td-sub">{{ student.opleiding }} · {{ student.studentnummer }}</div>

            <div class="flex gap-16 mt-12" style="flex-wrap:wrap;">
              <div>
                <p class="text-secondary text-xs">Bedrijf</p>
                <p class="text-sm font-semibold">{{ student.bedrijf }}</p>
              </div>
              <div>
                <p class="text-secondary text-xs">Stagetitel</p>
                <p class="text-sm font-semibold">{{ student.stagetitel }}</p>
              </div>
              <div>
                <p class="text-secondary text-xs">Periode</p>
                <p class="text-sm font-semibold">
                  {{ formatDatum(student.startdatum) }} – {{ formatDatum(student.einddatum) }}
                </p>
              </div>
            </div>

            <div class="flex gap-12 mt-12" style="align-items:center;">
              <span class="badge badge-pill" :class="statusBadge(student.status)">
                {{ statusLabel(student.status) }}
              </span>
              <template v-if="student.laatste_week !== null">
                <span class="text-secondary text-xs">Logboek week {{ student.laatste_week }}:</span>
                <span class="badge badge-pill" :class="logboekBadge(student.logboek_status)">
                  {{ student.logboek_status }}
                </span>
              </template>
              <span v-else class="text-secondary text-xs">Nog geen logboek ingediend</span>
            </div>
          </div>

          <div class="flex gap-8" style="flex-shrink:0; margin-left:16px;">
            <router-link
              :to="`/docent-logboek-detail/${student.stage_id}`"
              class="btn btn-secondary btn-sm"
            >
              Logboek →
            </router-link>
            <router-link
              :to="`/docent/evaluaties/${student.stage_id}`"
              class="btn btn-secondary btn-sm"
            >
              Evaluaties →
            </router-link>
          </div>
        </div>

        <!-- Contract -->
        <div v-if="contracten[student.stage_id]"
          class="mt-12" style="border-top:1px solid var(--border);padding-top:12px;">
          <p class="text-secondary text-xs font-semibold mb-8">Stagecontract</p>
          <div class="flex gap-16 items-center" style="flex-wrap:wrap;">
            <span class="text-sm">Student:
              <span class="badge" :class="contracten[student.stage_id].getekend_student ? 'badge-green' : 'badge-gray'">
                {{ contracten[student.stage_id].getekend_student ? 'Ondertekend' : 'Wacht op handtekening' }}
              </span>
            </span>
            <span class="text-sm">Mentor:
              <span class="badge" :class="contracten[student.stage_id].getekend_mentor ? 'badge-green' : 'badge-gray'">
                {{ contracten[student.stage_id].getekend_mentor ? 'Ondertekend' : 'Wacht op handtekening' }}
              </span>
            </span>
            <span class="text-sm">Docent:
              <span class="badge" :class="contracten[student.stage_id].getekend_docent ? 'badge-green' : 'badge-gray'">
                {{ contracten[student.stage_id].getekend_docent ? 'Ondertekend' : 'Wacht op handtekening' }}
              </span>
            </span>
            <span v-if="berichtContract[student.stage_id]" class="text-sm" style="color:#16a34a;">
              {{ berichtContract[student.stage_id] }}
            </span>
            <button
              v-if="!contracten[student.stage_id].getekend_docent"
              class="btn btn-primary btn-sm"
              @click="tekenContract(student.stage_id)"
            >
              Contract ondertekenen
            </button>
            <span v-else class="text-sm" style="color:#16a34a;">Jij hebt al ondertekend</span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped></style>
