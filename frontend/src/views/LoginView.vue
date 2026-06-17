<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const wachtwoord = ref('')
const error = ref('')
const loading = ref(false)

// Al ingelogd? Stuur meteen door naar het juiste dashboard.
onMounted(() => {
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

