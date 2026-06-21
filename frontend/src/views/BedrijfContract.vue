<script setup>
import { API_URL } from '@/api'
import { ref, onMounted, computed } from 'vue'
import TopBar from '../components/TopBar.vue'
import SignaturePad from '../components/SignaturePad.vue'
import OvereenkomstDocument from '../components/OvereenkomstDocument.vue'

const navLinks = [
  { label: 'Contract', to: '/bedrijf/contract' },
  { label: 'Mentor voorstellen', to: '/bedrijf/mentor-voorstel' },
]

const contract = ref(null)
const laadFout = ref('')
const bericht = ref('')
const bezig = ref(false)
const pad = ref(null)

async function laadContract() {
  const token = localStorage.getItem('token')
  laadFout.value = ''
  try {
    // Haal stage op voor dit bedrijf
    const stagesRes = await fetch(`${API_URL}/api/stages?status=goedgekeurd,bezig`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!stagesRes.ok) throw new Error()
    const stages = await stagesRes.json()
    if (!stages.length) { contract.value = null; return }

    const stageId = stages[0].stage_id
    const contractRes = await fetch(`${API_URL}/api/contracten/${stageId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (contractRes.status === 404) { contract.value = null; return }
    if (!contractRes.ok) throw new Error()
    contract.value = await contractRes.json()
  } catch {
    laadFout.value = 'Contract kon niet geladen worden.'
  }
}

onMounted(laadContract)

async function tekenContract() {
  const handtekening = pad.value?.getData()
  if (!handtekening) { bericht.value = 'Teken eerst je handtekening.'; return }
  bezig.value = true
  bericht.value = ''
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`${API_URL}/api/contracten/${contract.value.stage_id}/tekenen`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ handtekening }),
    })
    const data = await res.json()
    if (res.ok) { bericht.value = data.message; await laadContract() }
    else bericht.value = data.error || 'Tekenen mislukt.'
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
      <h1 class="page-title">Stagecontract</h1>

      <p v-if="laadFout" class="text-sm mt-16" style="color:#dc2626;">{{ laadFout }}</p>

      <template v-if="!contract && !laadFout">
        <div class="card mt-24">
          <p class="font-semibold">Geen contract beschikbaar</p>
          <p class="text-secondary text-sm mt-8">Er is nog geen goedgekeurd contract voor uw stagiair.</p>
        </div>
      </template>

      <template v-else-if="contract">
        <div class="mt-24">
          <OvereenkomstDocument :contract="contract" />
        </div>

        <div class="card mt-16">
          <h2 class="form-section-title">Handtekening bedrijf</h2>
          <div v-if="contract.getekend_bedrijf" class="mt-12">
            <p class="text-secondary text-sm" style="color:#16a34a;">Het bedrijf heeft dit contract al ondertekend.</p>
          </div>
          <div v-else class="mt-12">
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
