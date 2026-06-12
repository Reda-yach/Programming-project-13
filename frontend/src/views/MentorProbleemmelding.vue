<script setup>
import { ref, onMounted } from 'vue'
import TopBar from '../components/TopBar.vue'

const navLinks = ref([
  { label: 'Studenten', to: '/mentor' },
  { label: 'Logboeken', to: '/mentor/logboeken' },
  { label: 'Evaluatie', to: '/mentor/evaluatie' },
  { label: 'Probleem melden', to: '/mentor/probleem' },
])

const stagiairs = ref([])
const meldingen = ref([])
const titel = ref('')
const beschrijving = ref('')
const geselecteerdeStage = ref('')
const bezig = ref(false)
const bericht = ref('')
const toonFormulier = ref(false)
const gebruiker = JSON.parse(localStorage.getItem('gebruiker'))

onMounted(async () => {
  await laadStagiairs()
  await laadMeldingen()
})

async function laadStagiairs() {
  const token = localStorage.getItem('token')
  const res = await fetch(`http://localhost:3000/api/mentors/${gebruiker.id}/stagiairs`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  stagiairs.value = await res.json()
}

async function laadMeldingen() {
  const token = localStorage.getItem('token')
  const res = await fetch(`http://localhost:3000/api/mentors/${gebruiker.id}/probleemmeldingen`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  meldingen.value = await res.json()
}

async function dienIn() {
  if (!titel.value.trim() || !beschrijving.value.trim() || !geselecteerdeStage.value) {
    bericht.value = 'Vul alle velden in.'
    return
  }

  bezig.value = true
  const token = localStorage.getItem('token')
  const res = await fetch('http://localhost:3000/api/probleemmeldingen', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      mentor_id: gebruiker.id,
      stage_id: geselecteerdeStage.value,
      titel: titel.value,
      beschrijving: beschrijving.value
    })
  })
  const data = await res.json()
  bezig.value = false

  if (res.ok) {
    bericht.value = data.message
    titel.value = ''
    beschrijving.value = ''
    geselecteerdeStage.value = ''
    toonFormulier.value = false
    await laadMeldingen()
  } else {
    bericht.value = data.error
  }
}
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />
    <main class="content">
      <div class="flex items-center gap-16">
        <h1 class="page-title">Probleemmeldingen</h1>
        <button
          class="btn btn-primary"
          @click="toonFormulier = !toonFormulier"
        >
          + Nieuw probleem melden
        </button>
      </div>

      <!-- Formulier nieuw probleem -->
      <div v-if="toonFormulier" class="card mt-24">
        <h2 class="form-section-title">Nieuw probleem melden</h2>
        <p class="text-secondary text-sm mt-8">
          Je melding wordt doorgestuurd naar de docent en stagecommissie.
        </p>

        <div class="form-group mt-16">
          <label>Stagiair</label>
          <select v-model="geselecteerdeStage" class="form-input">
            <option value="" disabled>Selecteer een stagiair</option>
            <option
              v-for="stagiair in stagiairs"
              :key="stagiair.stage_id"
              :value="stagiair.stage_id"
            >
              {{ stagiair.voornaam }} {{ stagiair.student_naam }} — {{ stagiair.bedrijf }}
            </option>
          </select>
        </div>

        <div class="form-group mt-12">
          <label>Titel</label>
          <input
            type="text"
            v-model="titel"
            class="form-input"
            placeholder="Korte omschrijving van het probleem"
          >
        </div>

        <div class="form-group mt-12">
          <label>Beschrijving</label>
          <textarea
            v-model="beschrijving"
            rows="5"
            class="form-input"
            placeholder="Beschrijf het probleem in detail..."
          ></textarea>
        </div>

        <p v-if="bericht" class="text-sm mt-8">{{ bericht }}</p>

        <div class="flex gap-8 mt-16">
          <button
            class="btn btn-primary"
            @click="dienIn"
            :disabled="bezig"
          >
            Indienen
          </button>
          <button
            class="btn btn-secondary"
            @click="toonFormulier = false"
          >
            Annuleren
          </button>
        </div>
      </div>

      <!-- Overzicht meldingen -->
      <div v-if="meldingen.length === 0" class="card mt-24">
        <p class="text-secondary">Geen probleemmeldingen gevonden.</p>
      </div>

      <div
        v-for="melding in meldingen"
        :key="melding.melding_id"
        class="card mt-16"
      >
        <div class="flex items-center gap-16">
          <h2 class="form-section-title">{{ melding.titel }}</h2>
          <span
            class="badge"
            :class="{
              'badge-red': melding.status === 'open',
              'badge-yellow': melding.status === 'in_behandeling',
              'badge-green': melding.status === 'opgelost'
            }"
          >
            {{ melding.status }}
          </span>
        </div>
        <p class="text-secondary text-sm mt-4">
          {{ melding.student_voornaam }} {{ melding.student_naam }} — {{ melding.bedrijf }}
        </p>
        <p class="mt-8">{{ melding.beschrijving }}</p>
        <p class="text-secondary text-sm mt-4">
          {{ melding.aangemaakt_op?.split('T')[0] }}
        </p>
      </div>

    </main>
  </div>
</template>

<style scoped></style>
