<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import { navLinks } from './adminNav'

const API = 'http://localhost:3000/api'

const router        = useRouter()
const gebruikers    = ref([])
const bezig         = ref(true)
const fout          = ref('')
const zoekterm      = ref('')
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
  } catch (e) {
    fout.value = 'Gebruikers konden niet geladen worden.'
    console.error(e)
  } finally {
    bezig.value = false
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

      <!-- Loading / error -->
      <div v-if="bezig" class="text-secondary">Laden…</div>
      <div v-else-if="fout" class="form-error">{{ fout }}</div>

      <!-- Table -->
      <div v-else class="table-wrapper">
        <table>
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
              <td class="td-name">{{ u.voornaam }} {{ u.naam }}</td>
              <td style="color:var(--text-secondary);">{{ u.email }}</td>
              <td>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                  <span :class="['badge', 'badge-pill', rolBadgeClass(u.rol)]">
                    {{ rolLabel(u.rol) }}
                  </span>
                  <span v-if="u.commissielid || commissieleden[u.gebruiker_id]" class="badge badge-pill badge-blue">
                    Commissie
                  </span>
                </div>
              </td>
              <td style="color:var(--text-secondary);">{{ afdelingBedrijf(u) }}</td>
              <td>
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
</style>