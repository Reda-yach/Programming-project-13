<script setup>
import { RouterLink, useRouter } from 'vue-router'

defineProps({
  links: {
    type: Array,
    default: () => [],
  },
})

const router = useRouter()

function uitloggen() {
  localStorage.removeItem('token')
  localStorage.removeItem('gebruiker')
  router.push('/login')
}
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
      <button class="uitloggen" @click="uitloggen">Uitloggen</button>
    </div>
  </header>
</template>

<style scoped></style>