<script setup>
import { RouterLink, useRouter } from 'vue-router'

defineProps({
  active: {
    type: String,
    default: '',
  },
})

const router = useRouter()

function uitloggen() {
  localStorage.removeItem('token')
  localStorage.removeItem('gebruiker')
  router.push('/login')
}

// ponytail: overzichtsroutes bestaan enkel met streepjes; /docent/logboek en /docent/evaluaties hadden geen route → lege tabs
const navLinks = [
  { label: 'Studenten',  to: '/docent/studenten',        key: 'studenten' },
  { label: 'Logboek',    to: '/docent-logboek-overzicht', key: 'logboek'   },
  { label: 'Evaluaties', to: '/docent-evaluaties',        key: 'evaluaties'},
  { label: 'Aanvragen',  to: '/docent-aanvragen',         key: 'aanvragen' },
]
</script>

<template>
  <header class="topbar">
    <div class="topbar-logo">
      <div class="logo-icon"></div>
      <span class="logo-text">Stage Monitor</span>
    </div>
    <nav class="topbar-nav">
      <RouterLink
        v-for="link in navLinks"
        :key="link.key"
        :to="link.to"
        class="nav-item"
        :class="{ active: active === link.key }"
      >
        {{ link.label }}
      </RouterLink>
    </nav>
    <div class="topbar-right">
      <button class="uitloggen" @click="uitloggen">Uitloggen</button>
    </div>
  </header>
</template>