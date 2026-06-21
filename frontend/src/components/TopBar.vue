<script setup>
import { computed } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const props = defineProps({
  links: {
    type: Array,
    default: () => [],
  },
})

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

// ponytail: vlakke routes → eigen prefix-match i.p.v. active-class (exacte record-match)
const activeTo = computed(() => {
  const path = route.path
  return props.links
    .filter(l => [l.to, l.match].filter(Boolean)
      .some(p => path === p || path.startsWith(p + '/')))
    .map(l => l.to)
    .sort((a, b) => b.length - a.length)[0]
})

// Toon de rol van de ingelogde gebruiker (Student, Docent, Mentor, …).
const rolLabel = computed(() => {
  try {
    const rol = JSON.parse(localStorage.getItem('gebruiker') || '{}').rol || ''
    return rol ? rol.charAt(0).toUpperCase() + rol.slice(1) : 'Account'
  } catch {
    return 'Account'
  }
})

function uitloggen() {
  authStore.clearSession()
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
        :class="{ active: link.to === activeTo }"
      >
        {{ link.label }}
      </RouterLink>
    </nav>

    <div class="topbar-right">
      <span class="gebruiker-naam">{{ rolLabel }}</span>
      <button class="uitloggen" type="button" @click="uitloggen">Uitloggen</button>
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
