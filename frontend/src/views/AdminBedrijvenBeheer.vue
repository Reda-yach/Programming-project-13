<script setup>
import { ref, onMounted } from 'vue'

const voorstellen = ref([])
const goedgekeurd = ref([])
const bezig = ref(false)
const bericht = ref('')
const fout = ref('')

async function laad() {
  const token = localStorage.getItem('token')
  try {
    const [r1, r2] = await Promise.all([
      fetch('http://localhost:3000/api/bedrijven/voorstellen', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('http://localhost:3000/api/bedrijven', { headers: { Authorization: `Bearer ${token}` } }),
    ])
    if (r1.ok) voorstellen.value = await r1.json()
    if (r2.ok) {
      const alle = await r2.json()
      goedgekeurd.value = alle.filter(b => b.status === 'goedgekeurd')
    }
  } catch {
    fout.value = 'Ophalen mislukt.'
  }
}

onMounted(laad)

async function keurGoed(bedrijfId, naam) {
  if (!confirm(`Bedrijf "${naam}" goedkeuren en een account aanmaken?`)) return
  bezig.value = true
  bericht.value = ''
  fout.value = ''
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/bedrijven/${bedrijfId}/goedkeuren`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (res.ok) {
      bericht.value = `${naam} goedgekeurd. Standaardwachtwoord: ${data.standaardwachtwoord}`
      await laad()
    } else {
      fout.value = data.error || 'Goedkeuren mislukt.'
    }
  } catch {
    fout.value = 'Er ging iets mis.'
  } finally {
    bezig.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="page-title">Bedrijvenbeheer</h1>

    <div v-if="bericht" class="card mt-16" style="border:1px solid #bbf7d0;background:#f0fdf4;">
      <p style="color:#15803d;">{{ bericht }}</p>
    </div>
    <div v-if="fout" class="card mt-16" style="border:1px solid #fca5a5;background:#fef2f2;">
      <p style="color:#dc2626;">{{ fout }}</p>
    </div>

    <!-- Voorgestelde bedrijven -->
    <section class="card mt-24">
      <h2 class="form-section-title">Wacht op goedkeuring ({{ voorstellen.length }})</h2>
      <p v-if="!voorstellen.length" class="text-secondary text-sm mt-8">Geen openstaande voorstellen.</p>
      <table v-else class="w-full mt-12" style="border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid var(--border);">
            <th class="text-left text-sm" style="padding:8px 12px;">Naam</th>
            <th class="text-left text-sm" style="padding:8px 12px;">Contact-e-mail</th>
            <th class="text-left text-sm" style="padding:8px 12px;">Telefoon</th>
            <th style="padding:8px 12px;"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in voorstellen" :key="b.bedrijf_id" style="border-bottom:1px solid var(--border);">
            <td style="padding:8px 12px;">{{ b.naam }}</td>
            <td style="padding:8px 12px;">{{ b.contact_email || '—' }}</td>
            <td style="padding:8px 12px;">{{ b.contact_telefoonnummer || '—' }}</td>
            <td style="padding:8px 12px;">
              <button class="btn btn-primary" :disabled="bezig" @click="keurGoed(b.bedrijf_id, b.naam)" style="font-size:13px;padding:4px 12px;">
                Goedkeuren
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Goedgekeurde bedrijven -->
    <section class="card mt-24">
      <h2 class="form-section-title">Goedgekeurde bedrijven ({{ goedgekeurd.length }})</h2>
      <p v-if="!goedgekeurd.length" class="text-secondary text-sm mt-8">Geen bedrijven goedgekeurd.</p>
      <ul v-else class="mt-8" style="list-style:none;padding:0;">
        <li v-for="b in goedgekeurd" :key="b.bedrijf_id" style="padding:6px 0;border-bottom:1px solid var(--border);">
          {{ b.naam }}
        </li>
      </ul>
    </section>
  </div>
</template>
