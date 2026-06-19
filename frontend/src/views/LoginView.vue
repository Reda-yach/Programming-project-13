<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const wachtwoord = ref('')
const error = ref('')
const melding = ref('')
const loading = ref(false)

// Al ingelogd? Stuur meteen door naar het juiste dashboard.
onMounted(() => {
  // Hierheen gestuurd omdat er in een ander tabblad is ingelogd: toon melding
  // en sla de auto-redirect over (anders springt deze tab terug naar het
  // dashboard van de gedeelde sessie).
  if (route.query.reden === 'elders') {
    melding.value = 'Je bent in een ander tabblad opnieuw ingelogd. Meld je hier opnieuw aan om verder te gaan.'
    return
  }

  const token = localStorage.getItem('token')
  const gebruiker = JSON.parse(localStorage.getItem('gebruiker') || 'null')
  if (token && gebruiker) {
    const bestemming = authStore.getRoleHomePath(gebruiker.rol)
    if (bestemming) router.push(bestemming)
  }
})

async function handleLogin() {
  error.value = ''

  if (!email.value || !wachtwoord.value) {
    error.value = 'Vul je e-mailadres en wachtwoord in.'
    return
  }

  loading.value = true

  try {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value.trim(), wachtwoord: wachtwoord.value }),
    })

const data = await response.json()

if (!response.ok) {
  error.value = data.error || 'Aanmelden mislukt. Controleer je gegevens.'
  return
}

    authStore.saveSession({
      token: data.token,
      user: data.gebruiker,
    })

    const bestemming = authStore.getRoleHomePath(data.gebruiker?.rol)
    router.replace(bestemming)
  } catch (err) {
    error.value = 'Kan niet verbinden met de backend. Controleer of de server draait.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-card" aria-labelledby="login-heading">

      <div class="login-logo" aria-hidden="true">
        <div class="logo-icon"></div>
        <span class="logo-text">Stage Monitor</span>
      </div>

      <h1 class="login-title" id="login-heading">Welkom terug</h1>
      <p class="login-sub">Meld je aan bij Stage Monitor</p>

      <p v-if="melding" role="status" class="login-melding">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{{ melding }}</span>
      </p>

      <form @submit.prevent="handleLogin" novalidate>
        <div class="form-group" style="margin-bottom: 16px;">
          <label for="email">E-mailadres</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="naam@gmail.com"
            autocomplete="email"
            v-model="email"
            required
          >
        </div>
        <div class="form-group" style="margin-bottom: 24px;">
          <label for="wachtwoord">Wachtwoord</label>
          <input
            type="password"
            id="wachtwoord"
            name="wachtwoord"
            placeholder="••••••••"
            autocomplete="current-password"
            v-model="wachtwoord"
            required
          >
        </div>

        <button type="submit" class="btn btn-primary w-full" aria-describedby="login-error" :disabled="loading">
          {{ loading ? 'Bezig met inloggen…' : 'Log in' }}
        </button>
        <p id="login-error" role="alert" aria-live="polite">{{ error }}</p>
      </form>

      <router-link to="/wachtwoord-vergeten" class="login-link">Wachtwoord vergeten?</router-link>

    </section>
  </main>
</template>

<style scoped>
.login-melding {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 24px;
  padding: 12px 14px;
  background: var(--blue-bg);
  border: 1px solid var(--blue-border);
  border-radius: 8px;
  color: var(--blue-text);
  font-size: 14px;
  line-height: 1.4;
}
.login-melding svg {
  flex-shrink: 0;
  margin-top: 1px;
}
</style>

