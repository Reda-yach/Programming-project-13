<script setup>
import { ref, computed, onMounted } from 'vue'
import TopBar from '../components/TopBar.vue'
import { useStageStore } from '../stores/stage'

const stageStore = useStageStore()

const navLinks = ref([
  { label: 'Dashboard', to: '/student' },
  { label: 'Aanvraag', to: '/student/aanvraag' },
  { label: 'Logboek', to: '/student/logboek' },
  { label: 'Evaluatie', to: '/student/evaluatie' },
])

const evaluaties = ref([])
const geselecteerde = ref(null)
const criteria = ref([])
const opmerking = ref('')
const laadFout = ref('')
const bericht = ref('')
const bezig = ref(false)

const gebruiker = JSON.parse(localStorage.getItem('gebruiker') || '{}')

onMounted(async () => {
  await stageStore.laad()
  await laadEvaluaties()
})

const stageId = computed(() => stageStore.aanvraag?.stage_id || null)
const stageActief = computed(() => {
  const s = stageStore.status
  return s === 'goedgekeurd' || s === 'bezig' || s === 'afgerond'
})

async function laadEvaluaties() {
  if (!stageId.value) return
  laadFout.value = ''
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/stages/${stageId.value}/evaluaties`, {
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
  bericht.value = ''
  opmerking.value = evaluatie.opmerking || ''
  criteria.value = []
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/evaluaties/${evaluatie.evaluatie_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    criteria.value = (data.criteria || []).map(c => ({ ...c }))
  } catch {
    criteria.value = []
  }
}

function terugNaarLijst() {
  geselecteerde.value = null
  criteria.value = []
  bericht.value = ''
  opmerking.value = ''
}

async function slaAllesOp() {
  bezig.value = true
  bericht.value = ''
  const token = localStorage.getItem('token')
  try {
    for (const criterium of criteria.value) {
      if (criterium.score !== null && criterium.score !== undefined) {
        await fetch(`http://localhost:3000/api/evaluaties/criteria/${criterium.criterium_id}/score`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ score: criterium.score }),
        })
      }
    }
    const totaal = criteria.value.reduce((sum, c) => sum + (c.score || 0), 0)
    await fetch(`http://localhost:3000/api/evaluaties/${geselecteerde.value.evaluatie_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ totaalscore: totaal, opmerking: opmerking.value }),
    })
    bericht.value = 'Zelfscore opgeslagen!'
    geselecteerde.value.totaalscore = totaal
    await laadEvaluaties()
  } catch {
    bericht.value = 'Opslaan mislukt.'
  } finally {
    bezig.value = false
  }
}

function totaalScore() {
  return criteria.value.reduce((sum, c) => sum + (c.score || 0), 0)
}

function typeLabel(type) {
  if (type === 'tussentijds') return 'Tussentijdse evaluatie'
  if (type === 'eind') return 'Eindevaluatie'
  return type
}

function typeBadge(type) {
  return type === 'eind' ? 'badge-green' : 'badge-yellow'
}

function formatDatum(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />

    <main class="content">

      <!-- Geen actieve stage -->
      <template v-if="!stageActief">
        <h1 class="page-title">Evaluatie</h1>
        <div class="card mt-24">
          <p class="font-semibold">Evaluatie nog niet beschikbaar</p>
          <p class="text-secondary text-sm mt-8">
            Evaluaties worden beschikbaar zodra je stage goedgekeurd is.
          </p>
        </div>
      </template>

      <!-- Lijstweergave -->
      <div v-else-if="!geselecteerde">
        <h1 class="page-title">Evaluatie</h1>

        <p v-if="laadFout" class="text-secondary mt-16" style="color:#dc2626;">{{ laadFout }}</p>

        <div v-if="evaluaties.length === 0 && !laadFout" class="card mt-24">
          <p class="font-semibold">Nog geen evaluaties</p>
          <p class="text-secondary text-sm mt-8">
            Je docent of mentor maakt een evaluatie aan wanneer het moment daar is.
          </p>
        </div>

        <div
          v-for="evaluatie in evaluaties"
          :key="evaluatie.evaluatie_id"
          class="card mt-16"
        >
          <div class="flex justify-between items-center">
            <div>
              <div class="flex items-center gap-12">
                <span class="font-semibold" style="font-size:16px;">{{ typeLabel(evaluatie.type) }}</span>
                <span class="badge badge-pill" :class="typeBadge(evaluatie.type)">{{ evaluatie.type }}</span>
              </div>
              <p class="text-secondary text-sm mt-4">
                Aangemaakt door: {{ evaluatie.voornaam }} {{ evaluatie.beoordelaar }}
              </p>
              <p class="text-secondary text-sm">
                Ingevuld op {{ formatDatum(evaluatie.ingevuld_op) }}
              </p>
              <p class="text-secondary text-sm">
                Jouw zelfscore: <strong>{{ evaluatie.totaalscore ?? 'Nog niet ingevuld' }}</strong>
              </p>
            </div>
            <button class="btn btn-primary btn-sm" @click="selecteer(evaluatie)">
              Invullen →
            </button>
          </div>
        </div>
      </div>

      <!-- Detail — zelfscore invullen -->
      <div v-else>
        <button class="btn btn-secondary mb-16" @click="terugNaarLijst">← Evaluaties</button>

        <h1 class="page-title">{{ typeLabel(geselecteerde.type) }}</h1>
        <p class="text-secondary text-sm mt-4 mb-8">
          Geef per competentie een zelfscore. Wees eerlijk — dit helpt je docent en mentor bij de begeleiding.
        </p>
        <p class="text-secondary text-xs mb-16">
          5 — Uitstekend &nbsp;|&nbsp; 3 — Goed &nbsp;|&nbsp; 1 — Voldoende &nbsp;|&nbsp; 0 — Niet aangetoond
        </p>

        <div v-if="bericht" class="card mb-16" style="background:#f0fdf4;border:1px solid #bbf7d0;">
          <p class="font-semibold" style="color:#15803d;">{{ bericht }}</p>
        </div>

        <div
          v-for="criterium in criteria"
          :key="criterium.criterium_id"
          class="card mt-16"
        >
          <h2 class="form-section-title">{{ criterium.naam }}</h2>
          <p class="text-secondary text-sm mt-4">{{ criterium.competentie }}</p>

          <div class="mt-12">
            <p class="text-secondary text-sm">Zelfscore:</p>
            <div class="flex gap-8 mt-8" style="flex-wrap:wrap;">
              <button
                v-for="punt in [5, 3, 1, 0]"
                :key="punt"
                class="btn"
                :class="criterium.score === punt ? 'btn-primary' : 'btn-secondary'"
                @click="criterium.score = punt"
              >
                {{ punt }}
              </button>
              <span v-if="criterium.score !== null && criterium.score !== undefined"
                class="text-secondary text-sm" style="align-self:center;">
                Geselecteerd: <strong>{{ criterium.score }}</strong>
              </span>
            </div>
          </div>

          <div v-if="criterium.rubrieken?.length" class="mt-12">
            <p class="text-secondary text-xs font-semibold">Rubric:</p>
            <div
              v-for="r in criterium.rubrieken"
              :key="r.rubriek_id"
              class="flex gap-8 text-sm mt-4"
              :style="criterium.score === r.punt ? 'font-weight:600;' : 'color:var(--text-secondary);'"
            >
              <span style="min-width:16px;">{{ r.punt }}</span>
              <span>{{ r.beschrijving }}</span>
            </div>
          </div>
        </div>

        <!-- Toelichting -->
        <div class="card mt-16">
          <h2 class="form-section-title">Toelichting (optioneel)</h2>
          <div class="form-group mt-12">
            <textarea
              v-model="opmerking"
              rows="4"
              class="form-input"
              placeholder="Geef een algemene toelichting op je zelfevaluatie..."
            ></textarea>
          </div>
        </div>

        <div class="card mt-16 flex items-center gap-16">
          <span>Totale zelfscore: <strong>{{ totaalScore() }}</strong> / {{ criteria.length * 5 }}</span>
          <button class="btn btn-primary" @click="slaAllesOp" :disabled="bezig">
            {{ bezig ? 'Bezig...' : 'Zelfscore opslaan' }}
          </button>
        </div>
      </div>

    </main>
  </div>
</template>

<style scoped></style>
