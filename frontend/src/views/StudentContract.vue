<script setup>
import { ref, computed, onMounted } from 'vue'
import TopBar from '../components/TopBar.vue'
import SignaturePad from '../components/SignaturePad.vue'
import OvereenkomstDocument from '../components/OvereenkomstDocument.vue'
import { useStageStore } from '../stores/stage'

const stageStore = useStageStore()

const navLinks = ref([
  { label: 'Dashboard', to: '/student' },
  { label: 'Aanvraag', to: '/student/aanvraag' },
  { label: 'Contract', to: '/student/contract' },
  { label: 'Logboek', to: '/student/logboek' },
  { label: 'Evaluatie', to: '/student/evaluatie' },
])

const contract = ref(null)
const laadFout = ref('')
const bericht = ref('')
const bezig = ref(false)
const pad = ref(null)

onMounted(async () => {
  await stageStore.laad()
  await laadContract()
})

const stageId = computed(() => stageStore.aanvraag?.stage_id || null)
const stageGoedgekeurd = computed(() => stageStore.status === 'goedgekeurd')

async function laadContract() {
  if (!stageId.value) return
  laadFout.value = ''
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/contracten/${stageId.value}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status === 404) {
      contract.value = null
      return
    }
    if (!res.ok) throw new Error('Ophalen mislukt')
    contract.value = await res.json()
  } catch {
    laadFout.value = 'Contract kon niet geladen worden.'
  }
}

async function tekenContract() {
  const handtekening = pad.value?.getData()
  if (!handtekening) {
    bericht.value = 'Teken eerst je handtekening in het vak hierboven.'
    return
  }
  bezig.value = true
  bericht.value = ''
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/contracten/${stageId.value}/tekenen`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ rol: 'student', handtekening }),
    })
    const data = await res.json()
    if (res.ok) {
      bericht.value = data.message
      await laadContract()
    } else {
      bericht.value = data.error || 'Tekenen mislukt.'
    }
  } catch {
    bericht.value = 'Er ging iets mis.'
  } finally {
    bezig.value = false
  }
}
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />

    <main class="content">
      <h1 class="page-title">Stageovereenkomst</h1>

      <!-- Stage nog niet goedgekeurd -->
      <template v-if="!stageGoedgekeurd">
        <div class="card mt-24">
          <p class="font-semibold">Contract nog niet beschikbaar</p>
          <p class="text-secondary text-sm mt-8">
            Het stagecontract wordt aangemaakt nadat je aanvraag is goedgekeurd door de stagecommissie.
          </p>
        </div>
      </template>

      <!-- Goedgekeurd maar geen contract -->
      <template v-else-if="!contract && !laadFout">
        <div class="card mt-24">
          <p class="font-semibold">Contract wordt voorbereid</p>
          <p class="text-secondary text-sm mt-8">
            Je stage is goedgekeurd. Het contract wordt binnenkort beschikbaar gesteld.
          </p>
        </div>
      </template>

      <p v-if="laadFout" class="text-sm mt-16" style="color:#dc2626;">{{ laadFout }}</p>

      <!-- Contract beschikbaar -->
      <template v-else-if="contract">
        <!-- De volledige overeenkomst als pagina -->
        <div class="mt-24">
          <OvereenkomstDocument :contract="contract" />
        </div>

        <!-- Actie: teken -->
        <div class="card mt-16">
          <h2 class="form-section-title">Jouw handtekening</h2>

          <div v-if="contract.getekend_student" class="mt-12">
            <p class="text-secondary text-sm" style="color:#16a34a;">
              Je hebt dit contract al ondertekend.
            </p>
          </div>

          <div v-else class="mt-12">
            <p class="text-secondary text-sm mb-16">
              Door te ondertekenen bevestig je dat je akkoord gaat met de stageovereenkomst
              en alle bijhorende afspraken met het bedrijf en EhB.
            </p>

            <SignaturePad ref="pad" />

            <div v-if="bericht" class="card mt-12" style="background:#f0fdf4;border:1px solid #bbf7d0;">
              <p style="color:#15803d;">{{ bericht }}</p>
            </div>

            <button class="btn btn-primary mt-12" @click="tekenContract" :disabled="bezig">
              {{ bezig ? 'Bezig...' : 'Contract ondertekenen' }}
            </button>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped></style>
