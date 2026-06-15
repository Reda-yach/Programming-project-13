<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

const gebruiker = JSON.parse(localStorage.getItem('gebruiker') || '{}')
const links = ref([
  { label: 'Alle stages', to: '/docent-studenten', beschrijving: 'Bekijk alle stages in het systeem' },
  { label: 'Aanvragen', to: '/docent-aanvragen', beschrijving: 'Openstaande stage-aanvragen beoordelen' },
  { label: 'Evaluaties', to: '/docent-evaluaties', beschrijving: 'Alle evaluaties bekijken' },
  { label: 'Logboeken', to: '/docent-logboek-overzicht', beschrijving: 'Alle logboeken bekijken' },
])
</script>

<template>
  <div class="page">
    <header class="topbar">
      <div class="topbar-logo">
        <div class="logo-icon"></div>
        <span class="logo-text">Stage Monitor</span>
      </div>
      <div class="topbar-right">
        <RouterLink to="/login" class="uitloggen">Uitloggen</RouterLink>
      </div>
    </header>

    <main class="content">
      <h1 class="page-title">Welkom, {{ gebruiker.voornaam }}</h1>
      <p class="text-secondary text-sm mt-4">Beheerderspaneel — Stage Monitor</p>

      <div class="card-grid-2 mt-24">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="card"
          style="text-decoration:none;display:block;cursor:pointer;"
        >
          <div class="font-semibold" style="font-size:16px;">{{ link.label }}</div>
          <p class="text-secondary text-sm mt-8">{{ link.beschrijving }}</p>
        </RouterLink>
      </div>
    </main>
  </div>
</template>

<style scoped></style>
