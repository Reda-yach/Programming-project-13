<script setup>
import { computed } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'

const props = defineProps({
  links: {
    type: Array,
    default: () => [],
  },
})

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
        :class="{ active: link.to === activeTo }"
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