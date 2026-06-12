<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

defineProps({
  links: {
    type: Array,
    default: () => [],
  },
})

const authStore = useAuthStore()
const router = useRouter()

const open = ref(false)
const wrap = ref(null)

const rolLabel = computed(() => {
  const rol = authStore.user?.rol
  return rol ? rol.charAt(0).toUpperCase() + rol.slice(1) : 'Account'
})

const volledigeNaam = computed(() => {
  const u = authStore.user
  if (!u) return ''
  return [u.voornaam, u.naam].filter(Boolean).join(' ')
})

function toggle() {
  open.value = !open.value
}

function sluitBijBuitenklik(e) {
  if (wrap.value && !wrap.value.contains(e.target)) open.value = false
}

function uitloggen() {
  authStore.clearSession()
  router.push('/login')
}

onMounted(() => document.addEventListener('click', sluitBijBuitenklik))
onBeforeUnmount(() => document.removeEventListener('click', sluitBijBuitenklik))
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
      <div v-if="authStore.user" ref="wrap" class="role-wrap">
        <button class="role-btn" type="button" :aria-expanded="open" @click="toggle">
          {{ rolLabel }}
          <span class="role-chevron" :class="{ open }">▾</span>
        </button>

        <div v-if="open" class="role-menu">
          <div class="role-menu-name">{{ volledigeNaam }}</div>
          <div class="role-menu-email">{{ authStore.user.email }}</div>
          <span class="badge badge-gray role-menu-badge">{{ rolLabel }}</span>
        </div>
      </div>

      <button class="uitloggen" type="button" @click="uitloggen">Uitloggen</button>
    </div>
  </header>
</template>

<style scoped></style>
