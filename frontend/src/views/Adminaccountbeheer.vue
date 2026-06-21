<script setup>
import { API_URL } from '@/api'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import { navLinks } from './adminNav'

const API = `${API_URL}/api`

const router        = useRouter()
const gebruikers    = ref([])
const bezig         = ref(true)
const fout          = ref('')
const zoekterm      = ref('')
const mentorVoorstellen = ref([])
const voorstelBericht   = ref('')
const commissieleden = ref(JSON.parse(localStorage.getItem('commissieleden') || '{}'))
const afdelingen     = ref(JSON.parse(localStorage.getItem('afdelingen')     || '{}'))

// Rol badge colours matching the Figma
const ROL_BADGE = {
  docent:    'badge-gray',
  commissie: 'badge-blue',
  student:   'badge-green',
  mentor:    'badge-orange',
  admin:     'badge-gray',
}

function rolLabel(rol) {
  return rol ? rol.charAt(0).toUpperCase() + rol.slice(1) : '—'
}

function rolBadgeClass(rol) {
  return ROL_BADGE[rol] || 'badge-gray'
}

// "Afdeling / Bedrijf" — per rol ander veld
function afdelingBedrijf(u) {
  if (u.rol === 'mentor')  return afdelingen.value[u.gebruiker_id] || u.bedrijf   || '—'
  if (u.rol === 'student') return u.opleiding || '—'
  return afdelingen.value[u.gebruiker_id] || u.afdeling || '—'
}

const gefilterdeGebruikers = computed(() => {
  const q = zoekterm.value.toLowerCase().trim()
  return gebruikers.value
    .filter(u => u.rol !== 'admin')
    .filter(u => !q ||
      `${u.voornaam} ${u.naam}`.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.rol?.toLowerCase().includes(q)
    )
})

async function laad() {
  bezig.value = true
  fout.value  = ''
  try {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API}/gebruikers`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw new Error(data?.error || 'Gebruikers konden niet geladen worden.')
    }
    gebruikers.value = await res.json()

    // Mentor-voorstellen ophalen (admin keurt ze goed of af).
    const mvRes = await fetch(`${API}/mentors/voorstellen`, { headers: { Authorization: `Bearer ${token}` } })
    if (mvRes.ok) {
      const alle = await mvRes.json()
      mentorVoorstellen.value = alle.filter(m => m.status === 'voorgesteld')
    }
  } catch (e) {
    fout.value = 'Gebruikers konden niet geladen worden.'
    console.error(e)
  } finally {
    bezig.value = false
  }
}

// Mentor-voorstel goedkeuren ('goedkeuren') of afkeuren ('afkeuren').
async function verwerkMentor(voorstelId, naam, actie) {
  if (!confirm(`Mentor "${naam}" ${actie}?`)) return
  voorstelBericht.value = ''
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`${API}/mentors/voorstellen/${voorstelId}/${actie}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (res.ok) {
      voorstelBericht.value = actie === 'goedkeuren'
        ? `${naam} goedgekeurd. Standaardwachtwoord: ${data.standaardwachtwoord}`
        : `${naam} verwijderd.`
      await laad()
    } else {
      voorstelBericht.value = data.error || 'Mislukt.'
    }
  } catch {
    voorstelBericht.value = 'Er ging iets mis.'
  }
}

function naarBewerken(gebruiker) {
  router.push({
    name: 'admin-account-bewerken',
    params: { id: gebruiker.gebruiker_id },
    state: { listAfdeling: afdelingen.value[gebruiker.gebruiker_id] || gebruiker.afdeling || gebruiker.bedrijf || '' },
  })
}

onMounted(laad)
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />

    <main class="content">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="page-title">Accountbeheer</h1>
          <p class="page-subtitle">Beheer gebruikers, rollen en toegang tot het systeem.</p>
        </div>
        <button class="btn btn-primary" @click="router.push('/admin/accounts/nieuw')">
          + Nieuw account
        </button>
      </div>

      <!-- Zoeken -->
      <div class="zoek-wrapper mt-16">
        <span class="zoek-icon">🔍</span>
        <input
          v-model="zoekterm"
          type="text"
          placeholder="Zoek op naam, e-mail of rol…"
          class="zoek-input"
        />
      </div>

      <!-- Mentor-voorstellen -->
      <section v-if="mentorVoorstellen.length || voorstelBericht" class="card mt-16" style="padding:16px 20px;">
        <h2 class="form-section-title">Mentor-voorstellen ({{ mentorVoorstellen.length }})</h2>
        <p v-if="voorstelBericht" class="text-sm mt-8" style="color:#15803d;">{{ voorstelBericht }}</p>
        <p v-if="!mentorVoorstellen.length" class="text-secondary text-sm mt-8">Geen openstaande mentor-voorstellen.</p>
        <div v-else class="table-wrapper mt-12">
          <table class="responsive-table">
            <thead>
              <tr>
                <th>Mentor</th>
                <th>Bedrijf</th>
                <th>E-mail</th>
                <th>Functie</th>
                <th>Acties</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in mentorVoorstellen" :key="m.voorstel_id">
                <td class="td-name" data-label="Mentor">{{ m.voornaam }} {{ m.naam }}</td>
                <td style="color:var(--text-secondary);" data-label="Bedrijf">{{ m.bedrijf_naam }}</td>
                <td style="color:var(--text-secondary);" data-label="E-mail">{{ m.email }}</td>
                <td style="color:var(--text-secondary);" data-label="Functie">{{ m.functietitel || '—' }}</td>
                <td data-label="">
                  <div style="display:flex; gap:6px;">
                    <button class="btn btn-primary btn-sm" @click="verwerkMentor(m.voorstel_id, `${m.voornaam} ${m.naam}`, 'goedkeuren')">Goedkeuren</button>
                    <button class="btn btn-secondary btn-sm" @click="verwerkMentor(m.voorstel_id, `${m.voornaam} ${m.naam}`, 'afkeuren')">Afkeuren</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Loading / error -->
      <div v-if="bezig" class="text-secondary">Laden…</div>
      <div v-else-if="fout" class="form-error">{{ fout }}</div>

      <!-- Table -->
      <div v-else class="table-wrapper">
        <table class="responsive-table">
          <thead>
            <tr>
              <th>Naam</th>
              <th>E-mail</th>
              <th>Rol(len)</th>
              <th>Afdeling / Bedrijf</th>
              <th>Acties</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="gefilterdeGebruikers.length === 0">
              <td colspan="5" style="text-align:center; color:var(--text-secondary);">
                Geen gebruikers gevonden.
              </td>
            </tr>
            <tr v-for="u in gefilterdeGebruikers" :key="u.gebruiker_id">
              <td class="td-name" data-label="Naam">{{ u.voornaam }} {{ u.naam }}</td>
              <td style="color:var(--text-secondary);" data-label="E-mail">{{ u.email }}</td>
              <td data-label="Rol">
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                  <span :class="['badge', 'badge-pill', rolBadgeClass(u.rol)]">
                    {{ rolLabel(u.rol) }}
                  </span>
                  <span v-if="u.commissielid || commissieleden[u.gebruiker_id]" class="badge badge-pill badge-blue">
                    Commissie
                  </span>
                </div>
              </td>
              <td style="color:var(--text-secondary);" data-label="Afdeling/Bedrijf">{{ afdelingBedrijf(u) }}</td>
              <td data-label="">
                <button
                  class="btn btn-secondary btn-sm"
                  @click="naarBewerken(u)"
                >
                  Bewerken
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>

<style scoped>
.text-secondary { color: var(--text-secondary); }

.zoek-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  max-width: 360px;
}
.zoek-icon { font-size: 13px; color: var(--text-secondary); }
.zoek-input {
  border: none;
  outline: none;
  font-size: 13px;
  color: var(--text-primary);
  width: 100%;
  background: transparent;
}

@media (max-width: 640px) {
  .zoek-wrapper { max-width: none; }
}
</style>