<script setup>
import { API_URL } from '@/api'
import { ref, onMounted } from 'vue'
import TopBar from '../components/TopBar.vue'
import { navLinks } from './adminNav'

const voorstellen = ref([])
const goedgekeurd = ref([])
const bezig = ref(false)
const bericht = ref('')
const fout = ref('')

// Detail van een goedgekeurd bedrijf dat opengeklapt is.
const detail = ref(null)
const detailId = ref(null)

// Nieuw bedrijf aanmaken (admin).
const toonNieuw = ref(false)
const leegBedrijf = () => ({
  naam: '', contact_email: '', contact_telefoonnummer: '', sector: '',
  straatnaam: '', huisnummer: '', postcode: '', gemeente: '', provincie: '',
})
const nieuw = ref(leegBedrijf())

async function laad() {
  const token = localStorage.getItem('token')
  try {
    const [r1, r2] = await Promise.all([
      fetch(`${API_URL}/api/bedrijven/voorstellen`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/api/bedrijven`, { headers: { Authorization: `Bearer ${token}` } }),
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
    const res = await fetch(`${API_URL}/api/bedrijven/${bedrijfId}/goedkeuren`, {
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

// Klik op een goedgekeurd bedrijf: gegevens ophalen en in-/uitklappen.
async function toonDetail(bedrijfId) {
  if (detailId.value === bedrijfId) {
    detailId.value = null
    detail.value = null
    return
  }
  detailId.value = bedrijfId
  detail.value = null
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`${API_URL}/api/bedrijven/${bedrijfId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) detail.value = await res.json()
  } catch { /* stil falen */ }
}

async function maakBedrijf() {
  if (!nieuw.value.naam.trim() || !nieuw.value.contact_email.trim()) {
    fout.value = 'Bedrijfsnaam en contact-e-mail zijn verplicht.'
    return
  }
  bezig.value = true
  bericht.value = ''
  fout.value = ''
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`${API_URL}/api/bedrijven/aanmaken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(nieuw.value),
    })
    const data = await res.json()
    if (res.ok) {
      bericht.value = `${nieuw.value.naam} aangemaakt. Standaardwachtwoord: ${data.standaardwachtwoord}`
      nieuw.value = leegBedrijf()
      toonNieuw.value = false
      await laad()
    } else {
      fout.value = data.error || 'Aanmaken mislukt.'
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
      <h1 class="page-title">Bedrijvenbeheer</h1>

    <div v-if="bericht" class="card mt-16" style="border:1px solid #bbf7d0;background:#f0fdf4;">
      <p style="color:#15803d;">{{ bericht }}</p>
    </div>
    <div v-if="fout" class="card mt-16" style="border:1px solid #fca5a5;background:#fef2f2;">
      <p style="color:#dc2626;">{{ fout }}</p>
    </div>

    <!-- Nieuw bedrijf aanmaken -->
    <div class="mt-24">
      <button class="btn btn-primary" @click="toonNieuw = !toonNieuw">
        {{ toonNieuw ? 'Annuleren' : '+ Nieuw bedrijf aanmaken' }}
      </button>
    </div>
    <section v-if="toonNieuw" class="card mt-12">
      <h2 class="form-section-title">Nieuw bedrijf</h2>
      <p class="text-secondary text-sm mt-4 mb-12">Dit bedrijf is meteen goedgekeurd en krijgt een eigen login (wachtwoord <strong>bedrijf123</strong>).</p>
      <div class="form-grid-2">
        <div class="form-group form-group-full">
          <label>Bedrijfsnaam <span style="color:#dc2626">*</span></label>
          <input type="text" v-model="nieuw.naam" class="form-input" placeholder="Naam van het bedrijf">
        </div>
        <div class="form-group">
          <label>Contact-e-mail <span style="color:#dc2626">*</span></label>
          <input type="email" v-model="nieuw.contact_email" class="form-input" placeholder="contact@bedrijf.be">
        </div>
        <div class="form-group">
          <label>Telefoon</label>
          <input type="tel" v-model="nieuw.contact_telefoonnummer" class="form-input" placeholder="+32 ...">
        </div>
        <div class="form-group">
          <label>Sector</label>
          <input type="text" v-model="nieuw.sector" class="form-input" placeholder="bv. ICT">
        </div>
        <div class="form-group">
          <label>Straatnaam</label>
          <input type="text" v-model="nieuw.straatnaam" class="form-input">
        </div>
        <div class="form-group">
          <label>Huisnummer</label>
          <input type="text" v-model="nieuw.huisnummer" class="form-input">
        </div>
        <div class="form-group">
          <label>Postcode</label>
          <input type="text" v-model="nieuw.postcode" class="form-input">
        </div>
        <div class="form-group">
          <label>Gemeente</label>
          <input type="text" v-model="nieuw.gemeente" class="form-input">
        </div>
        <div class="form-group">
          <label>Provincie</label>
          <input type="text" v-model="nieuw.provincie" class="form-input">
        </div>
      </div>
      <button class="btn btn-primary mt-12" :disabled="bezig" @click="maakBedrijf">
        {{ bezig ? 'Bezig…' : 'Bedrijf aanmaken' }}
      </button>
    </section>

    <!-- Voorgestelde bedrijven -->
    <section class="card mt-24">
      <h2 class="form-section-title">Wacht op goedkeuring ({{ voorstellen.length }})</h2>
      <p v-if="!voorstellen.length" class="text-secondary text-sm mt-8">Geen openstaande voorstellen.</p>
      <div v-else style="overflow-x:auto;">
      <table class="w-full mt-12" style="border-collapse:collapse;">
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
      </div>
    </section>

    <!-- Goedgekeurde bedrijven -->
    <section class="card mt-24">
      <h2 class="form-section-title">Goedgekeurde bedrijven ({{ goedgekeurd.length }})</h2>
      <p v-if="!goedgekeurd.length" class="text-secondary text-sm mt-8">Geen bedrijven goedgekeurd.</p>
      <ul v-else class="mt-8" style="list-style:none;padding:0;">
        <li v-for="b in goedgekeurd" :key="b.bedrijf_id" style="border-bottom:1px solid var(--border);">
          <div
            style="padding:8px 0;cursor:pointer;display:flex;justify-content:space-between;align-items:center;"
            @click="toonDetail(b.bedrijf_id)"
          >
            <span>{{ b.naam }}</span>
            <span class="text-secondary text-sm">{{ detailId === b.bedrijf_id ? '▲' : '▼' }}</span>
          </div>

          <div v-if="detailId === b.bedrijf_id" style="padding:4px 0 12px;font-size:14px;line-height:1.7;">
            <template v-if="detail">
              <p><strong>Sector:</strong> {{ detail.sector || '—' }}</p>
              <p>
                <strong>Adres:</strong>
                {{ [detail.straatnaam, detail.huisnummer].filter(Boolean).join(' ') || '—' }}<template v-if="detail.postcode || detail.gemeente">, {{ [detail.postcode, detail.gemeente].filter(Boolean).join(' ') }}</template><template v-if="detail.provincie"> ({{ detail.provincie }})</template>
              </p>
              <p><strong>Contact-e-mail:</strong> {{ detail.contact_email || '—' }}</p>
              <p><strong>Telefoon:</strong> {{ detail.contact_telefoonnummer || '—' }}</p>
            </template>
            <p v-else class="text-secondary text-sm">Laden…</p>
          </div>
        </li>
      </ul>
    </section>
    </main>
  </div>
</template>
