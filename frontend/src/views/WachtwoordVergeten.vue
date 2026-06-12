<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const email = ref('')
const bericht = ref('')
const fout = ref('')
const bezig = ref(false)

async function verstuur() {
  if (!email.value.trim()) {
    fout.value = 'Vul je e-mailadres in.'
    return
  }

  bezig.value = true
  fout.value = ''
  bericht.value = ''

  const res = await fetch('http://localhost:3000/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.value })
  })

  const data = await res.json()
  bezig.value = false

  if (res.ok) {
    bericht.value = data.message
  } else {
    fout.value = data.error
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

      <h1 style="font-size:24px;font-weight:700;margin-bottom:4px;">Wachtwoord vergeten</h1>
      <p class="text-secondary text-sm" style="margin-bottom:24px;">
        Vul je e-mailadres in en we sturen je een resetlink.
      </p>

      <div v-if="bericht" class="badge badge-green" style="margin-bottom:16px;padding:12px;">
        {{ bericht }}
      </div>

      <div v-if="!bericht">
        <div class="form-group">
          <label>E-mailadres</label>
          <input
            type="email"
            v-model="email"
            class="form-input"
            placeholder="naam@gmail.com"
            @keyup.enter="verstuur"
          >
        </div>

        <p v-if="fout" class="text-sm" style="color:#dc2626;margin-top:8px;">{{ fout }}</p>

        <button
          class="btn btn-primary"
          style="width:100%;margin-top:16px;"
          @click="verstuur"
          :disabled="bezig"
        >
          {{ bezig ? 'Versturen...' : 'Resetlink versturen' }}
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
