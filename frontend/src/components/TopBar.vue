<script setup>
import { RouterLink } from 'vue-router'

defineProps({
  links: {
    type: Array,
    default: () => [],
  },
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
      <RouterLink to="/login" class="uitloggen">Uitloggen</RouterLink>
    </div>
  </header>
</template>

<style scoped></style>