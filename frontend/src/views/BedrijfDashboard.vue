<script setup>
import { ref, onMounted } from 'vue'
import TopBar from '../components/TopBar.vue'

const navLinks = [
  { label: 'Dashboard', to: '/bedrijf' },
  { label: 'Contract', to: '/bedrijf/contract' },
  { label: 'Mentor voorstellen', to: '/bedrijf/mentor-voorstel' },
]

const gebruiker = JSON.parse(localStorage.getItem('gebruiker') || '{}')
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />
    <main class="content">
      <h1 class="page-title">Welkom, {{ gebruiker.naam }}</h1>
      <div class="card mt-24">
        <p class="font-semibold">Bedrijfsportaal</p>
        <p class="text-secondary text-sm mt-8">
          Via dit portaal kan je het stagecontract ondertekenen en een mentor voorstellen voor de stagiair.
        </p>
      </div>
    </main>
  </div>
</template>
