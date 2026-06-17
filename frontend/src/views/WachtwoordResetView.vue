<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// Token komt uit de query: /wachtwoord-reset?token=...
const token = computed(() => route.query.token || '')

const wachtwoord = ref('')
const bevestig = ref('')
const error = ref('')
const melding = ref('')
const loading = ref(false)
const gelukt = ref(false)

const MIN_WACHTWOORD_LENGTE = 8

async function handleReset() {
  error.value = ''
  melding.value = ''

  if (!token.value) {
    error.value = 'Deze reset-link is ongeldig of onvolledig.'
    return
  }

  if (!wachtwoord.value || !bevestig.value) {
    error.value = 'Vul je nieuwe wachtwoord twee keer in.'
    return
  }

  if (wachtwoord.value.length < MIN_WACHTWOORD_LENGTE) {
    error.value = `Wachtwoord moet minstens ${MIN_WACHTWOORD_LENGTE} tekens bevatten.`
    return
  }

  if (wachtwoord.value !== bevestig.value) {
    error.value = 'De wachtwoorden komen niet overeen.'
    return
  }

  loading.value = true

  try {
    const response = await fetch('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.value, wachtwoord: wachtwoord.value }),
    })

    const data = await response.json()

    if (!response.ok) {
      error.value = data.error || 'Het wachtwoord kon niet gewijzigd worden.'
      return
    }

    gelukt.value = true
    melding.value = data.message
  } catch (err) {
    error.value = 'Kan niet verbinden met de backend. Controleer of de server draait.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-card" aria-labelledby="reset-heading">

      <div class="login-logo" aria-hidden="true">
        <div class="logo-icon"></div>
        <span class="logo-text">Stage Monitor</span>
      </div>

      <h1 class="login-title" id="reset-heading">Nieuw wachtwoord instellen</h1>
      <p class="login-sub">Kies een nieuw wachtwoord van minstens {{ MIN_WACHTWOORD_LENGTE }} tekens.</p>

      <hr class="login-divider" aria-hidden="true">

      <template v-if="!gelukt">
        <p v-if="!token" class="form-error" role="alert">
          Deze reset-link is ongeldig of onvolledig. Vraag een nieuwe link aan.
        </p>

        <form v-else @submit.prevent="handleReset" novalidate>
          <div class="form-group" style="margin-bottom: 16px;">
            <label for="wachtwoord">Nieuw wachtwoord</label>
            <input
              type="password"
              id="wachtwoord"
              name="wachtwoord"
              placeholder="••••••••"
              autocomplete="new-password"
              v-model="wachtwoord"
              required
            >
          </div>
          <div class="form-group" style="margin-bottom: 24px;">
            <label for="bevestig">Bevestig wachtwoord</label>
            <input
              type="password"
              id="bevestig"
              name="bevestig"
              placeholder="••••••••"
              autocomplete="new-password"
              v-model="bevestig"
              required
            >
          </div>

          <button type="submit" class="btn btn-primary w-full" aria-describedby="reset-error" :disabled="loading">
            {{ loading ? 'Bezig met opslaan…' : 'Wachtwoord opslaan' }}
          </button>
          <p id="reset-error" class="form-error" role="alert" aria-live="polite">{{ error }}</p>
        </form>
      </template>

      <template v-else>
        <p class="form-success" role="status" aria-live="polite">{{ melding }}</p>
      </template>

      <router-link to="/login" class="login-link">← Terug naar inloggen</router-link>

    </section>
  </main>
</template>
