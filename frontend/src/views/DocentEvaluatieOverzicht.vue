<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import TopBar from '../components/TopBar.vue'

const route = useRoute()
const stageId = route.params.stageId
const API = 'http://localhost:3000/api'

const navLinks = ref([
  { label: 'Studenten', to: '/docent-studenten' },
  { label: 'Logboek', to: '/docent-logboek-overzicht' },
  { label: 'Evaluaties', to: '/docent-evaluaties' },
  { label: 'Aanvragen', to: '/docent-aanvragen' },
])

const stage = ref(null)
const evaluaties = ref([])
const laadFout = ref('')

onMounted(async () => {
  await laadStage()
  await laadEvaluaties()
})

async function laadStage() {
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`${API}/stages/${stageId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) stage.value = await res.json()
  } catch { /* stil falen */ }
}

async function laadEvaluaties() {
  laadFout.value = ''
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`${API}/stages/${stageId}/evaluatie-overzicht`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error()
    evaluaties.value = await res.json()
  } catch {
    laadFout.value = 'Evaluaties konden niet geladen worden.'
  }
}

// Per fase de student- en mentor-evaluatie eruit lichten voor de statusregel.
function evalVoor(fase, type) {
  return evaluaties.value.find(e => e.fase === fase && e.type === type)
}
function statusTekst(ev) {
  if (!ev) return 'nog niet gestart'
  if (ev.ingediend) return 'ingediend'
  if (Number(ev.ingevulde_criteria) > 0) return `bezig (${ev.ingevulde_criteria}/${ev.totaal_criteria})`
  return 'gestart'
}

const fases = [
  { key: 'tussentijds', label: 'Tussentijdse evaluatie' },
  { key: 'finaal', label: 'Eindevaluatie' },
]
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

      <section
        v-for="f in fases"
        :key="f.key"
        class="card mt-16"
      >
        <h2 class="form-section-title">{{ f.label }}</h2>

        <p class="text-secondary text-sm mt-8">
          Zelfevaluatie student: <strong>{{ statusTekst(evalVoor(f.key, 'student')) }}</strong>
        </p>
        <p class="text-secondary text-sm">
          Beoordeling mentor: <strong>{{ statusTekst(evalVoor(f.key, 'mentor')) }}</strong>
        </p>

        <router-link
          :to="`/docent/evaluatie/${stageId}/${f.key}/vergelijking`"
          class="btn btn-primary btn-sm mt-16"
          style="display:inline-block;"
        >
          Zelfevaluatie + mentorbeoordeling bekijken →
        </router-link>
      </section>

    </main>
  </div>
</template>

<style scoped></style>
