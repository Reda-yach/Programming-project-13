<script setup>
import { ref, onMounted } from 'vue'
import TopBarDocentStagecommissie from '@/components/TopBarDocentStagecommissie.vue'

const navLinks = ref([
  { label: 'Studenten', to: '/docent-studenten' },
  { label: 'Logboek', to: '/docent-logboek-overzicht' },
  { label: 'Evaluaties', to: '/docent-evaluaties' },
  { label: 'Aanvragen', to: '/docent-aanvragen' },
])

const evaluaties = ref([])
const geselecteerde = ref(null)
const criteria = ref([])
const laadFout = ref('')

onMounted(async () => {
  await laadEvaluaties()
})

async function laadEvaluaties() {
  laadFout.value = ''
  const token = localStorage.getItem('token')
  try {
    const res = await fetch('http://localhost:3000/api/docenten/mijn-evaluaties', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Ophalen mislukt')
    evaluaties.value = await res.json()
  } catch {
    laadFout.value = 'Evaluaties konden niet geladen worden.'
  }
}

async function selecteer(evaluatie) {
  geselecteerde.value = evaluatie
  criteria.value = []
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/evaluaties/${evaluatie.evaluatie_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    criteria.value = data.criteria || []
  } catch {
    criteria.value = []
  }
}

function terugNaarLijst() {
  geselecteerde.value = null
  criteria.value = []
}

function typeLabel(type) {
  if (type === 'tussentijds') return 'Tussentijdse evaluatie'
  if (type === 'eind') return 'Eindevaluatie'
  return type
}

function typeBadge(type) {
  if (type === 'eind') return 'badge-green'
  return 'badge-yellow'
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

      <!-- LIJSTWEERGAVE -->
      <div v-if="!geselecteerde">
        <h1 class="page-title">Evaluaties</h1>

        <p v-if="laadFout" class="text-secondary mt-16" style="color:#dc2626;">{{ laadFout }}</p>

        <div v-if="evaluaties.length === 0 && !laadFout" class="card mt-24">
          <p class="text-secondary">Nog geen evaluaties beschikbaar.</p>
        </div>

        <div
          v-for="evaluatie in evaluaties"
          :key="evaluatie.evaluatie_id"
          class="card mt-16"
        >
          <div class="flex justify-between items-center">
            <div>
              <div class="td-name">
                {{ evaluatie.student_voornaam }} {{ evaluatie.student_naam }}
              </div>
              <div class="td-sub">{{ evaluatie.bedrijf }}</div>
              <div class="flex gap-12 mt-8" style="align-items:center;">
                <span class="badge badge-pill" :class="typeBadge(evaluatie.type)">
                  {{ typeLabel(evaluatie.type) }}
                </span>
                <span class="text-secondary text-xs">
                  Door: {{ evaluatie.beoordelaar_voornaam }} {{ evaluatie.beoordelaar_naam }}
                  ({{ evaluatie.beoordelaar_rol }})
                </span>
              </div>
              <div class="text-secondary text-xs mt-4">
                Ingevuld op {{ formatDatum(evaluatie.ingevuld_op) }}
                <template v-if="evaluatie.totaalscore !== null">
                  · Totaalscore: <strong>{{ evaluatie.totaalscore }}</strong>
                </template>
              </div>
            </div>
            <button class="btn btn-primary btn-sm" @click="selecteer(evaluatie)">
              Bekijk →
            </button>
          </div>
        </div>
      </div>

      <!-- DETAILWEERGAVE -->
      <div v-else>
        <button class="btn btn-secondary mb-16" @click="terugNaarLijst">← Evaluaties</button>

        <h1 class="page-title">{{ typeLabel(geselecteerde.type) }}</h1>
        <p class="text-secondary text-sm mt-4">
          {{ geselecteerde.student_voornaam }} {{ geselecteerde.student_naam }} —
          {{ geselecteerde.bedrijf }}
        </p>
        <p class="text-secondary text-sm">
          Beoordelaar: {{ geselecteerde.beoordelaar_voornaam }} {{ geselecteerde.beoordelaar_naam }}
          ({{ geselecteerde.beoordelaar_rol }}) · {{ formatDatum(geselecteerde.ingevuld_op) }}
        </p>

        <!-- Totaalscore -->
        <div class="card mt-16 mb-16">
          <div class="flex justify-between items-center">
            <span class="font-semibold">Totaalscore</span>
            <span class="font-semibold" style="font-size:20px;">
              {{ geselecteerde.totaalscore ?? '—' }}
            </span>
          </div>
          <p v-if="geselecteerde.opmerking" class="text-secondary text-sm mt-8">
            {{ geselecteerde.opmerking }}
          </p>
        </div>

        <!-- Criteria -->
        <div v-if="criteria.length === 0" class="card mt-16">
          <p class="text-secondary">Geen criteria beschikbaar voor deze evaluatie.</p>
        </div>

        <div
          v-for="criterium in criteria"
          :key="criterium.criterium_id"
          class="card mt-12"
        >
          <div class="flex justify-between items-start">
            <div style="flex:1;">
              <h2 class="form-section-title">{{ criterium.naam }}</h2>
              <p class="text-secondary text-sm mt-4">{{ criterium.competentie }}</p>
            </div>
            <div style="text-align:right;flex-shrink:0;margin-left:16px;">
              <p class="text-secondary text-xs">Score</p>
              <p class="font-semibold" style="font-size:20px;">
                {{ criterium.score ?? '—' }}
              </p>
              <p class="text-secondary text-xs">gewicht: {{ criterium.gewicht }}</p>
            </div>
          </div>

          <!-- Rubrieken -->
          <div v-if="criterium.rubrieken?.length" class="mt-12">
            <p class="text-secondary text-xs font-semibold" style="margin-bottom:8px;">Rubric</p>
            <div
              v-for="r in criterium.rubrieken"
              :key="r.rubriek_id"
              class="flex gap-12 text-sm mt-4"
              :style="criterium.score === r.punt ? 'font-weight:600;' : 'color:var(--text-secondary);'"
            >
              <span style="min-width:20px;">{{ r.punt }}</span>
              <span>{{ r.beschrijving }}</span>
            </div>
          </div>
        </div>
      </div>

    </main>
  </div>
</template>

<style scoped></style>
