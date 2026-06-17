<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'

// ─── Nav ────────────────────────────────────────────────────────────────────
const navLinks = ref([
  { label: 'Competenties', to: '/admin/competentiesets' },
  { label: 'Stages',       to: '/admin/stages' },
  { label: 'Accounts',     to: '/admin/accounts' },
  { label: 'Aanvragen',    to: '/admin/aanvragen' },
])

const route  = useRoute()
const router = useRouter()

// ─── Alle sets (voor tabs) + actieve set ──────────────────────────────────────
const sets        = ref([])
const activeSetId = ref(null)
const huidigSet   = computed(() => sets.value.find(s => s.set_id === activeSetId.value) || null)

// ─── Competenties (van de actieve set) ────────────────────────────────────────
const competenties   = ref([])
const bezig           = ref(false)
const bericht         = ref('')
const berichtType     = ref('')

// ─── Modal: toevoegen / bewerken ─────────────────────────────────────────────
const toonFormModal  = ref(false)
const isBewerken     = ref(false)
const modalComp      = ref({ id: null, naam: '', omschrijving: '', gewicht: 10 })
const modalFout      = ref('')
const duplicaatFout  = ref(false)

// ─── Modal: verwijderen ───────────────────────────────────────────────────────
const toonDeleteModal = ref(false)
const teVerwijderen   = ref(null)

// ─── Computed ────────────────────────────────────────────────────────────────
const totaalGewicht = computed(() =>
  competenties.value.reduce((som, c) => som + Number(c.gewicht), 0)
)

const totaalOk = computed(() => totaalGewicht.value === 100)

const totaalStatus = computed(() => {
  if (totaalGewicht.value === 100) return 'ok'
  if (totaalGewicht.value < 100)  return 'warn'
  return 'error'
})

const progressBreedte = computed(() =>
  Math.min(totaalGewicht.value, 100) + '%'
)

// Gewicht-impact preview in modal
const gewichtNaOpslaan = computed(() => {
  const basis = competenties.value
    .filter(c => c.id !== modalComp.value.id)
    .reduce((s, c) => s + Number(c.gewicht), 0)
  return basis + Number(modalComp.value.gewicht)
})

// ─── Lifecycle ───────────────────────────────────────────────────────────────
onMounted(() => laadSets({ initial: true }))

// ─── API helpers ─────────────────────────────────────────────────────────────
function token() {
  return localStorage.getItem('token')
}

// Haalt alle competentiesets (incl. hun competenties) op.
// Bij `initial` wordt de actieve tab bepaald op basis van ?id= in de URL,
// anders blijft de huidige tabselectie behouden (bv. na toevoegen/bewerken).
async function laadSets({ initial = false } = {}) {
  bezig.value = true
  try {
    const res  = await fetch('http://localhost:3000/api/competentiesets', {
      headers: { Authorization: `Bearer ${token()}` },
    })
    sets.value = await res.json()

    if (sets.value.length === 0) {
      activeSetId.value = null
    } else if (initial) {
      const queryId       = Number(route.query.id)
      const bestaatInLijst = sets.value.some(s => s.set_id === queryId)
      activeSetId.value   = bestaatInLijst ? queryId : sets.value[0].set_id
    } else if (!sets.value.some(s => s.set_id === activeSetId.value)) {
      // De vorige actieve set bestaat niet meer (bv. verwijderd) -> val terug op de eerste
      activeSetId.value = sets.value[0].set_id
    }

    syncCompetenties()
  } catch {
    toonBericht('Competentiesets konden niet geladen worden.', 'error')
  } finally {
    bezig.value = false
  }
}

function syncCompetenties() {
  competenties.value = (huidigSet.value?.competenties || []).map(c => ({ ...c }))
}

function wisselTab(id) {
  if (id === activeSetId.value) return
  activeSetId.value = id
  syncCompetenties()
  router.replace({ path: '/admin/competentiebeheer', query: { id } })
}

// ─── Duplicate check ─────────────────────────────────────────────────────────
function isDuplicaat(naam, excludeId) {
  return competenties.value.some(
    c => c.id !== excludeId &&
         c.naam.trim().toLowerCase() === naam.trim().toLowerCase()
  )
}

function onNaamInput() {
  duplicaatFout.value = isDuplicaat(modalComp.value.naam, modalComp.value.id)
}

// ─── Toevoegen ───────────────────────────────────────────────────────────────
function openToevoegen() {
  isBewerken.value    = false
  modalComp.value     = { id: null, naam: '', omschrijving: '', gewicht: 10 }
  modalFout.value     = ''
  duplicaatFout.value = false
  toonFormModal.value = true
}

// ─── Bewerken ────────────────────────────────────────────────────────────────
function openBewerken(comp) {
  isBewerken.value    = true
  modalComp.value     = { ...comp }
  modalFout.value     = ''
  duplicaatFout.value = false
  toonFormModal.value = true
}

function sluitFormModal() {
  toonFormModal.value = false
}

async function slaModalOp() {
  const naam = modalComp.value.naam.trim()
  if (!naam) {
    modalFout.value = 'Naam is verplicht.'
    return
  }
  if (isDuplicaat(naam, modalComp.value.id)) {
    duplicaatFout.value = true
    return
  }
  if (!activeSetId.value) {
    modalFout.value = 'Geen competentieset geselecteerd.'
    return
  }

  try {
    let res
    if (isBewerken.value) {
      res = await fetch(`http://localhost:3000/api/competenties/${modalComp.value.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          naam:         modalComp.value.naam,
          omschrijving: modalComp.value.omschrijving,
          gewicht:      modalComp.value.gewicht,
        }),
      })
    } else {
      res = await fetch('http://localhost:3000/api/competenties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({
          naam:         modalComp.value.naam,
          omschrijving: modalComp.value.omschrijving,
          gewicht:      modalComp.value.gewicht,
          opleiding_id: activeSetId.value,
        }),
      })
    }

    const data = await res.json()
    if (res.ok) {
      sluitFormModal()
      await laadSets()
      toonBericht(
        isBewerken.value ? 'Wijzigingen opgeslagen.' : 'Competentie toegevoegd.',
        'success'
      )
    } else {
      modalFout.value = data.error || 'Opslaan mislukt.'
    }
  } catch {
    modalFout.value = 'Verbindingsfout.'
  }
}

// ─── Verwijderen ─────────────────────────────────────────────────────────────
function openDelete(comp) {
  teVerwijderen.value   = comp
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
      `http://localhost:3000/api/competenties/${teVerwijderen.value.id}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      }
    )
    if (res.ok) {
      sluitDeleteModal()
      await laadSets()
      toonBericht('Competentie verwijderd.', 'success')
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
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />

    <main class="content">

      <!-- Terug link -->
      <button class="terug-link" @click="router.push('/admin/competentiesets')">← Terug naar overzicht</button>

      <!-- Paginatitel -->
      <div>
        <h1 class="page-title">Competentiebeheer</h1>
        <p class="page-subtitle">Beheer de competenties per opleiding. Het totaal gewicht moet exact 100% zijn.</p>
      </div>

      <!-- Feedbackbericht -->
      <div
        v-if="bericht"
        class="bericht"
        :class="berichtType === 'success' ? 'bericht-success' : 'bericht-error'"
      >
        {{ bericht }}
      </div>

      <!-- Laden (eerste keer, nog geen sets bekend) -->
      <p v-if="bezig && sets.length === 0" class="text-secondary" style="font-size:13px">Laden…</p>

      <!-- Geen competentiesets aanwezig -->
      <div v-else-if="sets.length === 0" class="lege-staat">
        <p class="text-secondary" style="font-size:13px">
          Er bestaan nog geen competentiesets. Maak er eerst één aan via het overzicht.
        </p>
        <button class="btn btn-sm btn-secondary" @click="router.push('/admin/competentiesets')">
          Naar competentiesets
        </button>
      </div>

      <template v-else>

        <!-- Tabs: wissel tussen competentiesets -->
        <div class="cb-tabs">
          <button
            v-for="s in sets"
            :key="s.set_id"
            class="cb-tab"
            :class="{ 'cb-tab-active': s.set_id === activeSetId }"
            @click="wisselTab(s.set_id)"
          >
            {{ s.naam }}
          </button>
        </div>

        <!-- Set badge -->
        <div v-if="huidigSet" class="opleiding-badge">{{ huidigSet.opleiding }} · {{ huidigSet.jaar }}</div>

        <!-- Waarschuwingsbanner als totaal ≠ 100 -->
        <div v-if="!bezig && competenties.length > 0 && !totaalOk" class="waarschuwing" :class="'waarschuwing-' + totaalStatus">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
          <span v-if="totaalStatus === 'warn'">
            Het totale gewicht is {{ totaalGewicht }}%. Er ontbreekt nog {{ 100 - totaalGewicht }}%.
            Aanvragen kunnen pas worden goedgekeurd als het totaal exact 100% is.
          </span>
          <span v-else>
            Het totale gewicht is {{ totaalGewicht }}%, dat is {{ totaalGewicht - 100 }}% te veel.
            Pas de gewichten aan zodat het totaal exact 100% is.
          </span>
        </div>

        <!-- Voortgangsbalk -->
        <div v-if="!bezig && competenties.length > 0" class="progress-sectie">
          <div class="progress-meta">
            <span class="text-secondary" style="font-size:13px">Totaal gewicht</span>
            <span style="font-size:13px; font-weight:600">{{ totaalGewicht }}%</span>
          </div>
          <div class="progress-track">
            <div
              class="progress-fill"
              :style="{ width: progressBreedte }"
              :class="'progress-' + totaalStatus"
            ></div>
          </div>
        </div>

        <!-- Competentietabel -->
        <div class="table-wrapper">

          <!-- Tabelheader -->
          <div class="tabel-header">
            <div class="col-competentie"><span>Competentie</span></div>
            <div class="col-omschrijving"><span>Omschrijving</span></div>
            <div class="col-gewicht"><span>Gewicht</span></div>
            <div class="col-acties"><span>Acties</span></div>
          </div>

          <div class="tabel-divider"></div>

          <!-- Laadindicator -->
          <div v-if="bezig" class="tabel-rij">
            <p class="text-secondary" style="font-size:13px">Laden…</p>
          </div>

          <!-- Lege staat -->
          <div v-else-if="competenties.length === 0" class="tabel-rij">
            <p class="text-secondary" style="font-size:13px">
              Geen competenties gevonden voor deze opleiding.
            </p>
          </div>

          <!-- Rijen -->
          <template v-else>
            <div v-for="(comp, index) in competenties" :key="comp.id">
              <div class="tabel-rij tabel-rij-hover">
                <div class="col-competentie">
                  <span class="font-semibold">{{ comp.naam }}</span>
                </div>
                <div class="col-omschrijving">
                  <span class="text-secondary" style="font-size:13px">{{ comp.omschrijving }}</span>
                </div>
                <div class="col-gewicht">
                  <span class="gewicht-badge">{{ comp.gewicht }}%</span>
                </div>
                <div class="col-acties">
                  <button class="btn-icon" title="Bewerken" @click="openBewerken(comp)">
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="btn-icon btn-icon-danger" title="Verwijderen" @click="openDelete(comp)">
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              </div>
              <div v-if="index < competenties.length - 1" class="tabel-divider"></div>
            </div>
          </template>

          <div class="tabel-divider"></div>

          <!-- Footer -->
          <div class="tabel-footer">
            <div style="display:flex; align-items:center; gap:10px;">
              <span class="text-secondary" style="font-size:13px">Totaal gewicht:</span>
              <span class="totaal-badge" :class="'totaal-' + totaalStatus">
                {{ totaalGewicht }}%
                <span v-if="totaalStatus === 'ok'">✓</span>
                <span v-else-if="totaalStatus === 'warn'">— {{ 100 - totaalGewicht }}% tekort</span>
                <span v-else>— {{ totaalGewicht - 100 }}% te veel</span>
              </span>
            </div>
            <button class="btn btn-sm btn-secondary" @click="openToevoegen">
              + Competentie toevoegen
            </button>
          </div>
        </div>

      </template>

    </main>

    <!-- ── MODAL: Toevoegen / Bewerken ─────────────────────────────────────── -->
    <div v-if="toonFormModal" class="modal-overlay" @click.self="sluitFormModal">
      <div class="modal-card">
        <h2 class="modal-title">
          {{ isBewerken ? 'Competentie bewerken' : 'Competentie toevoegen' }}
        </h2>

        <!-- Naam -->
        <div class="form-group">
          <label>Naam <span style="color:var(--red)">*</span></label>
          <input
            v-model="modalComp.naam"
            class="form-input"
            :class="{ 'input-error': duplicaatFout }"
            placeholder="bijv. Technische vaardigheden"
            @input="onNaamInput"
          />
          <div v-if="duplicaatFout" class="fout-melding">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
            Een competentie met deze naam bestaat al.
          </div>
        </div>

        <!-- Omschrijving -->
        <div class="form-group" style="margin-top:14px">
          <label>Omschrijving</label>
          <textarea
            v-model="modalComp.omschrijving"
            class="form-input"
            rows="3"
            placeholder="Korte omschrijving van de competentie…"
          ></textarea>
        </div>

        <!-- Gewicht slider -->
        <div class="form-group" style="margin-top:14px">
          <label>Gewicht</label>
          <div class="slider-rij">
            <input
              v-model.number="modalComp.gewicht"
              type="range"
              min="1"
              max="100"
              step="1"
              class="gewicht-slider"
            />
            <span class="slider-waarde">{{ modalComp.gewicht }}%</span>
          </div>
          <!-- Impact preview -->
          <div
            class="impact-preview"
            :class="{
              'impact-ok':    gewichtNaOpslaan === 100,
              'impact-warn':  gewichtNaOpslaan < 100,
              'impact-error': gewichtNaOpslaan > 100,
            }"
          >
            Na opslaan: totaal wordt <strong>{{ gewichtNaOpslaan }}%</strong>
          </div>
        </div>

        <!-- Algemene foutmelding -->
        <p v-if="modalFout" class="form-error" style="margin-top:8px">{{ modalFout }}</p>

        <div style="display:flex; gap:8px; margin-top:24px; justify-content:flex-end;">
          <button class="btn btn-secondary" @click="sluitFormModal">Annuleren</button>
          <button
            class="btn btn-primary"
            :disabled="duplicaatFout || !modalComp.naam.trim()"
            @click="slaModalOp"
          >
            {{ isBewerken ? 'Wijzigingen opslaan' : 'Toevoegen' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── MODAL: Verwijderen ──────────────────────────────────────────────── -->
    <div v-if="toonDeleteModal" class="modal-overlay" @click.self="sluitDeleteModal">
      <div class="modal-card modal-card-delete">
        <h2 class="modal-title modal-title-delete">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="vertical-align:-4px; margin-right:6px"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          Competentie verwijderen
        </h2>

        <div class="delete-info" v-if="teVerwijderen">
          Wil je <strong>{{ teVerwijderen.naam }}</strong> verwijderen?<br />
          Het gewicht van <strong>{{ teVerwijderen.gewicht }}%</strong> wordt vrijgegeven.
          Het totaal zakt naar <strong>{{ totaalGewicht - teVerwijderen.gewicht }}%</strong>.
        </div>

        <p style="font-size:13px; color:var(--text-secondary); margin-top:12px; line-height:1.5;">
          De competentie wordt <em>gedeactiveerd</em> en niet definitief gewist (soft delete).
          Ze is nadien niet meer zichtbaar voor studenten.
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
/* ── Terug link ──────────────────────────────────────────────────────────── */
.terug-link {
  background: none;
  border: none;
  padding: 0;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  font-family: inherit;
  margin-bottom: 4px;
  display: inline-block;
}
.terug-link:hover { color: var(--text-primary); text-decoration: underline; }

/* ── Lege staat (geen sets) ──────────────────────────────────────────────── */
.lege-staat {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
  padding: 24px;
  background: var(--gray50);
  border-radius: 8px;
}

/* ── Tabs ────────────────────────────────────────────────────────────────── */
.cb-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
}
.cb-tab {
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  border: 1px solid var(--border);
  background: #fff;
  border-right: none;
  font-family: inherit;
  transition: background 0.12s, color 0.12s;
}
.cb-tab:first-child { border-radius: 6px 0 0 6px; }
.cb-tab:last-child   { border-right: 1px solid var(--border); border-radius: 0 6px 6px 0; }
.cb-tab:hover        { background: var(--gray50); color: var(--text-primary); }
.cb-tab-active, .cb-tab-active:hover {
  background: #000;
  color: #fff;
  border-color: #000;
  font-weight: 600;
}

/* ── Opleiding badge ─────────────────────────────────────────────────────── */
.opleiding-badge {
  display: inline-block;
  padding: 8px 16px;
  background: #000;
  color: #fff;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
}

/* ── Waarschuwingsbanner ──────────────────────────────────────────────────── */
.waarschuwing {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
}
.waarschuwing-warn  { background: var(--yellow-bg); color: var(--yellow); }
.waarschuwing-error { background: var(--red-bg);    color: var(--red); }

/* ── Voortgangsbalk ──────────────────────────────────────────────────────── */
.progress-sectie { display: flex; flex-direction: column; gap: 8px; }

.progress-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-track {
  height: 8px;
  background: var(--border);
  border-radius: 99px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.35s ease, background-color 0.35s ease;
}

.progress-ok    { background: var(--green); }
.progress-warn  { background: var(--yellow); }
.progress-error { background: var(--red); }

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
}

.tabel-rij-hover:hover { background: #fafafa; }

.tabel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--gray50);
}

/* ── Kolommen ────────────────────────────────────────────────────────────── */
.col-competentie { width: 280px; flex-shrink: 0; font-size: 14px; font-weight: 600; }
.col-omschrijving { flex: 1; font-size: 13px; padding-right: 16px; }
.col-gewicht { width: 90px; flex-shrink: 0; }
.col-acties {
  width: 80px;
  flex-shrink: 0;
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

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

/* ── Totaal badge ────────────────────────────────────────────────────────── */
.totaal-badge {
  display: inline-flex;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
}
.totaal-ok    { background: #dcf5e5; color: var(--green); }
.totaal-warn  { background: var(--yellow-bg); color: var(--yellow); }
.totaal-error { background: var(--red-bg); color: var(--red); }

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
  background: rgba(0, 0, 0, 0.4);
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
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.modal-card-delete { width: 420px; }

.modal-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 20px;
  color: var(--text-primary);
}

.modal-title-delete { color: var(--red); }

/* ── Duplicate foutmelding ───────────────────────────────────────────────── */
.input-error {
  border-color: var(--red) !important;
  background: #fff5f5;
}

.fout-melding {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 7px 10px;
  background: var(--red-bg);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--red);
}

/* ── Gewicht slider ──────────────────────────────────────────────────────── */
.slider-rij {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}

.gewicht-slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 99px;
  background: var(--border);
  outline: none;
  cursor: pointer;
}
.gewicht-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #000;
  cursor: pointer;
}

.slider-waarde {
  font-size: 14px;
  font-weight: 600;
  min-width: 40px;
  text-align: right;
  color: var(--text-primary);
}

/* ── Impact preview ──────────────────────────────────────────────────────── */
.impact-preview {
  margin-top: 8px;
  padding: 7px 10px;
  border-radius: 6px;
  font-size: 12px;
}
.impact-ok    { background: #dcf5e5; color: var(--green); }
.impact-warn  { background: var(--yellow-bg); color: var(--yellow); }
.impact-error { background: var(--red-bg); color: var(--red); }

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
.btn[disabled] {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>