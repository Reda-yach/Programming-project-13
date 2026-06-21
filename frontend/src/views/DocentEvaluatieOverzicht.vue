<script setup>
import { API_URL } from '@/api'
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import ContactPaneel from '../components/ContactPaneel.vue'
import { docentNavLinks } from './docentNav'

const route = useRoute()
const stageId = route.params.stageId
const API = `${API_URL}/api`

// 'Aanvragen' enkel voor commissie-docenten (zie docentNav.js).
const navLinks = docentNavLinks()

const stage = ref(null)
const evaluaties = ref([])
const laadFout = ref('')
const contactBerichten = ref([])

const gebruiker = JSON.parse(localStorage.getItem('gebruiker') || '{}')

onMounted(async () => {
  await laadStage()
  await laadEvaluaties()
  await laadContact()
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

async function laadContact() {
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`${API}/stages/${stageId}/contact`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) contactBerichten.value = await res.json()
  } catch { /* stil falen */ }
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

// Herinnering voor de docent: zodra de mentor de tussentijdse evaluatie heeft
// ingediend en de docent zelf nog geen bericht naar de mentor stuurde.
const toonHerinnering = computed(() => {
  const mentorTussentijds = evalVoor('tussentijds', 'mentor')
  return (
    !!mentorTussentijds?.ingediend &&
    !!stage.value?.mentor_id &&
    !contactBerichten.value.some((b) => b.afzender_id === gebruiker.id)
  )
})

function scrollNaarContact() {
  document.getElementById('contact-mentor')?.scrollIntoView({ behavior: 'smooth' })
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

      <div v-if="toonHerinnering" class="herinnering-banner">
        <span>📌 De tussentijdse evaluatie is afgerond — neem contact op met de mentor voor een gesprek.</span>
        <button class="btn btn-primary btn-sm" @click="scrollNaarContact">Naar contact</button>
      </div>

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

      <!-- Contact met de mentor van deze stage -->
      <section id="contact-mentor" class="card mt-16">
        <h2 class="form-section-title">Contact met de mentor</h2>
        <ContactPaneel v-if="stage?.mentor_id" :stage-id="stageId" />
        <p v-else class="text-secondary text-sm mt-8">
          Deze stage heeft nog geen toegewezen mentor om te contacteren.
        </p>
      </section>

    </main>
  </div>
</template>

<style scoped>
.herinnering-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 12px 16px;
  margin-top: 8px;
  background: #fef9c3;
  border: 1px solid #fde047;
  border-radius: 8px;
  font-size: 14px;
}
</style>
