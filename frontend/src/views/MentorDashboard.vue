<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'

const router = useRouter()

const navLinks = ref([
  { label: 'Studenten', to: '/mentor' },
  { label: 'Logboeken', to: '/mentor/logboeken' },
  { label: 'Evaluatie', to: '/mentor/evaluatie' },
  { label: 'Probleem', to: '/mentor/probleem' },
])

const stagiairs = ref([])
const contracten = ref({})
const berichtContract = ref({})
const gebruiker = JSON.parse(localStorage.getItem('gebruiker'))

onMounted(async () => {
  const token = localStorage.getItem('token')
  const res = await fetch(`http://localhost:3000/api/mentors/${gebruiker.id}/stagiairs`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  stagiairs.value = await res.json()

  for (const s of stagiairs.value) {
    await laadContract(s.stage_id)
  }
})

async function laadContract(stageId) {
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/contracten/${stageId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) contracten.value[stageId] = await res.json()
    else contracten.value[stageId] = null
  } catch {
    contracten.value[stageId] = null
  }
}

async function tekenContract(stageId) {
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/contracten/${stageId}/tekenen`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ rol: 'mentor' }),
    })
    const data = await res.json()
    berichtContract.value[stageId] = data.message || data.error
    await laadContract(stageId)
  } catch {
    berichtContract.value[stageId] = 'Er ging iets mis.'
  }
}
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />
    <main class="content">
      <h1 class="page-title">Mijn stagiairs</h1>
      <p class="text-secondary text-sm mt-8">
        Welkom terug, {{ gebruiker?.voornaam }}. Bekijk hier een overzicht van alle stagiairs die je begeleidt.
      </p>

      <div v-if="stagiairs.length === 0" class="card mt-24">
        <p class="text-secondary">Geen stagiairs gevonden.</p>
      </div>

      <div v-for="stagiair in stagiairs" :key="stagiair.stage_id" class="card mt-16">
        <div class="flex justify-between items-center">
          <div>
            <p class="font-semibold" style="font-size:16px;">
              {{ stagiair.voornaam }} {{ stagiair.student_naam }}
            </p>
            <p class="text-secondary text-sm mt-4">{{ stagiair.bedrijf }}</p>
            <p class="text-secondary text-sm">{{ stagiair.startdatum }} — {{ stagiair.einddatum }}</p>
          </div>
          <span class="badge badge-pill"
            :class="stagiair.status === 'goedgekeurd' ? 'badge-green' : 'badge-yellow'">
            {{ stagiair.status }}
          </span>
        </div>

        <!-- Contract sectie -->
        <div v-if="contracten[stagiair.stage_id]" class="mt-16" style="border-top:1px solid var(--border);padding-top:16px;">
          <p class="text-secondary text-xs font-semibold mb-8">Stagecontract</p>
          <div class="flex gap-16" style="flex-wrap:wrap;">
            <span class="text-sm">
              Student: {{ contracten[stagiair.stage_id].getekend_student ? '✅' : '⏳' }}
            </span>
            <span class="text-sm">
              Mentor: {{ contracten[stagiair.stage_id].getekend_mentor ? '✅' : '⏳' }}
            </span>
            <span class="text-sm">
              Docent: {{ contracten[stagiair.stage_id].getekend_docent ? '✅' : '⏳' }}
            </span>
          </div>
          <div v-if="berichtContract[stagiair.stage_id]" class="text-sm mt-8" style="color:#16a34a;">
            {{ berichtContract[stagiair.stage_id] }}
          </div>
          <button
            v-if="!contracten[stagiair.stage_id].getekend_mentor"
            class="btn btn-primary btn-sm mt-12"
            @click="tekenContract(stagiair.stage_id)"
          >
            Contract ondertekenen
          </button>
          <p v-else class="text-sm mt-8" style="color:#16a34a;">Je hebt dit contract al ondertekend.</p>
        </div>
        <div v-else-if="stagiair.status === 'goedgekeurd'" class="mt-12 text-secondary text-sm">
          Contract wordt voorbereid...
        </div>
      </div>

    </main>
  </div>
</template>

<style scoped></style>
