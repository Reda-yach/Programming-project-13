<script setup>
import { ref } from 'vue'

const email = ref('')
const error = ref('')
const melding = ref('')
const loading = ref(false)
const verstuurd = ref(false)

async function handleAanvraag() {
  error.value = ''
  melding.value = ''

  if (!email.value) {
    error.value = 'Vul je e-mailadres in.'
    return
  }

  loading.value = true

  try {
    const response = await fetch('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value.trim() }),
    })

    const data = await response.json()

    if (!response.ok) {
      error.value = data.error || 'Er ging iets mis. Probeer het later opnieuw.'
      return
    }

    // Backend antwoordt altijd generiek (geen info-lek over bestaande mails).
    verstuurd.value = true
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
    <section class="login-card" aria-labelledby="vergeten-heading">

      <div class="login-logo" aria-hidden="true">
        <div class="logo-icon"></div>
        <span class="logo-text">Stage Monitor</span>
      </div>

      <h1 class="login-title" id="vergeten-heading">Wachtwoord vergeten</h1>
      <p class="login-sub">Vul je e-mailadres in. We sturen je een herstellink.</p>

      <hr class="login-divider" aria-hidden="true">

      <template v-if="!verstuurd">
        <form @submit.prevent="handleAanvraag" novalidate>
          <div class="form-group" style="margin-bottom: 24px;">
            <label for="email">E-mailadres</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="naam@ehb.be"
              autocomplete="email"
              v-model="email"
              required
            >
          </div>

          <button type="submit" class="btn btn-primary w-full" aria-describedby="vergeten-error" :disabled="loading">
            {{ loading ? 'Bezig met versturen…' : 'Verstuur herstellink' }}
          </button>
          <p id="vergeten-error" class="form-error" role="alert" aria-live="polite">{{ error }}</p>
        </form>
      </template>

      <template v-else>
        <p class="form-success" role="status" aria-live="polite">{{ melding }}</p>
      </template>

      <router-link to="/login" class="login-link">← Terug naar inloggen</router-link>

    </section>
  </main>
</template>
