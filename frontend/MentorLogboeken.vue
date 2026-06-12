<script setup>
import { ref, onMounted } from 'vue'
import TopBar from '../components/TopBar.vue'

const navLinks = ref([
  { label: 'Studenten', to: '/mentor' },
  { label: 'Logboeken', to: '/mentor/logboeken' },
  { label: 'Evaluatie', to: '/mentor/evaluatie' },
])

const logboeken = ref([])
const geselecteerd = ref(null)
const bezig = ref(false)
const bericht = ref('')
const gebruiker = JSON.parse(localStorage.getItem('gebruiker'))

onMounted(async () => {
  await laadLogboeken()
})

async function laadLogboeken() {
  const token = localStorage.getItem('token')
  const res = await fetch(`http://localhost:3000/api/mentors/${gebruiker.id}/logboeken`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  logboeken.value = await res.json()
}

function selecteer(logboek) {
  geselecteerd.value = logboek
  bericht.value = ''
}

function terugNaarLijst() {
  geselecteerd.value = null
  bericht.value = ''
}

async function aftekenen() {
  bezig.value = true
  const token = localStorage.getItem('token')
  const res = await fetch(`http://localhost:3000/api/logboeken/${geselecteerd.value.logboek_id}/aftekenen`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const data = await res.json()
  bezig.value = false

  if (res.ok) {
    bericht.value = data.message
    geselecteerd.value.status = 'goedgekeurd'
    await laadLogboeken()
  } else {
    bericht.value = data.error
  }
}

// Groepeer logboeken per student
function studenten() {
  const groepen = {}
  logboeken.value.forEach(l => {
    const key = `${l.voornaam} ${l.student_naam}`
    if (!groepen[key]) groepen[key] = []
    groepen[key].push(l)
  })
  return groepen
}
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />
    <main class="content">

      <!-- Overzicht logboeken per student -->
      <div v-if="!geselecteerd">
        <h1 class="page-title">Logboeken</h1>

        <div v-if="logboeken.length === 0" class="card mt-24">
          <p class="text-secondary">Geen logboeken gevonden.</p>
        </div>

        <div
          v-for="(logs, studentNaam) in studenten()"
          :key="studentNaam"
          class="card mt-16"
        >
          <h2 class="form-section-title">{{ studentNaam }}</h2>
          <p class="text-secondary text-sm mt-4">{{ logs[0].bedrijf }}</p>
          <p class="text-secondary text-sm">
            Meest recente entry: Week {{ logs[0].week_nummer }} — {{ logs[0].ingediend_op?.split('T')[0] }} — {{ logs.length }} entries
          </p>
          <button class="btn btn-primary mt-16" @click="selecteer(logs[0])">
            Logboeken inkijken →
          </button>
        </div>
      </div>

      <!-- Detail van een logboek -->
      <div v-else>
        <button class="btn btn-secondary mb-16" @click="terugNaarLijst">
          ← Logboeken
        </button>

        <div class="flex items-center gap-16">
          <h1 class="page-title">
            {{ geselecteerd.voornaam }} {{ geselecteerd.student_naam }}
          </h1>
          <span
            class="badge"
            :class="{
              'badge-green': geselecteerd.status === 'goedgekeurd',
              'badge-yellow': geselecteerd.status === 'ingediend',
              'badge-red': geselecteerd.status === 'draft'
            }"
          >
            {{ geselecteerd.status }}
          </span>
        </div>

        <p class="text-secondary text-sm mt-4">
          {{ geselecteerd.bedrijf }} — Week {{ geselecteerd.week_nummer }}
        </p>

        <div class="card mt-16">
          <h2 class="form-section-title">Beschrijving van uitgevoerde taken</h2>
          <p class="mt-8" style="white-space: pre-line;">{{ geselecteerd.activiteiten || 'Niet ingevuld' }}</p>
        </div>

        <div class="card mt-16">
          <h2 class="form-section-title">Reflectie</h2>
          <p class="mt-8" style="white-space: pre-line;">{{ geselecteerd.reflectie || 'Niet ingevuld' }}</p>
        </div>

        <div class="card mt-16">
          <h2 class="form-section-title">Problemen / Leerpunten</h2>
          <p class="mt-8" style="white-space: pre-line;">{{ geselecteerd.leerpunten || 'Niet ingevuld' }}</p>
        </div>

        <div class="card mt-16">
          <h2 class="form-section-title">Uw feedback als mentor</h2>
          <p class="text-secondary text-sm mt-8">
            Teken het logboek af als gelezen. Zichtbaar voor student en docent.
          </p>

          <p v-if="bericht" class="text-sm mt-8 badge-green">{{ bericht }}</p>

          <button
            v-if="geselecteerd.status !== 'goedgekeurd'"
            class="btn btn-primary mt-16"
            @click="aftekenen"
            :disabled="bezig"
          >
            Week bevestigen
          </button>
          <span v-else class="badge badge-green mt-16">
            ✓ Logboek bevestigd
          </span>
        </div>

      </div>

    </main>
  </div>
</template>

<style scoped></style>
