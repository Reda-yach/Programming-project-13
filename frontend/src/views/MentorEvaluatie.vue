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
const bezig = ref(false)
const bericht = ref('')
const ingediend = ref(false)
const toonNieuweEvaluatie = ref(false)
const nieuweOpmerking = ref('')
const geselecteerdeStage = ref(null)
const gebruiker = JSON.parse(localStorage.getItem('gebruiker'))

onMounted(async () => {
  await laadEvaluaties()
})

async function laadEvaluaties() {
  const token = localStorage.getItem('token')
  const res = await fetch(`http://localhost:3000/api/mentors/${gebruiker.id}/evaluaties`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  evaluaties.value = await res.json()
}

async function maakTussentijdseEvaluatie(stagiair) {
  geselecteerdeStage.value = stagiair
  toonNieuweEvaluatie.value = true
}

async function slaaTussentijdsOp() {
  bezig.value = true
  const token = localStorage.getItem('token')
  const res = await fetch('http://localhost:3000/api/evaluaties/tussentijds', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      stage_id: geselecteerdeStage.value.stage_id,
      student_id: geselecteerdeStage.value.student_id,
      beoordelaar_id: gebruiker.id,
      opmerking: nieuweOpmerking.value
    })
  })
  const data = await res.json()
  bezig.value = false

  if (res.ok) {
    bericht.value = data.message
    toonNieuweEvaluatie.value = false
    nieuweOpmerking.value = ''
    await laadEvaluaties()
  } else {
    bericht.value = data.error
  }
}

async function selecteer(evaluatie) {
  geselecteerde.value = evaluatie
  bericht.value = ''
  const token = localStorage.getItem('token')
  const res = await fetch(`http://localhost:3000/api/evaluaties/${evaluatie.evaluatie_id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const data = await res.json()
  criteria.value = data.criteria?.map(c => ({
    ...c,
    mentor_score: c.mentor_score || null,
    mentor_feedback: c.mentor_feedback || ''
  })) || []
}

function terugNaarLijst() {
  geselecteerde.value = null
  criteria.value = []
  bericht.value = ''
}

async function slaOp(criterium) {
  const token = localStorage.getItem('token')
  const res = await fetch(`http://localhost:3000/api/evaluaties/criteria/${criterium.criterium_id}/mentor`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      mentor_score: criterium.mentor_score,
      mentor_feedback: criterium.mentor_feedback
    })
  })
  if (res.ok) {
    bericht.value = 'Opgeslagen!'
    setTimeout(() => bericht.value = '', 2000)
  }
}

async function slaAllesOp() {
  bezig.value = true
  for (const criterium of criteria.value) {
    await slaOp(criterium)
  }
  bezig.value = false
  bericht.value = 'Alle scores en feedback opgeslagen!'
}

async function dienIn() {
  bezig.value = true
  const token = localStorage.getItem('token')
  const res = await fetch(`http://localhost:3000/api/evaluaties/${geselecteerde.value.evaluatie_id}/indienen`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const data = await res.json()
  bezig.value = false

  if (res.ok) {
    ingediend.value = true
    bericht.value = data.message
  } else {
    bericht.value = data.error
  }
}

function totaalScore() {
  return criteria.value.reduce((sum, c) => sum + (c.mentor_score || 0), 0)
}
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />
    <main class="content">

      <!-- Overzicht evaluaties -->
      <div v-if="!geselecteerde">
        <h1 class="page-title">Evaluaties</h1>

        <div v-if="evaluaties.length === 0" class="card mt-24">
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
            <span class="badge badge-yellow">{{ evaluatie.type }}</span>
          </div>
          <p class="text-secondary text-sm mt-4">{{ evaluatie.bedrijf }}</p>
          <p class="text-secondary text-sm">
            Totaalscore: {{ evaluatie.totaalscore ?? 'Nog niet ingevuld' }}
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
          {{ geselecteerde.type === 'tussentijds' ? 'Tussentijdse evaluatie' : 'Eindevaluatie' }}
        </h1>
        <p class="text-secondary text-sm mt-4">
          {{ geselecteerde.voornaam }} {{ geselecteerde.student_naam }} — {{ geselecteerde.bedrijf }}
        </p>

        <p class="text-secondary text-sm mt-4 mb-16">
          Rubric: 5 — Uitstekend &nbsp;|&nbsp; 3 — Goed &nbsp;|&nbsp; 1 — Voldoende &nbsp;|&nbsp; 0 — Niet aangetoond
        </p>

        <div v-if="bericht" class="badge badge-green mt-8 mb-16">{{ bericht }}</div>

        <div
          v-for="criterium in criteria"
          :key="criterium.criterium_id"
          class="card mt-16"
        >
          <h2 class="form-section-title">{{ criterium.naam }}</h2>
          <p class="text-secondary text-sm mt-4">{{ criterium.competentie }}</p>

          <!-- Student score tonen -->
          <div class="mt-12">
            <p class="text-secondary text-sm">Zelfscore student:</p>
            <span class="badge badge-yellow mt-4">
              {{ criterium.score ?? 'Nog niet ingevuld' }}
            </span>
          </div>

          <!-- Mentor score -->
          <div class="mt-12">
            <p class="text-secondary text-sm">Uw score als mentor:</p>
            <div class="flex gap-8 mt-8">
              <button
                v-for="punt in [5, 3, 1, 0]"
                :key="punt"
                class="btn"
                :class="criterium.mentor_score === punt ? 'btn-primary' : 'btn-secondary'"
                @click="criterium.mentor_score = punt"
              >
                {{ punt }}
              </button>
            </div>
          </div>

          <!-- Mentor feedback -->
          <div class="form-group mt-12">
            <label>Feedback & Observaties</label>
            <textarea
              v-model="criterium.mentor_feedback"
              rows="3"
              class="form-input"
              placeholder="Geef feedback op deze competentie..."
            ></textarea>
          </div>
        </div>

        <!-- Totaal en opslaan -->
        <div class="card mt-24">
          <div class="flex items-center gap-16">
            <span>
              Mentor score: <strong>{{ totaalScore() }}</strong> / {{ criteria.length * 5 }}
            </span>
          </div>

          <p v-if="bericht" class="text-sm mt-8 badge-green">{{ bericht }}</p>

          <div v-if="!ingediend" class="flex gap-8 mt-16">
            <button
             class="btn btn-secondary"
            @click="slaAllesOp"
            :disabled="bezig"
          >
            Opslaan
          </button>
          <button
            class="btn btn-primary"
            @click="dienIn"
            :disabled="bezig"
            style="background:#16a34a;"
          >
            Finale score geven
          </button>
        </div>

        <div v-else class="mt-16">
          <span class="badge badge-green">✓ Finale beoordeling ingediend — kan niet meer aangepast worden</span>
          <button class="btn btn-secondary mt-16" @click="terugNaarLijst">
            Terug naar overzicht
          </button>
      </div>
    </div>

    </main>
  </div>
</template>

<style scoped></style>
