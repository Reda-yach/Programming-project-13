<script setup>
import { API_URL } from '@/api'
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'

const router = useRouter()

const form = ref({
  voornaam: '',
  naam: '',
  email: '',
  telefoonnummer: '',
  studentnummer: '',
  opleiding: '',
  academiejaar: '',
})

const bezig = ref(false)
const error = ref('')
const succes = ref('')

async function opslaan() {
  error.value = ''
  succes.value = ''
  bezig.value = true
  try {
    const res = await fetch(`${API_URL}/api/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(form.value),
    })
    const data = await res.json()
    if (!res.ok) {
      error.value = data.error || 'Aanmaken mislukt.'
      return
    }
    succes.value = `Student aangemaakt. Standaardwachtwoord: student123`
    form.value = { voornaam: '', naam: '', email: '', telefoonnummer: '', studentnummer: '', opleiding: '', academiejaar: '' }
  } catch (e) {
    error.value = 'Kan niet verbinden met de backend.'
  } finally {
    bezig.value = false
  }
}
</script>

<template>
  <div class="page">
    <main class="content" style="max-width:560px;">
      <RouterLink to="/admin" class="text-sm">&larr; Terug naar beheer</RouterLink>
      <h1 class="page-title mt-8">Nieuwe student</h1>

      <form @submit.prevent="opslaan" class="card mt-24" style="display:flex;flex-direction:column;gap:12px;">
        <label>Voornaam<input v-model="form.voornaam" required /></label>
        <label>Naam<input v-model="form.naam" required /></label>
        <label>E-mail<input v-model="form.email" type="email" required /></label>
        <label>Telefoonnummer<input v-model="form.telefoonnummer" /></label>
        <label>Studentnummer<input v-model="form.studentnummer" required /></label>
        <label>Opleiding<input v-model="form.opleiding" required /></label>
        <label>Academiejaar<input v-model="form.academiejaar" placeholder="2025-2026" required /></label>

        <p v-if="error" style="color:#c00;">{{ error }}</p>
        <p v-if="succes" style="color:#080;">{{ succes }}</p>

        <button type="submit" :disabled="bezig">{{ bezig ? 'Bezig…' : 'Student aanmaken' }}</button>
      </form>
    </main>
  </div>
</template>

<style scoped>
label { display:flex; flex-direction:column; gap:4px; font-size:14px; }
input { padding:8px; border:1px solid #ccc; border-radius:6px; }
button { padding:10px; border:none; border-radius:6px; background:#2563eb; color:#fff; cursor:pointer; }
button:disabled { opacity:.6; cursor:default; }
</style>
