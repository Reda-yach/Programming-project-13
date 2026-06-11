<script setup>
import { ref, onMounted } from 'vue'
import TopBar from '../components/TopBar.vue'

const navLinks = ref([
  { label: 'Dashboard', to: '/student' },
  { label: 'Aanvraag', to: '/student/aanvraag' },
  { label: 'Logboek', to: '/student/logboek' },
  { label: 'Evaluatie', to: '/student/evaluatie' },
])

const evaluaties = ref([])
const geselecteerdeEvaluatie = ref(null)
const criteria = ref([])
const stageId = ref(null)
const ingediend = ref(false)

onMounted(async () => {
  const token = localStorage.getItem('token')

  const stageRes = await fetch('http://localhost:3000/api/stage', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const stageData = await stageRes.json()

  if (stageData.stage) {
    stageId.value = stageData.stage.stage_id
    const evalRes = await fetch(`http://localhost:3000/api/stages/${stageId.value}/evaluaties`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    evaluaties.value = await evalRes.json()
  }
})

async function bekijkEvaluatie(evaluatie) {
  geselecteerdeEvaluatie.value = evaluatie
  const token = localStorage.getItem('token')
  const res = await fetch(`http://localhost:3000/api/evaluaties/${evaluatie.evaluatie_id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const data = await res.json()
  criteria.value = data.criteria || []
}

async function slaScoreOp(criterium) {
  const token = localStorage.getItem('token')
  await fetch(`http://localhost:3000/api/evaluaties/criteria/${criterium.criterium_id}/score`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ score: criterium.score })
  })
}

function totaalScore() {
  return criteria.value.reduce((sum, c) => sum + (c.score || 0), 0)
}

async function indienen() {
  ingediend.value = true
}

function terugNaarOverzicht() {
  geselecteerdeEvaluatie.value = null
  criteria.value = []
  ingediend.value = false
}
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />
    <main class="content">

      <!-- Overzicht evaluaties -->
      <div v-if="!geselecteerdeEvaluatie">
        <h1 class="page-title">Mijn evaluaties</h1>

        <div v-if="evaluaties.length === 0" class="card mt-24">
          <p class="text-secondary">Nog geen evaluaties beschikbaar.</p>
        </div>

        <div v-for="evaluatie in evaluaties" :key="evaluatie.evaluatie_id" class="card mt-24">
          <div class="flex items-center gap-16">
            <h2 class="form-section-title">
              {{ evaluatie.type === 'tussentijds' ? 'Tussentijdse evaluatie' : 'Eindevaluatie' }}
            </h2>
            <span class="badge badge-yellow">{{ evaluatie.type }}</span>
          </div>
          <p class="text-secondary text-sm mt-8">
            Beoordelaar: {{ evaluatie.voornaam }} {{ evaluatie.beoordelaar }}
          </p>
          <p class="text-secondary text-sm">
            Totaalscore: {{ evaluatie.totaalscore ?? 'Nog niet ingevuld' }}
          </p>
          <button class="btn btn-primary mt-16" @click="bekijkEvaluatie(evaluatie)">
            Evaluatie invullen →
          </button>
        </div>
      </div>

      <!-- Detail evaluatie -->
      <div v-else>
        <button class="btn btn-secondary mb-16" @click="terugNaarOverzicht">
          ← Mijn evaluaties
        </button>

        <h1 class="page-title">
          {{ geselecteerdeEvaluatie.type === 'tussentijds' ? 'Tussentijdse evaluatie' : 'Eindevaluatie' }}
        </h1>

        <p class="text-secondary text-sm mb-24">
          Rubric: 5 — Uitstekend &nbsp;|&nbsp; 3 — Goed &nbsp;|&nbsp; 1 — Voldoende &nbsp;|&nbsp; 0 — Niet aangetoond
        </p>

        <div v-if="ingediend" class="card mt-24 text-center">
          <p class="badge badge-green">✓ Evaluatie succesvol ingediend!</p>
          <button class="btn btn-secondary mt-16" @click="terugNaarOverzicht">
            Terug naar overzicht
          </button>
        </div>

        <div v-else>
          <div v-for="criterium in criteria" :key="criterium.criterium_id" class="card mt-16">
            <h2 class="form-section-title">{{ criterium.naam }}</h2>
            <p class="text-secondary text-sm mt-4">{{ criterium.competentie }}</p>

            <div class="flex gap-8 mt-12">
              <button
                v-for="punt in [5, 3, 1, 0]"
                :key="punt"
