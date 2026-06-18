<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import TopBarDocentStagecommissie from '@/components/TopBarDocentStagecommissie.vue'

const navLinks = ref([
  { label: 'Studenten', to: '/docent-studenten' },
  { label: 'Logboek', to: '/docent-logboek-overzicht' },
  { label: 'Evaluaties', to: '/docent-evaluaties' },
  { label: 'Aanvragen', to: '/docent-aanvragen' },
])

const studenten = ref([])
const laadFout = ref('')

onMounted(async () => {
  await laadStudenten()
})

async function laadStudenten() {
  laadFout.value = ''
  const token = localStorage.getItem('token')
  try {
    const res = await fetch('http://localhost:3000/api/docenten/mijn-studenten', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Ophalen mislukt')
    studenten.value = await res.json()
  } catch {
    laadFout.value = 'Studenten konden niet geladen worden.'
  }
}
</script>

<template>
  <div class="page">
    <TopBarDocentStagecommissie :links="navLinks" />

    <main class="content">
      <h1 class="page-title">Evaluaties</h1>
      <p class="text-secondary text-sm" style="margin-bottom:24px;">
        Bekijk per student de zelfevaluatie en de beoordeling van de mentor.
      </p>

      <p v-if="laadFout" class="text-secondary mt-16" style="color:#dc2626;">{{ laadFout }}</p>

      <div v-if="studenten.length === 0 && !laadFout" class="card mt-16">
        <p class="text-secondary">Geen studenten toegewezen.</p>
      </div>

      <div
        v-for="student in studenten"
        :key="student.stage_id"
        class="card mt-16"
      >
        <div class="td-name">{{ student.voornaam }} {{ student.student_naam }}</div>
        <div class="td-sub">{{ student.bedrijf }} · {{ student.stagetitel }}</div>

        <div class="flex gap-12 mt-16" style="flex-wrap:wrap;">
          <RouterLink
            :to="`/docent/evaluatie/${student.stage_id}/tussentijds/vergelijking`"
            class="btn btn-secondary btn-sm"
          >
            Tussentijdse evaluatie →
          </RouterLink>
          <RouterLink
            :to="`/docent/evaluatie/${student.stage_id}/finaal/vergelijking`"
            class="btn btn-primary btn-sm"
          >
            Eindevaluatie →
          </RouterLink>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped></style>
