<script setup>
import { ref, computed, onMounted } from 'vue'
import TopBarDocentStagecommissie from '@/components/TopBarDocentStagecommissie.vue'

const navLinks = ref([
  { label: 'Studenten', to: '/docent-studenten' },
  { label: 'Logboek', to: '/docent-logboek-overzicht' },
  { label: 'Evaluaties', to: '/docent-evaluaties' },
  { label: 'Aanvragen', to: '/docent-aanvragen' },
])

const logboeken = ref([])
const laadFout = ref('')

onMounted(async () => {
  await laadLogboeken()
})

async function laadLogboeken() {
  laadFout.value = ''
  const token = localStorage.getItem('token')
  try {
    const res = await fetch('http://localhost:3000/api/docenten/mijn-logboeken', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Ophalen mislukt')
    logboeken.value = await res.json()
  } catch {
    laadFout.value = 'Logboeken konden niet geladen worden.'
  }
}

// Groepeer logboeken per student (op stage_id)
const perStudent = computed(() => {
  const groepen = {}
  logboeken.value.forEach((l) => {
    const key = l.stage_id
    if (!groepen[key]) {
      groepen[key] = {
        stage_id: l.stage_id,
        naam: `${l.voornaam} ${l.student_naam}`,
        studentnummer: l.studentnummer,
        bedrijf: l.bedrijf,
        entries: [],
      }
    }
    groepen[key].entries.push(l)
  })
  return Object.values(groepen)
})

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
      <h1 class="page-title">Logboeken</h1>

      <p v-if="laadFout" class="text-secondary mt-16" style="color:#dc2626;">{{ laadFout }}</p>

      <div v-if="perStudent.length === 0 && !laadFout" class="card mt-24">
        <p class="text-secondary">Geen logboeken gevonden.</p>
      </div>

      <div
        v-for="student in perStudent"
        :key="student.stage_id"
        class="card mt-16"
      >
        <div class="flex justify-between items-center">
          <div>
            <div class="td-name">{{ student.naam }}</div>
            <div class="td-sub">{{ student.bedrijf }} · {{ student.studentnummer }}</div>
            <div class="text-secondary text-xs mt-8">
              <span class="font-semibold">Meest recente entry:</span>
              <template v-if="student.entries.length">
                Week {{ student.entries[0].week_nummer }} ·
                {{ formatDatum(student.entries[0].ingediend_op) }} ·
                {{ student.entries.length }} {{ student.entries.length === 1 ? 'entry' : 'entries' }}
                <span class="badge badge-pill ml-8" :class="logboekBadge(student.entries[0].status)">
                  {{ student.entries[0].status }}
                </span>
              </template>
              <template v-else>Nog geen entries</template>
            </div>
          </div>
          <router-link
            :to="`/docent-logboek-detail/${student.stage_id}`"
            class="btn btn-primary btn-sm"
          >
            Logboeken inkijken →
          </router-link>
        </div>
      </div>
    </main>
  </div>
</template>
