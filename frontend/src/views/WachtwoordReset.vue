<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const token = ref('')
const nieuwWachtwoord = ref('')
const bevestigWachtwoord = ref('')
const bericht = ref('')
const fout = ref('')
const bezig = ref(false)
const tokenGeldig = ref(true)

onMounted(() => {
  token.value = route.query.token || ''
  if (!token.value) {
    tokenGeldig.value = false
    fout.value = 'Ongeldige resetlink. Vraag een nieuwe aan.'
  }
})

async function reset() {
  fout.value = ''
  bericht.value = ''

  if (!nieuwWachtwoord.value.trim()) {
    fout.value = 'Vul een nieuw wachtwoord in.'
    return
  }

  if (nieuwWachtwoord.value.length < 8) {
    fout.value = 'Wachtwoord moet minstens 8 tekens lang zijn.'
    return
  }

  if (nieuwWachtwoord.value !== bevestigWachtwoord.value) {
    fout.value = 'Wachtwoorden komen niet overeen.'
    return
  }

  bezig.value = true

  const res = await fetch('http://localhost:3000/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: token.value,
      nieuwWachtwoord: nieuwWachtwoord.value
    })
  })

  const data = await res.json()
  bezig.value = false

  if (res.ok) {
    bericht.value = data.message
    setTimeout(() => router.push('/login'), 2000)
  } else {
    fout.value = data.error
    if (data.error.includes('verlopen')) {
      tokenGeldig.value = false
    }
  }
}
</script>

<template>
  <div class="page" style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f9fafb;">
    <div class="card" style="width:400px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="font-size:20px;">■</span>
        <span style="font-weight:600;">Stage Monitor</span>
      </div>

      <h1 style="font-size:24px;font-weight:700;margin-bottom:4px;">Nieuw wachtwoord instellen</h1>
      <p class="text-secondary text-sm" style="margin-bottom:24px;">
        Kies een nieuw wachtwoord voor je account.
      </p>

      <!-- Succesbericht -->
      <div v-if="bericht" class="badge badge-green" style="padding:12px;">
        {{ bericht }} Je wordt doorgestuurd naar de loginpagina...
      </div>

      <!-- Ongeldige token -->
      <div v-else-if="!tokenGeldig">
        <p style="color:#dc2626;">{{ fout }}</p>
        <button
          class="btn btn-primary"
          style="width:100%;margin-top:16px;"
          @click="router.push('/wachtwoord-vergeten')"
        >
          Nieuwe resetlink aanvragen
        </button>
      </div>

      <!-- Reset formulier -->
      <div v-else>
        <div class="form-group">
          <label>Nieuw wachtwoord</label>
          <input
            type="password"
            v-model="nieuwWachtwoord"
            class="form-input"
            placeholder="Minstens 8 tekens"
          >
        </div>

        <div class="form-group mt-12">
          <label>Bevestig wachtwoord</label>
          <input
            type="password"
            v-model="bevestigWachtwoord"
            class="form-input"
            placeholder="Herhaal je wachtwoord"
            @keyup.enter="reset"
          >
        </div>

        <p v-if="fout" class="text-sm" style="color:#dc2626;margin-top:8px;">{{ fout }}</p>

        <button
          class="btn btn-primary"
          style="width:100%;margin-top:16px;"
          @click="reset"
          :disabled="bezig"
        >
          {{ bezig ? 'Opslaan...' : 'Wachtwoord opslaan' }}
        </button>
      </div>

      <button
        class="btn btn-secondary"
        style="width:100%;margin-top:12px;"
        @click="router.push('/login')"
      >
        Terug naar login
      </button>

    </div>
  </div>
</template>

<style scoped></style>
