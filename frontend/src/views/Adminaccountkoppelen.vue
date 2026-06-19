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

// ── Stage detail ─────────────────────────────────────────────────────────────
const stage     = ref(null)
const bezig     = ref(true)
const fout      = ref('')
const opslaan   = ref(false)
const geslaagd  = ref(false)

// ── Alle gebruikers ───────────────────────────────────────────────────────────
const alleGebruikers = ref([])

// ── Docent selectie ───────────────────────────────────────────────────────────
const docentZoek      = ref('')
const docentOpen      = ref(false)
const geselecteerdDocent = ref(null)

// ── Mentor selectie ───────────────────────────────────────────────────────────
const mentorZoek      = ref('')
const mentorOpen      = ref(false)
const geselecteerdMentor = ref(null)

// ── Filtered lists ────────────────────────────────────────────────────────────
// Filtert ook op docent_id / mentor_id aanwezig: een gebruiker met rol "docent"
// zonder rij in de docent-tabel (nog) kan niet gekoppeld worden aan een stage.
const docentenLijst = computed(() =>
  alleGebruikers.value
    .filter(u => u.rol === 'docent' && u.docent_id != null)
    .filter(u => {
      const q = docentZoek.value.toLowerCase()
      return !q ||
        u.voornaam?.toLowerCase().includes(q) ||
        u.naam?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
    })
)

const mentorLijst = computed(() =>
  alleGebruikers.value
    .filter(u => u.rol === 'mentor' && u.mentor_id != null)
    .filter(u => {
      const q = mentorZoek.value.toLowerCase()
      return !q ||
        u.voornaam?.toLowerCase().includes(q) ||
        u.naam?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
    })
)

function volledigeNaam(u) {
  return `${u.voornaam || ''} ${u.naam || ''}`.trim()
}

function initiaalNaam(u) {
  const i = u.voornaam ? u.voornaam[0] + '.' : ''
  return `${i} ${u.naam || ''}`.trim()
}

function formatPeriode(start, eind) {
  if (!start || !eind) return '—'
  const fmt = (d) => {
    const dt = new Date(d)
    return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`
  }
  return `${fmt(start)} – ${fmt(eind)}`
}

// ── Mentor hint: naam die student vermeldde ───────────────────────────────────
const mentorHint = computed(() => {
  if (!stage.value) return null
  // mentor was al automatisch aangemaakt bij aanvraag
  if (stage.value.mentor_voornaam) {
    return `${stage.value.mentor_voornaam[0]}. ${stage.value.mentor_naam}`
  }
  return null
})

async function laad() {
  bezig.value = true
  fout.value  = ''
  try {
    const token = localStorage.getItem('token')
    const [stageRes, gebruikersRes] = await Promise.all([
      fetch(`${API}/stages/${route.params.id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API}/gebruikers`,                { headers: { Authorization: `Bearer ${token}` } }),
    ])
    if (!stageRes.ok)      throw new Error('Stage niet gevonden')
    if (!gebruikersRes.ok) throw new Error('Gebruikers konden niet geladen worden')

    stage.value          = await stageRes.json()
    alleGebruikers.value = await gebruikersRes.json()

    // Pre-select huidig gekoppelde docent/mentor als die er al is.
    // Belangrijk: stage.docent_id / stage.mentor_id zijn docent_id / mentor_id
    // (FK's naar de docent- en mentor-tabel), GEEN gebruiker_id — daarom
    // matchen we hier op u.docent_id / u.mentor_id, niet op u.gebruiker_id.
    if (stage.value.docent_id) {
      geselecteerdDocent.value = alleGebruikers.value.find(u => u.docent_id === stage.value.docent_id) || null
    }
    if (stage.value.mentor_id) {
      geselecteerdMentor.value = alleGebruikers.value.find(u => u.mentor_id === stage.value.mentor_id) || null
    }
  } catch (e) {
    fout.value = e.message
    console.error(e)
  } finally {
    bezig.value = false
  }
}

function selecteerDocent(u) {
  geselecteerdDocent.value = u
  docentOpen.value = false
  docentZoek.value = ''
}

function selecteerMentor(u) {
  geselecteerdMentor.value = u
  mentorOpen.value = false
  mentorZoek.value = ''
}

async function slaOp() {
  if (!geselecteerdDocent.value && !geselecteerdMentor.value) return
  opslaan.value = true
  fout.value    = ''
  try {
    const token = localStorage.getItem('token')
    const s     = stage.value
    const body  = {
      stagetitel:  s.stagetitel,
      beschrijving: s.beschrijving,
      startdatum:  s.startdatum?.split('T')[0],
      einddatum:   s.einddatum?.split('T')[0],
      bedrijf_id:  s.bedrijf_id,
      status:      s.status,
      // stage.docent_id / stage.mentor_id zijn FK's naar docent.docent_id en
      // mentor.mentor_id — NIET naar gebruiker.gebruiker_id. /api/gebruikers
      // geeft per gebruiker ook diens docent_id / mentor_id mee (via een LEFT
      // JOIN), dus we gebruiken die en niet gebruiker_id.
      docent_id:   geselecteerdDocent.value?.docent_id ?? s.docent_id ?? null,
      mentor_id:   geselecteerdMentor.value?.mentor_id ?? s.mentor_id ?? null,
    }
    const res = await fetch(`${API}/stages/${s.stage_id}`, {
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
    geslaagd.value = true
  } catch (e) {
    fout.value = 'Opslaan mislukt: ' + e.message
    console.error(e)
  } finally {
    opslaan.value = false
  }
}

onMounted(laad)
</script>

<template>
  <!-- ── Success modal ──────────────────────────────────────────────────────── -->
  <div v-if="geslaagd" class="success-page">
    <div class="success-card">
      <div class="success-icon">✓</div>
      <div class="success-title">Stage is gekoppeld</div>
      <button class="btn btn-primary" @click="router.push('/admin/stages')">
        Terug naar stagebeheer
      </button>
    </div>
  </div>

  <!-- ── Hoofd pagina ───────────────────────────────────────────────────────── -->
  <div v-else class="page">
    <TopBar :links="navLinks" />

    <main class="content">
      <div v-if="bezig" class="text-secondary">Laden…</div>
      <div v-else-if="fout && !stage" class="form-error">{{ fout }}</div>

      <template v-else-if="stage">
        <!-- Breadcrumb -->
        <button class="breadcrumb" @click="router.push('/admin/stages')">← Terug naar Stagebeheer</button>

        <!-- Stage info banner -->
        <div class="stage-banner">
          <div class="banner-item">
            <span class="banner-label">Student</span>
            <span class="banner-value">{{ stage.student_voornaam }} {{ stage.student_naam }}</span>
          </div>
          <div class="banner-item">
            <span class="banner-label">Opleiding</span>
            <span class="banner-value">{{ stage.opleiding || '—' }}</span>
          </div>
          <div class="banner-item">
            <span class="banner-label">Bedrijf</span>
            <span class="banner-value">{{ stage.bedrijf || '—' }}</span>
          </div>
          <div class="banner-item">
            <span class="banner-label">Periode</span>
            <span class="banner-value">{{ formatPeriode(stage.startdatum, stage.einddatum) }}</span>
          </div>
        </div>

        <!-- Page title -->
        <div>
          <h1 class="page-title" style="font-size:22px;">Accounts koppelen</h1>
          <p class="page-subtitle">Koppel de begeleidende docent en bedrijfsmentor aan deze stage.</p>
        </div>

        <!-- Error -->
        <div v-if="fout" class="form-error">{{ fout }}</div>

        <!-- Two panels -->
        <div class="koppel-grid">
          <!-- ── Docent panel ── -->
          <div class="card" style="display:flex; flex-direction:column; gap:16px;">
            <div>
              <div class="card-title">Begeleidende docent</div>
              <p style="font-size:13px; color:var(--text-secondary); margin-top:4px;">
                Koppel een docent van de school aan deze stage.
              </p>
            </div>

            <!-- Geselecteerde docent badge -->
            <div v-if="geselecteerdDocent" class="geselecteerd-badge">
              <div>
                <div class="gs-naam">{{ volledigeNaam(geselecteerdDocent) }}</div>
                <div class="gs-sub">{{ geselecteerdDocent.email }}</div>
              </div>
              <button class="gs-remove" @click="geselecteerdDocent = null">✕</button>
            </div>

            <!-- Zoek dropdown -->
            <div class="form-group">
              <label>Kies een docent</label>
              <div class="dropdown-trigger" @click="docentOpen = !docentOpen">
                <span style="color:var(--text-secondary); font-size:13px;">Zoek op naam of e-mail...</span>
                <span style="color:var(--text-secondary);">▾</span>
              </div>
              <div v-if="docentOpen" class="dropdown-panel">
                <input
                  v-model="docentZoek"
                  type="text"
                  placeholder="Zoek..."
                  class="dropdown-search"
                  @click.stop
                />
                <div class="dropdown-list">
                  <div
                    v-for="u in docentenLijst"
                    :key="u.gebruiker_id"
                    class="dropdown-item"
                    :class="{ highlighted: geselecteerdDocent?.gebruiker_id === u.gebruiker_id }"
                    @click="selecteerDocent(u)"
                  >
                    <div>
                      <div class="gs-naam">{{ initiaalNaam(u) }}</div>
                      <div class="gs-sub">{{ u.email }} · Docent</div>
                    </div>
                    <span class="selecteer-badge">Selecteer</span>
                  </div>
                  <div v-if="docentenLijst.length === 0" class="dropdown-leeg">Geen resultaten</div>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Mentor panel ── -->
          <div class="card" style="display:flex; flex-direction:column; gap:16px;">
            <div>
              <div class="card-title">Bedrijfsmentor</div>
              <p style="font-size:13px; color:var(--text-secondary); margin-top:4px;">
                Koppel het account van de bedrijfsmentor.
              </p>
            </div>

            <!-- Hint banner -->
            <div v-if="mentorHint" class="hint-banner">
              <span>ℹ️</span>
              <span>Student vermeldde '{{ mentorHint }}' in de aanvraag. Zoek het bijhorende account.</span>
            </div>

            <!-- Geselecteerde mentor badge -->
            <div v-if="geselecteerdMentor" class="geselecteerd-badge">
              <div>
                <div class="gs-naam">{{ volledigeNaam(geselecteerdMentor) }}</div>
                <div class="gs-sub">{{ geselecteerdMentor.email }}</div>
              </div>
              <button class="gs-remove" @click="geselecteerdMentor = null">✕</button>
            </div>

            <!-- Zoek dropdown -->
            <div class="form-group">
              <label>Kies een mentor</label>
              <div class="dropdown-trigger" @click="mentorOpen = !mentorOpen">
                <span style="color:var(--text-secondary); font-size:13px;">Zoek op naam of e-mail...</span>
                <span style="color:var(--text-secondary);">▾</span>
              </div>
              <div v-if="mentorOpen" class="dropdown-panel">
                <input
                  v-model="mentorZoek"
                  type="text"
                  placeholder="Zoek..."
                  class="dropdown-search"
                  @click.stop
                />
                <div class="dropdown-list">
                  <div
                    v-for="u in mentorLijst"
                    :key="u.gebruiker_id"
                    class="dropdown-item"
                    :class="{ highlighted: geselecteerdMentor?.gebruiker_id === u.gebruiker_id }"
                    @click="selecteerMentor(u)"
                  >
                    <div>
                      <div class="gs-naam">{{ initiaalNaam(u) }}</div>
                      <div class="gs-sub">{{ u.email }} · Mentor</div>
                    </div>
                    <span class="selecteer-badge">Selecteer</span>
                  </div>
                  <div v-if="mentorLijst.length === 0" class="dropdown-leeg">Geen resultaten</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Save button -->
        <div style="display:flex; justify-content:flex-end;">
          <button
            class="btn btn-primary"
            :disabled="opslaan"
            @click="slaOp"
          >
            {{ opslaan ? 'Bezig...' : 'Koppeling opslaan' }}
          </button>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.text-secondary { color: var(--text-secondary); }

/* Success screen */
.success-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #fff;
}
.success-card {
  width: 560px;
  padding: 48px;
  border: 1px solid var(--border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  text-align: center;
}
.success-icon {
  width: 80px;
  height: 80px;
  background: var(--green);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 32px;
  font-weight: 700;
}
.success-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary);
}

/* Stage banner */
.stage-banner {
  display: flex;
  gap: 40px;
  background: var(--gray50);
  border-radius: 8px;
  padding: 20px 24px;
  border: 1px solid var(--border);
}
.banner-item { display: flex; flex-direction: column; gap: 4px; }
.banner-label { font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; }
.banner-value { font-size: 14px; font-weight: 600; color: var(--text-primary); }

/* Two-col grid */
.koppel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

/* Hint banner */
.hint-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #E0EAFF;
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 12px;
  color: #1E64E6;
}

/* Selected user badge */
.geselecteerd-badge {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--gray50);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 14px;
}
.gs-naam { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.gs-sub  { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }
.gs-remove {
  font-size: 12px;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
}
.gs-remove:hover { color: var(--red); }

/* Dropdown */
.dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  background: #fff;
}
.dropdown-trigger:hover { border-color: #aaa; }
.dropdown-panel {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  margin-top: 4px;
}
.dropdown-search {
  width: 100%;
  padding: 10px 14px;
  border: none;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
  outline: none;
}
.dropdown-list { max-height: 200px; overflow-y: auto; }
.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
}
.dropdown-item:last-child { border-bottom: none; }
.dropdown-item:hover, .dropdown-item.highlighted { background: var(--gray50); }
.dropdown-leeg { padding: 12px 14px; font-size: 13px; color: var(--text-secondary); }
.selecteer-badge {
  background: #000;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 9999px;
  white-space: nowrap;
}
</style>