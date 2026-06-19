<script setup>
import { RouterLink } from 'vue-router'
import { computed } from 'vue'

defineProps({
  links: {
    type: Array,
    default: () => [],
  },
})

const gebruikerNaam = computed(() => {
  try {
    const g = JSON.parse(localStorage.getItem('gebruiker') || '{}')
    if (g.voornaam && g.naam) return `${g.voornaam} ${g.naam}`
    if (g.voornaam) return g.voornaam
    if (g.naam) return g.naam
    return g.rol ? g.rol.charAt(0).toUpperCase() + g.rol.slice(1) : 'Account'
  } catch {
    return 'Account'
  }
})
</script>

<template>
  <header class="topbar">
    <div class="topbar-logo">
      <div class="logo-icon"></div>
      <span class="logo-text">Stage Monitor</span>
    </div>
    <nav class="topbar-nav">
      <RouterLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="nav-item"
        active-class="active"
      >
        {{ link.label }}
      </RouterLink>
    </nav>
    <div class="topbar-right">
      <span class="gebruiker-naam">{{ gebruikerNaam }} ▾</span>
      <RouterLink to="/login" class="uitloggen">Uitloggen</RouterLink>
    </div>
  </header>
</template>

<style scoped>
.gebruiker-naam {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin-right: 16px;
}
</style>