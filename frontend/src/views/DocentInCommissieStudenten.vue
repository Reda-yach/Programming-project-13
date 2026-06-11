<script setup>
import TopBarDocentStagecommissie from '@/components/TopBarDocentStagecommissie.vue'
import { ref } from 'vue'

const navLinks = ref([
  { label: 'Studenten', to: '/docent-studenten' },
  { label: 'Logboek', to: '/docent-logboek-overzicht' },
  { label: 'Evaluaties', to: '/docent-evaluaties' },
  { label: 'Aanvragen', to: '/docent-aanvragen' },
])
</script>

<template>
  <div class="page">
    <TopBarDocentStagecommissie :links="navLinks" />
    <main class="content">
      <h1 class="page-title">Studenten</h1>
      <p class="text-secondary">Deze pagina wordt nog ingevuld.</p>
    </main>
  </div>
</template>