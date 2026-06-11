<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const email = ref('')
const wachtwoord = ref('')
const error = ref('')

// Bestemming per rol. De backend bepaalt de rol — de frontend leidt die
// NIET af uit het e-mailadres (dat is onbetrouwbaar en onveilig).
const bestemmingPerRol = {
  student:   '/student',
  docent:    '/docent',
  mentor:    '/mentor',
  admin:     '/admin',
  commissie: '/commissie',
}

async function handleLogin() {
  error.value = ''

  if (!email.value || !wachtwoord.value) {
    error.value = 'Vul je e-mailadres en wachtwoord in.'
    return
  }

  try {
    const res = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, wachtwoord: wachtwoord.value }),
    })
    const data = await res.json()

    if (!res.ok) {
      error.value = data.error || 'Aanmelden mislukt. Controleer je gegevens.'
      return
    }

    // Token + gebruiker bewaren voor de route guard en de andere pagina's
    localStorage.setItem('token', data.token)
    localStorage.setItem('gebruiker', JSON.stringify(data.gebruiker))

    const bestemming = bestemmingPerRol[data.gebruiker.rol]
    if (!bestemming) {
      error.value = 'Onbekende rol. Neem contact op met de beheerder.'
      return
    }

    router.push(bestemming)
  } catch (e) {
    error.value = 'Kan geen verbinding maken met de server.'
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

        <button type="submit" class="btn btn-primary w-full" aria-describedby="login-error">
          Log in
        </button>
        <p id="login-error" role="alert" aria-live="polite">{{ error }}</p>
      </form>

      <router-link to="/wachtwoord-vergeten" class="login-link">Wachtwoord vergeten? →</router-link>

    </section>
  </main>
</template>

