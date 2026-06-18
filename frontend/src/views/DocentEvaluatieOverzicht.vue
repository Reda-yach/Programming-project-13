<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import TopBar from '../components/TopBar.vue'

const route = useRoute()
const stageId = route.params.stageId

const navLinks = ref([
  { label: 'Studenten', to: '/docent-studenten' },
  { label: 'Logboek', to: '/docent-logboek-overzicht' },
  { label: 'Evaluaties', to: '/docent-evaluaties', match: '/docent/evaluaties' },
  { label: 'Aanvragen', to: '/docent-aanvragen' },
])

const stage = ref(null)
const evaluaties = ref([])
const geselecteerde = ref(null)
const criteria = ref([])
const laadFout = ref('')
const bericht = ref('')
const bezig = ref(false)
const startBezig = ref(false)

onMounted(async () => {
  await laadStage()
  await laadEvaluaties()
})

async function laadStage() {
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/stages/${stageId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) stage.value = await res.json()
  } catch { /* stil falen */ }
}

async function laadEvaluaties() {
  laadFout.value = ''
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/stages/${stageId}/evaluatie-overzicht`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error()
    evaluaties.value = await res.json()
  } catch {
    laadFout.value = 'Evaluaties konden niet geladen worden.'
  }
}

async function startEvaluatie(fase, type) {
  startBezig.value = true
  bericht.value = ''
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/stages/${stageId}/evaluatie/aanmaken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fase, type }),
    })
    const data = await res.json()
    if (!res.ok) { bericht.value = data.error; return }
    await laadEvaluaties()
    // Open meteen de nieuwe evaluatie
    const nieuw = evaluaties.value.find(e => e.evaluatie_id === data.evaluatie_id)
    if (nieuw) await openEvaluatie(nieuw)
  } catch {
    bericht.value = 'Aanmaken mislukt.'
  } finally {
    startBezig.value = false
  }
}

async function openEvaluatie(evaluatie) {
  geselecteerde.value = evaluatie
  bericht.value = ''
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

function sluit() {
  geselecteerde.value = null
  criteria.value = []
  bericht.value = ''
}

async function slaScoresOp() {
  bezig.value = true
  bericht.value = ''
  const token = localStorage.getItem('token')
  try {
    for (const c of criteria.value) {
      if (c.score !== null && c.score !== undefined) {
        await fetch(`http://localhost:3000/api/evaluaties/criteria/${c.criterium_id}/score`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ score: c.score }),
        })
      }
    }
    const totaal = criteria.value.reduce((s, c) => s + (c.score || 0), 0)
    await fetch(`http://localhost:3000/api/evaluaties/${geselecteerde.value.evaluatie_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ totaalscore: totaal, opmerking: geselecteerde.value.opmerking || '' }),
    })
    bericht.value = 'Scores opgeslagen!'
    await laadEvaluaties()
  } catch {
    bericht.value = 'Opslaan mislukt.'
  } finally {
    bezig.value = false
  }
}

const tussentijdse = computed(() => evaluaties.value.filter(e => e.fase === 'tussentijds'))
const finale = computed(() => evaluaties.value.filter(e => e.fase === 'finaal'))

function faseLabel(fase) { return fase === 'tussentijds' ? 'Tussentijdse evaluatie' : 'Finale evaluatie' }
function typeLabel(type) {
  return type === 'docent' ? 'Docent' : type === 'mentor' ? 'Mentor' : 'Student'
}
function faseBadge(fase) { return fase === 'finaal' ? 'badge-green' : 'badge-yellow' }
function formatDatum(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />
    <main class="content">

      <button class="btn btn-secondary mb-16" onclick="history.back()">← Studenten</button>

      <h1 class="page-title">
        Evaluaties — {{ stage?.student_voornaam || '' }} {{ stage?.student_naam || '' }}
      </h1>
      <p v-if="stage" class="text-secondary text-sm mt-4 mb-24">
        {{ stage.bedrijf }} · {{ stage.stagetitel }}
      </p>

      <p v-if="laadFout" class="text-sm" style="color:#dc2626;">{{ laadFout }}</p>
      <p v-if="bericht && !geselecteerde" class="text-sm mt-8" style="color:#16a34a;">{{ bericht }}</p>

      <!-- Invulscherm -->
      <template v-if="geselecteerde">
        <button class="btn btn-secondary mb-16" @click="sluit">← Overzicht</button>
        <div class="flex items-center gap-12 mb-16">
          <h2 class="page-title" style="margin:0;">{{ faseLabel(geselecteerde.fase) }}</h2>
          <span class="badge badge-pill" :class="faseBadge(geselecteerde.fase)">{{ geselecteerde.fase }}</span>
          <span class="badge badge-pill badge-gray">{{ typeLabel(geselecteerde.type) }}</span>
        </div>
        <p class="text-secondary text-xs mb-16">
          5 — Uitstekend &nbsp;|&nbsp; 3 — Goed &nbsp;|&nbsp; 1 — Voldoende &nbsp;|&nbsp; 0 — Niet aangetoond
        </p>

        <div v-if="criteria.length === 0" class="card mt-16">
          <p class="text-secondary">Geen criteria gevonden. Voeg eerst competenties toe via het admin-paneel.</p>
        </div>

        <div v-for="c in criteria" :key="c.criterium_id" class="card mt-16">
          <h3 class="form-section-title">{{ c.naam }}</h3>
          <p class="text-secondary text-sm mt-4">{{ c.competentie }}</p>
          <div class="flex gap-8 mt-12" style="flex-wrap:wrap;">
            <button
              v-for="punt in [5, 3, 1, 0]" :key="punt"
              class="btn"
              :class="c.score === punt ? 'btn-primary' : 'btn-secondary'"
              @click="c.score = punt"
            >{{ punt }}</button>
            <span v-if="c.score !== null && c.score !== undefined" class="text-secondary text-sm" style="align-self:center;">
              Geselecteerd: <strong>{{ c.score }}</strong>
            </span>
          </div>
          <div v-if="c.rubrieken?.length" class="mt-12">
            <p class="text-secondary text-xs font-semibold">Rubric:</p>
            <div v-for="r in c.rubrieken" :key="r.rubriek_id"
              class="flex gap-8 text-sm mt-4"
              :style="c.score === r.punt ? 'font-weight:600;' : 'color:var(--text-secondary);'">
              <span style="min-width:16px;">{{ r.punt }}</span>
              <span>{{ r.beschrijving }}</span>
            </div>
          </div>
        </div>

        <div class="card mt-16">
          <h3 class="form-section-title">Algemene opmerking</h3>
          <textarea v-model="geselecteerde.opmerking" rows="4" class="form-input mt-8"
            placeholder="Geef een algemene toelichting op de evaluatie..."></textarea>
        </div>

        <div v-if="bericht" class="card mt-8" style="background:#f0fdf4;border:1px solid #bbf7d0;">
          <p style="color:#15803d;">{{ bericht }}</p>
        </div>

        <div class="card mt-16 flex items-center gap-16">
          <span>Totaalscore: <strong>{{ criteria.reduce((s,c) => s+(c.score||0),0) }}</strong> / {{ criteria.length * 5 }}</span>
          <button class="btn btn-primary" @click="slaScoresOp" :disabled="bezig">
            {{ bezig ? 'Bezig...' : 'Scores opslaan' }}
          </button>
        </div>
      </template>

      <!-- Overzicht -->
      <template v-else>

        <!-- Tussentijdse evaluaties -->
        <section class="mt-8">
          <div class="flex justify-between items-center mb-16">
            <h2 class="form-section-title">Tussentijdse evaluaties</h2>
            <button class="btn btn-primary btn-sm" @click="startEvaluatie('tussentijds','docent')" :disabled="startBezig">
              + Nieuwe tussentijdse evaluatie
            </button>
          </div>

          <div v-if="tussentijdse.length === 0" class="card">
            <p class="text-secondary text-sm">Nog geen tussentijdse evaluaties.</p>
          </div>

          <div v-for="ev in tussentijdse" :key="ev.evaluatie_id" class="card mt-12">
            <div class="flex justify-between items-center">
              <div>
                <div class="flex items-center gap-12">
                  <span class="font-semibold">{{ typeLabel(ev.type) }}</span>
                  <span class="badge badge-pill badge-yellow">tussentijds</span>
                </div>
                <p class="text-secondary text-sm mt-4">
                  Aangemaakt door: {{ ev.beoordelaar_voornaam }} {{ ev.beoordelaar_naam }} · {{ formatDatum(ev.ingevuld_op) }}
                </p>
                <p class="text-secondary text-sm">
                  Criteria ingevuld: {{ ev.ingevulde_criteria }} / {{ ev.totaal_criteria }}
                  <span v-if="ev.totaalscore !== null"> · Totaalscore: <strong>{{ ev.totaalscore }}</strong></span>
                </p>
              </div>
              <button class="btn btn-secondary btn-sm" @click="openEvaluatie(ev)">Invullen →</button>
            </div>
          </div>
        </section>

        <!-- Finale evaluaties -->
        <section class="mt-32">
          <div class="flex justify-between items-center mb-16">
            <h2 class="form-section-title">Finale evaluaties</h2>
            <button class="btn btn-primary btn-sm" @click="startEvaluatie('finaal','docent')" :disabled="startBezig">
              + Nieuwe finale evaluatie
            </button>
          </div>

          <div v-if="finale.length === 0" class="card">
            <p class="text-secondary text-sm">Nog geen finale evaluaties.</p>
          </div>

          <div v-for="ev in finale" :key="ev.evaluatie_id" class="card mt-12">
            <div class="flex justify-between items-center">
              <div>
                <div class="flex items-center gap-12">
                  <span class="font-semibold">{{ typeLabel(ev.type) }}</span>
                  <span class="badge badge-pill badge-green">finaal</span>
                </div>
                <p class="text-secondary text-sm mt-4">
                  Aangemaakt door: {{ ev.beoordelaar_voornaam }} {{ ev.beoordelaar_naam }} · {{ formatDatum(ev.ingevuld_op) }}
                </p>
                <p class="text-secondary text-sm">
                  Criteria ingevuld: {{ ev.ingevulde_criteria }} / {{ ev.totaal_criteria }}
                  <span v-if="ev.totaalscore !== null"> · Totaalscore: <strong>{{ ev.totaalscore }}</strong></span>
                </p>
              </div>
              <button class="btn btn-secondary btn-sm" @click="openEvaluatie(ev)">Invullen →</button>
            </div>
          </div>
        </section>

      </template>
    </main>
  </div>
</template>

<style scoped></style>
