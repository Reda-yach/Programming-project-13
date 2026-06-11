<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'

const router = useRouter()
const navLinks = ref([
  { label: 'Dashboard', to: '/student' },
  { label: 'Aanvraag', to: '/student/aanvraag' },
])

const status = ref('')
const motivatie = ref('')

onMounted(async () => {
  const token = localStorage.getItem('token')
  const res = await fetch('http://localhost:3000/api/stage', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const data = await res.json()
  status.value = data.status
  motivatie.value = data.stage?.motivatie || ''
})
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />
    <main class="content">
      <h1 class="page-title">Aanvraagstatus</h1>

      <div v-if="status === 'goedgekeurd'" class="card mt-24">
        <span class="badge badge-green">✓ Goedgekeurd</span>
        <p class="mt-16">Je stage is goedgekeurd. Upload nu je stageovereenkomst.</p>
        <button class="btn btn-primary mt-16" @click="router.push('/student/aanvraag')">
          Stageovereenkomst uploaden
        </button>
      </div>

      <div v-else-if="status === 'aanpassing_vereist'" class="card mt-24">
        <span class="badge badge-yellow">⚠ Aanpassingen vereist</span>
        <p class="mt-16"><strong>Opmerking commissie:</strong> {{ motivatie }}</p>
        <button class="btn btn-primary mt-16" @click="router.push('/student/aanvraag')">
          Aanvraag bewerken
        </button>
      </div>

      <div v-else-if="status === 'afgekeurd'" class="card mt-24">
        <span class="badge badge-red">✗ Afgekeurd</span>
        <p class="mt-16"><strong>Reden:</strong> {{ motivatie }}</p>
        <button class="btn btn-primary mt-16" @click="router.push('/student/aanvraag')">
          Nieuwe aanvraag indienen
        </button>
      </div>

      <div v-else class="card mt-24">
        <span class="badge badge-yellow">In behandeling</span>
        <p class="mt-16">Je aanvraag wordt beoordeeld door de stagecommissie.</p>
      </div>

    </main>
  </div>
</template>

<style scoped></style>
