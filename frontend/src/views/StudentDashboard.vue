<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import { useStageStore } from '../stores/stage'

const router = useRouter()
const stageStore = useStageStore()

const navLinks = computed(() => {
  const links = [
    { label: 'Dashboard', to: '/student' },
    { label: 'Aanvraag', to: '/student/aanvraag' },
  ]
  if (stageStore.status === 'actief') {
    links.push({ label: 'Logboek', to: '/student/logboek' })
    links.push({ label: 'Evaluatie', to: '/student/evaluatie' })
  }
  return links
})

const gebruiker = JSON.parse(localStorage.getItem('gebruiker'))
const notificaties = ref([])

onMounted(async () => {
  await stageStore.laad()

  if (gebruiker) {
    const token = localStorage.getItem('token')
    const res = await fetch(`http://localhost:3000/api/notificaties/${gebruiker.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    notificaties.value = await res.json()
  }
})
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />
    <main class="content">
      <h1 class="page-title">Welkom terug, {{ gebruiker?.voornaam }}</h1>

      <div class="form-grid-2 mt-24">

        <!-- Stage status -->
        <div class="card">
          <div class="flex items-center gap-16">
            <h2 class="form-section-title">Stage Status</h2>
            <span v-if="stageStore.status === 'actief'" class="badge badge-green">ACTIEF</span>
            <span v-else-if="stageStore.status === 'in_behandeling'" class="badge badge-yellow">IN BEHANDELING</span>
            <span v-else class="badge badge-red">INACTIEF</span>
          </div>

          <div v-if="stageStore.status === 'geen'" class="mt-16">
            <p class="text-secondary">Geen actieve stage</p>
            <button class="btn btn-primary mt-16" @click="router.push('/student/aanvraag')">
              Stage aanvragen
            </button>
          </div>

          <div v-else-if="stageStore.status === 'in_behandeling'" class="mt-16">
            <p class="text-secondary">Je aanvraag wordt beoordeeld door de stagecommissie.</p>
            <button class="btn btn-secondary mt-16" @click="router.push('/student/aanvraag/status')">
              Bekijk status
            </button>
          </div>

          <div v-else class="mt-16">
            <p><strong>{{ stageStore.aanvraag?.bedrijf_naam }}</strong></p>
            <p class="text-secondary text-sm">
              {{ stageStore.aanvraag?.startdatum }} — {{ stageStore.aanvraag?.einddatum }}
            </p>
          </div>
        </div>

        <!-- Logboek deze week -->
        <div class="card">
          <h2 class="form-section-title">Logboek deze week</h2>
          <div v-if="stageStore.status !== 'actief'">
            <p class="text-secondary mt-8">Geen logboek beschikbaar</p>
          </div>
          <div v-else>
            <button class="btn btn-primary mt-16" @click="router.push('/student/logboek')">
              Logboek invullen →
            </button>
          </div>
        </div>

        <!-- Tussentijdse evaluatie -->
        <div class="card">
          <h2 class="form-section-title">Tussentijdse Evaluatie</h2>
          <p class="text-secondary text-sm mt-8">
            Je kunt de tussentijdse evaluatie invullen om je voortgang te bespreken met je mentor en docent.
          </p>
          <div v-if="stageStore.status !== 'actief'">
            <p class="text-secondary text-sm mt-8">Nog niet beschikbaar 🔒</p>
          </div>
          <div v-else>
            <button class="btn btn-primary mt-16" @click="router.push('/student/evaluatie')">
              Nu invullen →
            </button>
          </div>
        </div>

        <!-- Eindevaluatie -->
        <div class="card">
          <h2 class="form-section-title">Eindevaluatie</h2>
          <p class="text-secondary text-sm mt-8">
            De eindevaluatie wordt beschikbaar in
