<script setup>
import { API_URL } from '@/api'
import { ref } from 'vue'
import TopBar from '../components/TopBar.vue'

const navLinks = [
  { label: 'Contract', to: '/bedrijf/contract' },
  { label: 'Mentor voorstellen', to: '/bedrijf/mentor-voorstel' },
]

const voornaam = ref('')
const naam = ref('')
const email = ref('')
const telefoonnummer = ref('')
const functietitel = ref('')
const bericht = ref('')
const fout = ref('')
const bezig = ref(false)

async function stelVoor() {
  bericht.value = ''
  fout.value = ''
  if (!voornaam.value || !naam.value || !email.value) {
    fout.value = 'Voornaam, naam en e-mail zijn verplicht.'
    return
  }
  bezig.value = true
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`${API_URL}/api/mentors/voorstel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        voornaam: voornaam.value,
        naam: naam.value,
        email: email.value,
        telefoonnummer: telefoonnummer.value || null,
        functietitel: functietitel.value || null,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      bericht.value = 'Mentor voorgesteld! De admin keurt het voorstel goed.'
      voornaam.value = naam.value = email.value = telefoonnummer.value = functietitel.value = ''
    } else {
      fout.value = data.error || 'Indienen mislukt.'
    }
  } catch {
    fout.value = 'Er ging iets mis.'
  } finally {
    bezig.value = false
  }
}
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />
    <main class="content">
      <h1 class="page-title">Mentor voorstellen</h1>
      <p class="text-secondary text-sm mt-8">
        Stel een mentor voor die de stagiair op de werkvloer begeleidt. De admin keurt het voorstel goed waarna de mentor toegang krijgt.
      </p>

      <div class="card mt-24">
        <div class="form-grid-2">
          <div class="form-group">
            <label>Voornaam <span style="color:#dc2626">*</span></label>
            <input type="text" v-model="voornaam" placeholder="Voornaam mentor">
          </div>
          <div class="form-group">
            <label>Naam <span style="color:#dc2626">*</span></label>
            <input type="text" v-model="naam" placeholder="Achternaam mentor">
          </div>
          <div class="form-group">
            <label>E-mail <span style="color:#dc2626">*</span></label>
            <input type="email" v-model="email" placeholder="mentor@bedrijf.be">
          </div>
          <div class="form-group">
            <label>Telefoon</label>
            <input type="tel" v-model="telefoonnummer" placeholder="+32 ...">
          </div>
          <div class="form-group">
            <label>Functietitel</label>
            <input type="text" v-model="functietitel" placeholder="bv. Senior Developer">
          </div>
        </div>

        <div v-if="bericht" class="card mt-16" style="border:1px solid #bbf7d0;background:#f0fdf4;">
          <p style="color:#15803d;">{{ bericht }}</p>
        </div>
        <div v-if="fout" class="card mt-16" style="border:1px solid #fca5a5;background:#fef2f2;">
          <p style="color:#dc2626;">{{ fout }}</p>
        </div>

        <button class="btn btn-primary mt-16" :disabled="bezig" @click="stelVoor">
          {{ bezig ? 'Bezig...' : 'Mentor voorstellen' }}
        </button>
      </div>
    </main>
  </div>
</template>
