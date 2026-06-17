<script setup>
import TopBar from '../components/TopBar.vue'

const navLinks = [
  { label: 'Dashboard', to: '/student' },
  { label: 'Aanvraag', to: '/student/aanvraag' },
  { label: 'Logboek', to: '/student/logboek' },
  { label: 'Evaluatie', to: '/student/evaluatie' },
]
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />
    <main class="content">
      <h1 class="page-title">Evaluatie</h1>
      <p class="text-secondary" style="margin-top:8px;">Deze pagina wordt nog ingevuld.</p>
    </main>
  </div>
</template>
