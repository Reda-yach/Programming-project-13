<script setup>
import { ref, onMounted } from 'vue'
import TopBar from '../components/TopBar.vue'

const navLinks = ref([
  { label: 'Studenten', to: '/mentor' },
  { label: 'Logboeken', to: '/mentor/logboeken' },
  { label: 'Evaluatie', to: '/mentor/evaluatie' },
])

const evaluaties = ref([])
const geselecteerde = ref(null)
const criteria = ref([])
const opmerking = ref('')
const bezig = ref(false)
const bericht = ref('')
const laadFout = ref('')
const gebruiker = JSON.parse(localStorage.getItem('gebruiker'))

onMounted(async () => {
  await laadEvaluaties()
})

async function laadEvaluaties() {
  laadFout.value = ''
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/mentors/${gebruiker.id}/evaluaties`, {
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
    criteria.value = (data.criteria || []).map((c) => ({ ...c }))
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
    // Sla elke criterium-score op
    for (const criterium of criteria.value) {
      if (criterium.score !== null && criterium.score !== undefined) {
        await fetch(`http://localhost:3000/api/evaluaties/criteria/${criterium.criterium_id}/mentor`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ score: criterium.score }),
        })
      }
    }

    // Sla totaalscore + opmerking op
    const totaal = criteria.value.reduce((sum, c) => sum + (c.score || 0), 0)
    await fetch(`http://localhost:3000/api/evaluaties/${geselecteerde.value.evaluatie_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ totaalscore: totaal, opmerking: opmerking.value }),
    })

    bericht.value = 'Evaluatie opgeslagen!'
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
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />
    <main class="content">

      <!-- Overzicht evaluaties -->
      <div v-if="!geselecteerde">
        <h1 class="page-title">Evaluaties</h1>

        <p v-if="laadFout" class="text-secondary mt-16" style="color:#dc2626;">{{ laadFout }}</p>

        <div v-if="evaluaties.length === 0 && !laadFout" class="card mt-24">
          <p class="text-secondary">Geen evaluaties beschikbaar.</p>
        </div>

        <div
          v-for="evaluatie in evaluaties"
          :key="evaluatie.evaluatie_id"
          class="card mt-16"
        >
          <div class="flex items-center gap-16">
            <h2 class="form-section-title">
              {{ evaluatie.voornaam }} {{ evaluatie.student_naam }}
            </h2>
            <span class="badge badge-yellow">{{ typeLabel(evaluatie.type) }}</span>
          </div>
          <p class="text-secondary text-sm mt-4">{{ evaluatie.bedrijf }}</p>
          <p class="text-secondary text-sm">
            Totaalscore: <strong>{{ evaluatie.totaalscore ?? 'Nog niet ingevuld' }}</strong>
          </p>
          <button class="btn btn-primary mt-16" @click="selecteer(evaluatie)">
            Evaluatie invullen →
          </button>
        </div>
      </div>

      <!-- Detail evaluatie -->
      <div v-else>
        <button class="btn btn-secondary mb-16" @click="terugNaarLijst">
          ← Evaluaties
        </button>

        <h1 class="page-title">
          {{ typeLabel(geselecteerde.type) }}
        </h1>
        <p class="text-secondary text-sm mt-4 mb-8">
          {{ geselecteerde.voornaam }} {{ geselecteerde.student_naam }} — {{ geselecteerde.bedrijf }}
        </p>
        <p class="text-secondary text-xs mb-16">
          Rubric: 5 — Uitstekend &nbsp;|&nbsp; 3 — Goed &nbsp;|&nbsp; 1 — Voldoende &nbsp;|&nbsp; 0 — Niet aangetoond
        </p>

        <div v-if="bericht" class="card mb-16" style="background:#f0fdf4;border:1px solid #bbf7d0;">
          <p class="font-semibold" style="color:#15803d;">{{ bericht }}</p>
        </div>

        <!-- Per criterium -->
        <div
          v-for="criterium in criteria"
          :key="criterium.criterium_id"
          class="card mt-16"
        >
          <h2 class="form-section-title">{{ criterium.naam }}</h2>
          <p class="text-secondary text-sm mt-4">{{ criterium.competentie }}</p>

          <!-- Score knoppen -->
          <div class="mt-12">
            <p class="text-secondary text-sm">Score:</p>
            <div class="flex gap-8 mt-8">
              <button
                v-for="punt in [5, 3, 1, 0]"
                :key="punt"
                class="btn"
                :class="criterium.score === punt ? 'btn-primary' : 'btn-secondary'"
                @click="criterium.score = punt"
              >
                {{ punt }}
              </button>
              <span v-if="criterium.score !== null && criterium.score !== undefined" class="text-secondary text-sm" style="align-self:center;">
                Geselecteerd: <strong>{{ criterium.score }}</strong>
              </span>
            </div>
          </div>

          <!-- Rubrieken als referentie -->
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

        <!-- Algemene feedback -->
        <div class="card mt-16">
          <h2 class="form-section-title">Algemene feedback</h2>
          <div class="form-group mt-12">
            <textarea
              v-model="opmerking"
              rows="4"
              class="form-input"
              placeholder="Geef algemene feedback op de stage en de stagiair..."
            ></textarea>
          </div>
        </div>

        <!-- Totaal en opslaan -->
        <div class="card mt-16 flex items-center gap-16">
          <span>
            Totaalscore: <strong>{{ totaalScore() }}</strong> / {{ criteria.length * 5 }}
          </span>
          <button
            class="btn btn-primary"
            @click="slaAllesOp"
            :disabled="bezig"
          >
            {{ bezig ? 'Bezig...' : 'Evaluatie opslaan' }}
          </button>
        </div>

      </div>

    </main>
  </div>
</template>

<style scoped></style>
