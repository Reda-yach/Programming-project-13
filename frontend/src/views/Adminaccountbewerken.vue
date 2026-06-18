<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'

const API = 'http://localhost:3000/api'

const navLinks = ref([
  { label: 'Competenties', to: '/admin/competentiesets' },
  { label: 'Stages',       to: '/admin/stages' },
  { label: 'Accounts',     to: '/admin/accounts' },
  { label: 'Aanvragen',    to: '/admin/aanvragen' },
])

const route  = useRoute()
const router = useRouter()

// ── Form state ────────────────────────────────────────────────────────────────
const bezig          = ref(true)
const opslaan        = ref(false)
const fout           = ref('')
const succes         = ref('')
const verwijder      = ref(false)
const verwijderModal = ref(false)

const voornaam   = ref('')
const naam       = ref('')
const email      = ref('')
const afdeling   = ref('')
const rol        = ref('')
const actief     = ref(true)

const ROL_LABELS = {
  docent:    'Docent',
  commissie: 'Commissie',
  student:   'Student',
  mentor:    'Mentor',
  admin:     'Admin',
}

const rolLabel = computed(() => ROL_LABELS[rol.value] || rol.value)

function toggleActief() {
  actief.value = !actief.value
}

async function laad() {
  bezig.value = true
  fout.value  = ''
  try {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API}/gebruikers/${route.params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Gebruiker niet gevonden')
    const u      = await res.json()
    voornaam.value = u.voornaam || ''
    naam.value     = u.naam     || ''
    email.value    = u.email    || ''
    afdeling.value = u.afdeling || u.bedrijf || ''
    rol.value      = u.rol      || ''
    // actief field — if backend returns it, use it; otherwise default true
    actief.value   = u.is_actief !== undefined ? Boolean(u.is_actief) : true
  } catch (e) {
    fout.value = e.message
    console.error(e)
  } finally {
    bezig.value = false
  }
}

async function slaOp() {
  opslaan.value = true
  fout.value    = ''
  succes.value  = ''
  try {
    const token = localStorage.getItem('token')
    const body  = {
      voornaam:  voornaam.value,
      naam:      naam.value,
      email:     email.value,
      rol:       rol.value,
      is_actief: actief.value,
    }
    const res = await fetch(`${API}/gebruikers/${route.params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw new Error(data?.error || 'Opslaan mislukt.')
    }
    succes.value = 'Wijzigingen opgeslagen.'
  } catch (e) {
    fout.value = 'Opslaan mislukt: ' + e.message
    console.error(e)
  } finally {
    opslaan.value = false
  }
}

// ── Verwijderen ───────────────────────────────────────────────────────────────
function openVerwijderModal() {
  verwijderModal.value = true
}

function sluitVerwijderModal() {
  verwijderModal.value = false
}

async function verwijderAccount() {
  verwijder.value = true
  fout.value      = ''
  try {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API}/gebruikers/${route.params.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw new Error(data?.error || 'Verwijderen mislukt.')
    }
    router.push('/admin/accounts')
  } catch (e) {
    fout.value = 'Verwijderen mislukt: ' + e.message
    console.error(e)
    sluitVerwijderModal()
  } finally {
    verwijder.value = false
  }
}

onMounted(laad)
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />

    <main class="content">
      <div v-if="bezig" style="color:var(--text-secondary);">Laden…</div>
      <div v-else-if="fout && !voornaam" class="form-error">{{ fout }}</div>

      <template v-else>
        <!-- Breadcrumb -->
        <button class="breadcrumb" @click="router.push('/admin/accounts')">← Terug naar overzicht</button>

        <!-- Page title -->
        <div>
          <h1 class="page-title">Account bewerken</h1>
          <p class="page-subtitle">Pas de gegevens van {{ voornaam }} {{ naam }} aan.</p>
        </div>

        <!-- Success / error -->
        <div v-if="succes" class="form-success">{{ succes }}</div>
        <div v-if="fout"   class="form-error">{{ fout }}</div>

        <!-- Form card -->
        <div class="form-section">

          <!-- Persoonlijke gegevens -->
          <div class="form-section-title">Persoonlijke gegevens</div>

          <div class="form-grid-2">
            <div class="form-group">
              <label>Voornaam</label>
              <input v-model="voornaam" type="text" />
            </div>
            <div class="form-group">
              <label>Achternaam</label>
              <input v-model="naam" type="text" />
            </div>
          </div>

          <div class="form-group">
            <label>E-mailadres</label>
            <input v-model="email" type="email" />
          </div>

          <div class="form-group">
            <label>Afdeling / Bedrijf</label>
            <input v-model="afdeling" type="text" />
          </div>

          <hr class="card-divider" />

          <!-- Rol -->
          <div class="form-section-title" style="border:none; padding:0;">Rol(len)</div>
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span class="rol-tag">{{ rolLabel }}</span>
            <!-- "+ Rol toevoegen" is visual-only — multi-role not supported by current schema -->
            <span class="rol-add" title="Multi-rol vereist schema-aanpassing">+ Rol toevoegen</span>
          </div>

          <hr class="card-divider" />

          <!-- Status toggle -->
          <div class="form-section-title" style="border:none; padding:0;">Status</div>
          <div class="toggle" style="align-items:center;">
            <div
              class="toggle-switch"
              :class="{ on: actief }"
              @click="toggleActief"
            ></div>
            <span class="toggle-label" style="font-weight:500;">{{ actief ? 'Actief' : 'Inactief' }}</span>
            <span style="font-size:13px; color:var(--text-secondary);">
              {{ actief
                ? 'Dit account kan inloggen en het systeem gebruiken.'
                : 'Dit account heeft geen toegang tot het systeem.' }}
            </span>
          </div>

          <hr class="card-divider" />

          <!-- Action row -->
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <button class="btn btn-danger" :disabled="verwijder" @click="openVerwijderModal">
              {{ verwijder ? 'Bezig...' : 'Account verwijderen' }}
            </button>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-secondary" @click="router.push('/admin/accounts')">
                Annuleren
              </button>
              <button class="btn btn-primary" :disabled="opslaan" @click="slaOp">
                {{ opslaan ? 'Bezig...' : 'Wijzigingen opslaan' }}
              </button>
            </div>
          </div>

        </div>

        <!-- Verwijder-bevestiging -->
        <div v-if="verwijderModal" class="modal-overlay" @click.self="sluitVerwijderModal">
          <div class="modal-card modal-card-delete">
            <h2 class="modal-title modal-title-delete">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="vertical-align:-4px; margin-right:6px">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
              Account verwijderen
            </h2>

            <div class="delete-info">
              Wil je het account van <strong>{{ voornaam }} {{ naam }}</strong> echt verwijderen?<br />
              Dit kan niet ongedaan gemaakt worden.
            </div>

            <p style="font-size:13px; color:var(--text-secondary); margin-top:12px; line-height:1.5;">
              Heeft dit account nog gekoppelde evaluaties of beslissingen? Zet het dan liever op
              <em>Inactief</em> hierboven in plaats van te verwijderen.
            </p>

            <div style="display:flex; gap:8px; margin-top:24px; justify-content:flex-end;">
              <button class="btn btn-secondary" @click="sluitVerwijderModal">Annuleren</button>
              <button class="btn btn-delete" :disabled="verwijder" @click="verwijderAccount">
                {{ verwijder ? 'Bezig...' : 'Ja, verwijderen' }}
              </button>
            </div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.rol-tag {
  background: #000;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 4px;
}
.rol-add {
  background: var(--gray50);
  color: var(--text-secondary);
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid var(--border);
  cursor: not-allowed;
  opacity: 0.7;
}

/* ── Modal overlay (zelfde stijl als Competentiesets/Competentiebeheer) ───── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}
.modal-card {
  background: #fff;
  border-radius: 10px;
  padding: 32px 36px;
  width: 480px;
  max-width: calc(100vw - 40px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.12);
}
.modal-card-delete { width: 420px; }
.modal-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 20px;
  color: var(--text-primary);
}
.modal-title-delete { color: var(--red); }

.delete-info {
  background: var(--gray50);
  border-radius: 6px;
  padding: 12px 14px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}
.delete-info strong { color: var(--text-primary); }

.btn-delete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  background: var(--red);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s;
}
.btn-delete:hover { opacity: 0.88; }
.btn[disabled] { opacity: 0.4; cursor: not-allowed; }
</style>