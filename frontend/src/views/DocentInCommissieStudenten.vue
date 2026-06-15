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
const laadFout = ref('')

onMounted(async () => {
  await laadStudenten()
})

async function laadStudenten() {
  laadFout.value = ''
  const token = localStorage.getItem('token')
  try {
    const res = await fetch('http://localhost:3000/api/docenten/mijn-studenten', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Ophalen mislukt')
    studenten.value = await res.json()
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
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped></style>
