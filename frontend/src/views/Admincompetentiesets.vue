<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'

// ─── Nav ────────────────────────────────────────────────────────────────────
const navLinks = ref([
  { label: 'Competenties', to: '/admin/competentiesets' },
  { label: 'Stages',       to: '/admin/stages' },
  { label: 'Accounts',     to: '/admin/accounts' },
  { label: 'Aanvragen',    to: '/admin/aanvragen' },
])

const router = useRouter()

// ─── Sets ────────────────────────────────────────────────────────────────────
const sets        = ref([])
const bezig       = ref(false)
const bericht     = ref('')
const berichtType = ref('')

// ─── Filters ─────────────────────────────────────────────────────────────────
const filterOpleiding = ref('')
const filterJaar      = ref('')

// ─── Modal: toevoegen ────────────────────────────────────────────────────────
const toonAddModal = ref(false)
const modalSet     = ref({ naam: '', opleiding: '', jaar: '' })
const modalFout    = ref('')

// ─── Modal: verwijderen ──────────────────────────────────────────────────────
const toonDeleteModal = ref(false)
const teVerwijderen   = ref(null)

// ─── Uitgeklapte rijen ───────────────────────────────────────────────────────
const uitgeklapt = ref(new Set())

// ─── Computed ────────────────────────────────────────────────────────────────
const gefilterdesets = computed(() =>
  sets.value.filter(s => {
    const oplMatch  = !filterOpleiding.value || s.opleiding === filterOpleiding.value
    const jaarMatch = !filterJaar.value      || s.jaar      === filterJaar.value
    return oplMatch && jaarMatch
  })
)

const uniekOpleidingen = computed(() => [...new Set(sets.value.map(s => s.opleiding))])
const uniekJaren       = computed(() => [...new Set(sets.value.map(s => s.jaar))])

const academiejaarOpties = computed(() => {
  const huidigJaar = new Date().getFullYear()
  const opties = []
  for (let j = huidigJaar - 2; j <= huidigJaar + 3; j++) {
    opties.push(`${j}-${j + 1}`)
  }
  return opties
})

// ─── Status helpers ───────────────────────────────────────────────────────────
function totaalGewicht(set) {
  return (set.competenties || []).reduce((som, c) => som + Number(c.gewicht), 0)
}

function setStatus(set) {
  const comp = set.competenties || []
  if (comp.length === 0) return 'leeg'
  return totaalGewicht(set) === 100 ? 'compleet' : 'onvolledig'
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────
onMounted(() => laadSets())

// ─── API helpers ─────────────────────────────────────────────────────────────
function token() {
  return localStorage.getItem('token')
}

async function laadSets() {
  bezig.value = true
  try {
    const res  = await fetch('http://localhost:3000/api/competentiesets', {
      headers: { Authorization: `Bearer ${token()}` },
    })
    sets.value = await res.json()
  } catch {
    toonBericht('Competentiesets konden niet geladen worden.', 'error')
  } finally {
    bezig.value = false
  }
}

// ─── Uitklappen ──────────────────────────────────────────────────────────────
function toggleUitklap(id) {
  const s = new Set(uitgeklapt.value)
  s.has(id) ? s.delete(id) : s.add(id)
  uitgeklapt.value = s
}

// ─── Toevoegen ───────────────────────────────────────────────────────────────
function openToevoegen() {
  modalSet.value  = { naam: '', opleiding: '', jaar: '' }
  modalFout.value = ''
  toonAddModal.value = true
}

function sluitAddModal() {
  toonAddModal.value = false
}

async function slaSetOp() {
  const { naam, opleiding, jaar } = modalSet.value
  if (!naam.trim() || !opleiding.trim() || !jaar.trim()) {
    modalFout.value = 'Alle velden zijn verplicht.'
    return
  }
  try {
    const res  = await fetch('http://localhost:3000/api/competentiesets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ naam, opleiding, jaar }),
    })
    const data = await res.json()
    if (res.ok) {
      sluitAddModal()
      await laadSets()
      toonBericht('Competentieset toegevoegd.', 'success')
    } else {
      modalFout.value = data.error || 'Opslaan mislukt.'
    }
  } catch {
    modalFout.value = 'Verbindingsfout.'
  }
}

// ─── Verwijderen ─────────────────────────────────────────────────────────────
function openDelete(set) {
  teVerwijderen.value   = set
  toonDeleteModal.value = true
}

function sluitDeleteModal() {
  toonDeleteModal.value = false
  teVerwijderen.value   = null
}

async function bevestigDelete() {
  if (!teVerwijderen.value) return
  try {
    const res = await fetch(
      `http://localhost:3000/api/competentiesets/${teVerwijderen.value.set_id}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } }
    )
    if (res.ok) {
      sluitDeleteModal()
      await laadSets()
      toonBericht('Competentieset verwijderd.', 'success')
    } else {
      const data = await res.json()
      toonBericht(data.error || 'Verwijderen mislukt.', 'error')
      sluitDeleteModal()
    }
  } catch {
    toonBericht('Verbindingsfout.', 'error')
    sluitDeleteModal()
  }
}

// ─── Bericht ─────────────────────────────────────────────────────────────────
function toonBericht(tekst, type) {
  bericht.value     = tekst
  berichtType.value = type
  setTimeout(() => (bericht.value = ''), 3000)
}

// ─── Navigeer naar beheer ─────────────────────────────────────────────────────
function naarBeheer(set) {
  router.push({ path: '/admin/competentiebeheer', query: { id: set.set_id } })
}
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />

    <main class="content">

      <!-- Paginatitel -->
      <div>
        <h1 class="page-title">Competentiesets</h1>
        <p class="page-subtitle">Beheer competentiesets per opleiding en academiejaar</p>
      </div>

      <!-- Feedbackbericht -->
      <div
        v-if="bericht"
        class="bericht"
        :class="berichtType === 'success' ? 'bericht-success' : 'bericht-error'"
      >
        {{ bericht }}
      </div>

      <!-- Toolbar -->
      <div class="toolbar">
        <div class="toolbar-filters">
          <select v-model="filterOpleiding" class="filter-select">
            <option value="">Alle opleidingen</option>
            <option v-for="opl in uniekOpleidingen" :key="opl" :value="opl">{{ opl }}</option>
          </select>
          <select v-model="filterJaar" class="filter-select">
            <option value="">Alle academiejaren</option>
            <option v-for="jaar in uniekJaren" :key="jaar" :value="jaar">{{ jaar }}</option>
          </select>
        </div>
        <div class="toolbar-acties">
          <button class="btn btn-secondary" @click="router.push('/admin/competentiebeheer')">
            Competentiebeheer
          </button>
          <button class="btn btn-primary" @click="openToevoegen">
            + Competentieset toevoegen
          </button>
        </div>
      </div>

      <!-- Tabel -->
      <div class="table-wrapper">

        <!-- Tabelheader -->
        <div class="tabel-header">
          <div class="col-toggle"></div>
          <div class="col-naam"><span>Competentieset</span></div>
          <div class="col-opleiding"><span>Opleiding</span></div>
          <div class="col-jaar"><span>Academiejaar</span></div>
          <div class="col-status"><span>Gewicht</span></div>
          <div class="col-acties"><span>Acties</span></div>
        </div>

        <div class="tabel-divider"></div>

        <!-- Laadindicator -->
        <div v-if="bezig" class="tabel-rij">
          <p class="text-secondary" style="font-size:13px">Laden…</p>
        </div>

        <!-- Lege staat -->
        <div v-else-if="gefilterdesets.length === 0" class="tabel-rij">
          <p class="text-secondary" style="font-size:13px">Geen competentiesets gevonden.</p>
        </div>

        <!-- Rijen -->
        <template v-else>
          <div v-for="(set, index) in gefilterdesets" :key="set.set_id">

            <!-- Hoofdrij -->
            <div class="tabel-rij tabel-rij-hover" @click="toggleUitklap(set.set_id)">
              <div class="col-toggle">
                <button
                  class="toggle-btn"
                  :class="{ 'toggle-open': uitgeklapt.has(set.set_id) }"
                >
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
              <div class="col-naam">
                <span class="font-semibold">{{ set.naam }}</span>
                <span class="text-secondary" style="font-size:12px; display:block; margin-top:2px">
                  {{ (set.competenties || []).length }} competentie{{ (set.competenties || []).length !== 1 ? 's' : '' }}
                </span>
              </div>
              <div class="col-opleiding">
                <span class="text-secondary" style="font-size:13px">{{ set.opleiding }}</span>
              </div>
              <div class="col-jaar">
                <span class="text-secondary" style="font-size:13px">{{ set.jaar || '—' }}</span>
              </div>
              <div class="col-status">
                <div class="gewicht-cel">
                  <div class="mini-progress-track">
                    <div
                      class="mini-progress-fill"
                      :style="{ width: Math.min(totaalGewicht(set), 100) + '%' }"
                      :class="{
                        'progress-compleet':   setStatus(set) === 'compleet',
                        'progress-onvolledig': setStatus(set) === 'onvolledig',
                        'progress-leeg':       setStatus(set) === 'leeg',
                      }"
                    ></div>
                  </div>
                  <span
                    class="status-badge"
                    :class="{
                      'status-compleet':   setStatus(set) === 'compleet',
                      'status-onvolledig': setStatus(set) === 'onvolledig',
                      'status-leeg':       setStatus(set) === 'leeg',
                    }"
                  >
                    <template v-if="setStatus(set) === 'compleet'">✓ Compleet</template>
                    <template v-else-if="setStatus(set) === 'onvolledig'">⚠ {{ totaalGewicht(set) }}%</template>
                    <template v-else>— Leeg</template>
                  </span>
                </div>
              </div>
              <div class="col-acties" @click.stop>
                <button class="btn-icon" title="Competentiebeheer" @click="naarBeheer(set)">
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </button>
                <button class="btn-icon btn-icon-danger" title="Verwijderen" @click="openDelete(set)">
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Uitgeklapte competenties -->
            <div v-if="uitgeklapt.has(set.set_id)" class="uitklap-sectie">
              <div v-if="(set.competenties || []).length === 0" class="uitklap-leeg">
                Geen competenties in deze set.
              </div>
              <div v-for="comp in set.competenties" :key="comp.id" class="uitklap-rij">
                <div class="uitklap-naam">{{ comp.naam }}</div>
                <div class="uitklap-desc text-secondary">{{ comp.omschrijving }}</div>
                <div class="uitklap-gewicht">
                  <span class="gewicht-badge">{{ comp.gewicht }}%</span>
                </div>
              </div>
            </div>

            <div v-if="index < gefilterdesets.length - 1" class="tabel-divider"></div>
          </div>
        </template>

      </div>

    </main>

    <!-- ── MODAL: Toevoegen ──────────────────────────────────────────────────── -->
    <div v-if="toonAddModal" class="modal-overlay" @click.self="sluitAddModal">
      <div class="modal-card">
        <h2 class="modal-title">Competentieset toevoegen</h2>
        <p style="font-size:13px; color:var(--text-secondary); margin-bottom:20px; line-height:1.5;">
          Maak een nieuwe competentieset aan voor een opleiding en academiejaar.
        </p>

        <div class="form-group">
          <label>Naam <span style="color:var(--red)">*</span></label>
          <input v-model="modalSet.naam" class="form-input" placeholder="bijv. Softwareontwikkeling" />
        </div>

        <div class="form-group" style="margin-top:14px">
          <label>Opleiding <span style="color:var(--red)">*</span></label>
          <input v-model="modalSet.opleiding" class="form-input" placeholder="bijv. Toegepaste Informatica" />
        </div>

        <div class="form-group" style="margin-top:14px">
          <label>Academiejaar <span style="color:var(--red)">*</span></label>
          <select v-model="modalSet.jaar" class="form-input">
            <option value="" disabled>Kies een academiejaar</option>
            <option v-for="jaar in academiejaarOpties" :key="jaar" :value="jaar">{{ jaar }}</option>
          </select>
        </div>

        <p v-if="modalFout" class="form-error" style="margin-top:8px">{{ modalFout }}</p>

        <div style="display:flex; gap:8px; margin-top:24px; justify-content:flex-end;">
          <button class="btn btn-secondary" @click="sluitAddModal">Annuleren</button>
          <button
            class="btn btn-primary"
            :disabled="!modalSet.naam.trim() || !modalSet.opleiding.trim() || !modalSet.jaar.trim()"
            @click="slaSetOp"
          >
            Toevoegen
          </button>
        </div>
      </div>
    </div>

    <!-- ── MODAL: Verwijderen ──────────────────────────────────────────────── -->
    <div v-if="toonDeleteModal" class="modal-overlay" @click.self="sluitDeleteModal">
      <div class="modal-card modal-card-delete">
        <h2 class="modal-title modal-title-delete">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="vertical-align:-4px; margin-right:6px">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
          Competentieset verwijderen
        </h2>

        <div class="delete-info" v-if="teVerwijderen">
          Wil je <strong>{{ teVerwijderen.naam }}</strong> verwijderen?<br />
          Deze set bevat <strong>{{ (teVerwijderen.competenties || []).length }}</strong> competentie(s).
        </div>

        <p style="font-size:13px; color:var(--text-secondary); margin-top:12px; line-height:1.5;">
          De competentieset wordt <em>gedeactiveerd</em> en niet definitief gewist (soft delete).
        </p>

        <div style="display:flex; gap:8px; margin-top:24px; justify-content:flex-end;">
          <button class="btn btn-secondary" @click="sluitDeleteModal">Annuleren</button>
          <button class="btn btn-delete" @click="bevestigDelete">Ja, verwijderen</button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* ── Toolbar ─────────────────────────────────────────────────────────────── */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.toolbar-filters { display: flex; gap: 10px; }
.toolbar-acties  { display: flex; gap: 10px; }

.filter-select {
  height: 36px;
  padding: 0 32px 0 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  background: #fff;
  appearance: none;
  cursor: pointer;
  min-width: 170px;
  font-family: inherit;
}
.filter-select:focus { outline: none; border-color: #111; }

/* ── Tabel ───────────────────────────────────────────────────────────────── */
.tabel-header {
  display: flex;
  align-items: center;
  padding: 13px 24px;
  background: var(--gray50);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.tabel-divider { height: 1px; background: var(--border); }

.tabel-rij {
  display: flex;
  align-items: center;
  padding: 18px 24px;
  background: #fff;
  cursor: pointer;
}
.tabel-rij-hover:hover { background: #fafafa; }

/* ── Kolommen ────────────────────────────────────────────────────────────── */
.col-toggle    { width: 36px; flex-shrink: 0; }
.col-naam      { flex: 2; min-width: 0; font-size: 14px; font-weight: 600; }
.col-opleiding { flex: 2; min-width: 0; }
.col-jaar      { width: 120px; flex-shrink: 0; }
.col-status    { width: 180px; flex-shrink: 0; }
.col-acties {
  width: 96px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
}

/* ── Gewicht cel ─────────────────────────────────────────────────────────── */
.gewicht-cel {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.mini-progress-track {
  height: 5px;
  background: var(--border);
  border-radius: 99px;
  overflow: hidden;
  width: 100%;
}

.mini-progress-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.3s ease;
}

.progress-compleet   { background: #065F46; }
.progress-onvolledig { background: #92400E; }
.progress-leeg       { background: #D1D5DB; }

/* ── Toggle knop ─────────────────────────────────────────────────────────── */
.toggle-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  border-radius: 4px;
  pointer-events: none;
}
.toggle-btn svg  { transition: transform 0.2s ease; }
.toggle-open svg { transform: rotate(90deg); }

/* ── Uitgeklapte sectie ──────────────────────────────────────────────────── */
.uitklap-sectie {
  background: #fafafa;
  border-top: 1px solid var(--border);
  padding: 0 24px 0 60px;
}
.uitklap-leeg {
  padding: 14px 0;
  font-size: 13px;
  color: var(--text-secondary);
}
.uitklap-rij {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-top: 1px solid var(--border);
  gap: 16px;
}
.uitklap-rij:first-child { border-top: none; }
.uitklap-naam    { width: 220px; flex-shrink: 0; font-size: 13px; font-weight: 600; }
.uitklap-desc    { flex: 1; font-size: 13px; }
.uitklap-gewicht { width: 70px; flex-shrink: 0; text-align: right; }

/* ── Status badge ────────────────────────────────────────────────────────── */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
}
.status-compleet   { background: #ECFDF5; color: #065F46; }
.status-onvolledig { background: #FFFBEB; color: #92400E; }
.status-leeg       { background: #F3F4F6; color: #6B7280; }

/* ── Gewicht badge ───────────────────────────────────────────────────────── */
.gewicht-badge {
  display: inline-block;
  padding: 4px 10px;
  background: var(--gray50);
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  border: 1px solid var(--border);
}

/* ── Icon-knoppen ────────────────────────────────────────────────────────── */
.btn-icon {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.btn-icon:hover { background: var(--gray50); color: var(--text-primary); }
.btn-icon-danger:hover { background: var(--red-bg); color: var(--red); border-color: #fca5a5; }

/* ── Feedbackbericht ─────────────────────────────────────────────────────── */
.bericht {
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
}
.bericht-success { background: #f0fdf4; color: var(--green); border: 1px solid #dcfce7; }
.bericht-error   { background: var(--red-bg); color: var(--red); border: 1px solid #fca5a5; }

/* ── Modal overlay ───────────────────────────────────────────────────────── */
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

/* ── Delete info box ─────────────────────────────────────────────────────── */
.delete-info {
  background: var(--gray50);
  border-radius: 6px;
  padding: 12px 14px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}
.delete-info strong { color: var(--text-primary); }

/* ── Delete confirm button ───────────────────────────────────────────────── */
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

/* ── Disabled primary button ─────────────────────────────────────────────── */
.btn[disabled] { opacity: 0.4; cursor: not-allowed; }
</style>