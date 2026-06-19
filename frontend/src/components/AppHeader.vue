<script setup>
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

function logout() {
  authStore.clearSession()
  router.replace('/login')
}
</script>

<template>
  <header class="topbar">
    <div class="topbar-logo">
      <div class="logo-icon"></div>
      <span class="logo-text">Stage Monitor</span>
    </div>
    <nav class="topbar-nav">
      <RouterLink to="/competenties" class="nav-item">Competenties</RouterLink>
      <RouterLink to="/stages" class="nav-item">Stages</RouterLink>
      <RouterLink to="/accounts" class="nav-item">Accounts</RouterLink>
      <RouterLink to="/aanvragen" class="nav-item">Aanvragen</RouterLink>
    </nav>
    <div class="topbar-right">
      <button type="button" class="uitloggen" @click="logout">Uitloggen</button>
    </div>
  </header>
</template>
