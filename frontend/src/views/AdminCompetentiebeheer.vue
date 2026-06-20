<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import { navLinks } from './adminNav'

const route  = useRoute()
const router = useRouter()

// ─── Opleidingen (echte opleiding-tabel) ─────────────────────────────────────
const opleidingen          = ref([])
const gekozenOpleidingId   = ref(null)

// ─── Competenties van gekozen opleiding ──────────────────────────────────────
const competenties = ref([])
const laadBezig    = ref(false)
const bericht      = ref('')
const berichtType  = ref('')

// ─── Rubriek edit state per competentie ──────────────────────────────────────
// { [comp.id]: { rubrieken: {5:'',3:'',1:'',0:''}, opgeslagen, bezig, fout } }
const rubriekEdit = ref({})

const PUNTEN      = [5, 3, 1, 0]
const PUNT_LABELS = { 5: 'Uitstekend', 3: 'Goed', 1: 'Voldoende', 0: 'Niet aangetoond' }
const PUNT_KLEUR  = { 5: '#16a34a', 3: '#2563eb', 1: '#d97706', 0: '#dc2626' }

// ─── Modal: competentie toevoegen / bewerken ─────────────────────────────────
const toonFormModal = ref(false)
const isBewerken    = ref(false)
const modalComp     = ref({ id: null, naam: '', omschrijving: '', gewicht: 1 })
const modalFout     = ref('')

// ─── Modal: verwijderen ───────────────────────────────────────────────────────
const toonDeleteModal = ref(false)
const teVerwijderen   = ref(null)

// ─── Lifecycle ───────────────────────────────────────────────────────────────
onMounted(async () => {
  await laadOpleidingen()
  const queryId = Number(route.query.id)
  gekozenOpleidingId.value = opleidingen.value.some(o => o.opleiding_id === queryId)
    ? queryId
    : opleidingen.value[0]?.opleiding_id ?? null
  if (gekozenOpleidingId.value) await laadCompetenties()
})

// ─── API helpers ─────────────────────────────────────────────────────────────
function token() { return localStorage.getItem('token') }

async function laadOpleidingen() {
  try {
    const res = await fetch('http://localhost:3000/api/opleidingen', {
      headers: { Authorization: `Bearer ${token()}` },
    })
    opleidingen.value = await res.json()
  } catch {
    toonBericht('Opleidingen konden niet worden geladen.', 'error')
  }
}

async function laadCompetenties() {
  if (!gekozenOpleidingId.value) return
  laadBezig.value = true
  try {
    const res = await fetch(`http://localhost:3000/api/competenties/${gekozenOpleidingId.value}`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
    const data = await res.json()
    competenties.value = data.map(c => ({ ...c, id: c.id ?? c.competentie_id }))
    rubriekEdit.value  = {}
    competenties.value.forEach(c => { rubriekEdit.value[c.id] = initRubriekState(c) })
  } catch {
    toonBericht('Competenties konden niet worden geladen.', 'error')
  } finally {
    laadBezig.value = false
  }
}

function initRubriekState(comp) {
  const rubMap = {}
  for (const punt of PUNTEN) rubMap[punt] = ''
  for (const r of (comp.rubrieken || [])) {
    if (r.punt != null) rubMap[Number(r.punt)] = r.beschrijving || ''
  }
  const heeftData = (comp.rubrieken || []).length > 0
  return {
    rubrieken:  rubMap,
    opgeslagen: heeftData,
    bezig:      false,
    fout:       '',
  }
}

async function wisselOpleiding() {
  router.replace({ path: '/admin/competenties', query: { id: gekozenOpleidingId.value } })
  await laadCompetenties()
}

// ─── Rubrieken opslaan (alle 4 niveaus tegelijk) ─────────────────────────────
async function slaRubriekenOp(comp) {
  const id    = comp.id
  const state = rubriekEdit.value[id]
  if (!state) return
  rubriekEdit.value = { ...rubriekEdit.value, [id]: { ...state, bezig: true, fout: '' } }
  const rubrieken = PUNTEN
    .filter(p => state.rubrieken[p].trim())
    .map(p => ({ punt: p, beschrijving: state.rubrieken[p].trim() }))
  try {
    const res = await fetch(`http://localhost:3000/api/competenties/${id}/rubrieken`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body:    JSON.stringify({ rubrieken }),
    })
    const data = await res.json()
    if (res.ok) {
      rubriekEdit.value = { ...rubriekEdit.value, [id]: { ...state, opgeslagen: true, bezig: false, fout: '' } }
      toonBericht('Rubrieken opgeslagen.', 'success')
    } else {
      rubriekEdit.value = { ...rubriekEdit.value, [id]: { ...state, bezig: false, fout: data.error || 'Opslaan mislukt.' } }
    }
  } catch {
    rubriekEdit.value = { ...rubriekEdit.value, [id]: { ...state, bezig: false, fout: 'Verbindingsfout.' } }
  }
}

function startBewerken(comp) {
  const id = comp.id
  rubriekEdit.value = { ...rubriekEdit.value, [id]: { ...rubriekEdit.value[id], opgeslagen: false } }
}

// ─── Toevoegen / bewerken ─────────────────────────────────────────────────────
function openToevoegen() {
  isBewerken.value    = false
  modalComp.value     = { id: null, naam: '', omschrijving: '', gewicht: 1 }
  modalFout.value     = ''
  toonFormModal.value = true
}

function openBewerken(comp) {
  isBewerken.value    = true
  modalComp.value     = { ...comp }
  modalFout.value     = ''
  toonFormModal.value = true
}

async function slaModalOp() {
  const naam = modalComp.value.naam.trim()
  if (!naam) { modalFout.value = 'Naam is verplicht.'; return }
  if (!gekozenOpleidingId.value) { modalFout.value = 'Geen opleiding geselecteerd.'; return }
  try {
    let res
    if (isBewerken.value) {
      res = await fetch(`http://localhost:3000/api/competenties/${modalComp.value.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body:    JSON.stringify({ naam, omschrijving: modalComp.value.omschrijving, gewicht: modalComp.value.gewicht }),
      })
    } else {
      res = await fetch('http://localhost:3000/api/competenties', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body:    JSON.stringify({ naam, omschrijving: modalComp.value.omschrijving, gewicht: modalComp.value.gewicht, opleiding_id: gekozenOpleidingId.value }),
      })
    }
    const data = await res.json()
    if (res.ok) {
      toonFormModal.value = false
      await laadCompetenties()
      toonBericht(isBewerken.value ? 'Competentie bijgewerkt.' : 'Competentie toegevoegd.', 'success')
    } else {
      modalFout.value = data.error || 'Opslaan mislukt.'
    }
  } catch {
    modalFout.value = 'Verbindingsfout.'
  }
}

// ─── Verwijderen ─────────────────────────────────────────────────────────────
function openDelete(comp)  { teVerwijderen.value = comp; toonDeleteModal.value = true }
function sluitDeleteModal() { toonDeleteModal.value = false; teVerwijderen.value = null }

async function bevestigDelete() {
  if (!teVerwijderen.value) return
  try {
    const res = await fetch(`http://localhost:3000/api/competenties/${teVerwijderen.value.id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token()}` },
    })
    if (res.ok) {
      sluitDeleteModal()
      await laadCompetenties()
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
  setTimeout(() => (bericht.value = ''), 3500)
}

// ─── Opleidingen toevoegen / verwijderen ─────────────────────────────────────
const nieuweOpleiding = ref('')
const opleidingBezig  = ref(false)

async function voegOpleidingToe() {
  const naam = nieuweOpleiding.value.trim()
  if (!naam || opleidingBezig.value) return
  opleidingBezig.value = true
  try {
    const res = await fetch('http://localhost:3000/api/opleidingen', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body:    JSON.stringify({ naam }),
    })
    const data = await res.json()
    if (!res.ok) { toonBericht(data.error || 'Toevoegen mislukt.', 'error'); return }
    nieuweOpleiding.value = ''
    await laadOpleidingen()
    gekozenOpleidingId.value = data.opleiding_id
    await laadCompetenties()
    toonBericht('Opleiding toegevoegd.', 'success')
  } catch {
    toonBericht('Verbindingsfout.', 'error')
  } finally {
    opleidingBezig.value = false
  }
}

async function verwijderOpleiding() {
  if (!gekozenOpleidingId.value) return
  const huidige = opleidingen.value.find(o => o.opleiding_id === gekozenOpleidingId.value)
  if (!confirm(`Opleiding "${huidige?.naam || ''}" verwijderen?`)) return
  try {
    const res = await fetch(`http://localhost:3000/api/opleidingen/${gekozenOpleidingId.value}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${token()}` },
    })
    const data = await res.json()
    if (!res.ok) { toonBericht(data.error || 'Verwijderen mislukt.', 'error'); return }
    await laadOpleidingen()
    gekozenOpleidingId.value = opleidingen.value[0]?.opleiding_id ?? null
    if (gekozenOpleidingId.value) await laadCompetenties()
    else competenties.value = []
    toonBericht('Opleiding verwijderd.', 'success')
  } catch {
    toonBericht('Verbindingsfout.', 'error')
  }
}
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />

    <main class="content">

      <div class="pagina-hoofd">
        <div>
          <h1 class="page-title">Competentiebeheer</h1>
          <p class="page-subtitle">Kies een opleiding, beheer de competenties en stel per competentie de rubriek in voor alle 4 niveaus.</p>
        </div>
        <button class="btn btn-primary" @click="openToevoegen" :disabled="!gekozenOpleidingId">
          + Competentie toevoegen
        </button>
      </div>

      <!-- Feedbackbericht -->
      <div v-if="bericht" class="bericht" :class="berichtType === 'success' ? 'bericht-success' : 'bericht-error'">
        {{ bericht }}
      </div>

      <!-- Opleiding kiezen + beheren -->
      <div class="opleiding-beheer">
        <div class="opleiding-keuze">
          <label class="opleiding-label">Opleiding</label>
          <select
            v-model="gekozenOpleidingId"
            class="opleiding-select"
            @change="wisselOpleiding"
          >
            <option v-if="opleidingen.length === 0" :value="null" disabled>Geen opleidingen</option>
            <option v-for="o in opleidingen" :key="o.opleiding_id" :value="o.opleiding_id">
              {{ o.naam }}
            </option>
          </select>
          <button
            class="btn-icon btn-icon-danger"
            title="Geselecteerde opleiding verwijderen"
            :disabled="!gekozenOpleidingId"
            @click="verwijderOpleiding"
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        </div>

        <div class="opleiding-toevoegen">
          <input
            v-model="nieuweOpleiding"
            class="opleiding-input"
            placeholder="Naam nieuwe opleiding"
            @keyup.enter="voegOpleidingToe"
          />
          <button
            class="btn btn-secondary btn-sm"
            :disabled="opleidingBezig || !nieuweOpleiding.trim()"
            @click="voegOpleidingToe"
          >
            + Opleiding toevoegen
          </button>
        </div>
      </div>

      <!-- Laden -->
      <p v-if="laadBezig" class="tekst-grijs">Laden…</p>

      <!-- Geen competenties -->
      <div v-else-if="!laadBezig && gekozenOpleidingId && competenties.length === 0" class="leeg-vak">
        <p class="tekst-grijs">Geen competenties voor deze opleiding. Voeg er een toe.</p>
      </div>

      <!-- Competentie-kaarten -->
      <div v-for="comp in competenties" :key="comp.id" class="comp-kaart">

        <!-- Kaart header -->
        <div class="kaart-hoofd">
          <div class="kaart-info">
            <span class="comp-naam">{{ comp.naam }}</span>
            <span v-if="comp.omschrijving" class="comp-desc">{{ comp.omschrijving }}</span>
          </div>
          <div class="kaart-acties">
            <span class="gewicht-badge">{{ comp.gewicht }}%</span>
            <button class="btn-icon" title="Naam/omschrijving/gewicht bewerken" @click="openBewerken(comp)">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon btn-icon-danger" title="Verwijderen" @click="openDelete(comp)">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </div>

        <!-- Rubriek sectie -->
        <div class="rubriek-sectie" v-if="rubriekEdit[comp.id]">
          <p class="rubriek-titel">Rubriek per niveau</p>

          <!-- Opgeslagen view (read-only) -->
          <div v-if="rubriekEdit[comp.id].opgeslagen" class="rubrieken-opgeslagen">
            <div v-for="punt in PUNTEN" :key="punt" class="rubriek-rij-saved">
              <div class="rubriek-punt-badge" :style="{ background: PUNT_KLEUR[punt] }">
                <span class="punt-cijfer">{{ punt }}</span>
                <span class="punt-label">{{ PUNT_LABELS[punt] }}</span>
              </div>
              <div class="rubriek-desc-saved">
                {{ rubriekEdit[comp.id].rubrieken[punt] || '—' }}
              </div>
            </div>
            <button class="btn btn-sm btn-secondary" style="margin-top:10px" @click="startBewerken(comp)">Bewerken</button>
          </div>

          <!-- Edit view -->
          <div v-else class="rubrieken-edit">
            <div v-for="punt in PUNTEN" :key="punt" class="rubriek-niveau">
              <label class="niveau-label" :style="{ color: PUNT_KLEUR[punt] }">
                <span class="niveau-punt">{{ punt }}</span>
                {{ PUNT_LABELS[punt] }}
              </label>
              <textarea
                v-model="rubriekEdit[comp.id].rubrieken[punt]"
                class="rubriek-textarea"
                rows="2"
                :placeholder="`Beschrijving voor niveau ${punt}…`"
              ></textarea>
            </div>

            <div class="rubriek-footer">
              <span v-if="rubriekEdit[comp.id].fout" class="rubriek-fout">{{ rubriekEdit[comp.id].fout }}</span>
              <button
                class="btn btn-sm btn-primary"
                :disabled="rubriekEdit[comp.id].bezig"
                @click="slaRubriekenOp(comp)"
              >
                {{ rubriekEdit[comp.id].bezig ? 'Bezig…' : 'Rubrieken opslaan' }}
              </button>
            </div>
          </div>
        </div>

      </div>

    </main>

    <!-- ── MODAL: Toevoegen / Bewerken ─────────────────────────────────────── -->
    <div v-if="toonFormModal" class="modal-overlay" @click.self="toonFormModal = false">
      <div class="modal-card">
        <h2 class="modal-title">{{ isBewerken ? 'Competentie bewerken' : 'Competentie toevoegen' }}</h2>

        <div class="form-group">
          <label>Naam <span style="color:var(--red)">*</span></label>
          <input v-model="modalComp.naam" class="form-input" placeholder="bijv. Technische vaardigheden" />
        </div>

        <div class="form-group" style="margin-top:14px">
          <label>Omschrijving</label>
          <textarea v-model="modalComp.omschrijving" class="form-input" rows="3" placeholder="Korte uitleg…"></textarea>
        </div>

        <div class="form-group" style="margin-top:14px">
          <label>Gewicht (%)</label>
          <input v-model.number="modalComp.gewicht" type="number" min="0" max="100" step="0.5" class="form-input" />
        </div>

        <p v-if="modalFout" class="form-error" style="margin-top:8px">{{ modalFout }}</p>

        <div style="display:flex; gap:8px; margin-top:24px; justify-content:flex-end;">
          <button class="btn btn-secondary" @click="toonFormModal = false">Annuleren</button>
          <button class="btn btn-primary" :disabled="!modalComp.naam.trim()" @click="slaModalOp">
            {{ isBewerken ? 'Wijzigingen opslaan' : 'Toevoegen' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── MODAL: Verwijderen ──────────────────────────────────────────────── -->
    <div v-if="toonDeleteModal" class="modal-overlay" @click.self="sluitDeleteModal">
      <div class="modal-card modal-card-delete">
        <h2 class="modal-title modal-title-delete">Competentie verwijderen</h2>
        <p style="font-size:13px; color:var(--text-secondary); line-height:1.5;" v-if="teVerwijderen">
          Wil je <strong>{{ teVerwijderen.naam }}</strong> verwijderen?<br />
          De competentie wordt gedeactiveerd (soft delete).
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
/* ── Pagina hoofd ────────────────────────────────────────────────────────── */
.pagina-hoofd {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

/* ── Feedback ────────────────────────────────────────────────────────────── */
.bericht { padding: 10px 16px; border-radius: 6px; font-size: 13px; font-weight: 500; }
.bericht-success { background: #f0fdf4; color: var(--green); border: 1px solid #dcfce7; }
.bericht-error   { background: var(--red-bg); color: var(--red); border: 1px solid #fca5a5; }

/* ── Opleiding dropdown ──────────────────────────────────────────────────── */
.opleiding-keuze {
  display: flex;
  align-items: center;
  gap: 12px;
}
.opleiding-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}
.opleiding-select {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  background: #fff;
  cursor: pointer;
  min-width: 280px;
}
.opleiding-select:focus { outline: none; border-color: #000; }

.opleiding-beheer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.opleiding-toevoegen {
  display: flex;
  align-items: center;
  gap: 8px;
}
.opleiding-input {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  background: #fff;
  min-width: 200px;
}
.opleiding-input:focus { outline: none; border-color: #000; }

/* ── Leeg / laden ────────────────────────────────────────────────────────── */
.tekst-grijs { font-size: 13px; color: var(--text-secondary); }
.leeg-vak {
  padding: 24px;
  background: var(--gray50);
  border-radius: 8px;
  border: 1px dashed var(--border);
}

/* ── Competentie-kaart ───────────────────────────────────────────────────── */
.comp-kaart {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}

.kaart-hoofd {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 20px;
  gap: 16px;
}

.kaart-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.comp-naam {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.comp-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.kaart-acties {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
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

/* ── Rubriek sectie ──────────────────────────────────────────────────────── */
.rubriek-sectie {
  border-top: 1px solid var(--border);
  padding: 16px 20px;
  background: #fafafa;
}

.rubriek-titel {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  margin: 0 0 12px 0;
}

/* Opgeslagen state */
.rubrieken-opgeslagen {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rubriek-rij-saved {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 8px;
}

.rubriek-punt-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 12px;
  border-radius: 6px;
  color: #fff;
  flex-shrink: 0;
  min-width: 72px;
}

.punt-cijfer {
  font-size: 20px;
  font-weight: 800;
  line-height: 1;
}

.punt-label {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.9;
  text-align: center;
}

.rubriek-desc-saved {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  padding-top: 4px;
}

/* Edit state */
.rubrieken-edit {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rubriek-niveau {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.niveau-label {
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
}

.niveau-punt {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: currentColor;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  flex-shrink: 0;
}

.rubriek-textarea {
  width: 100%;
  resize: vertical;
  font-size: 13px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-family: inherit;
  line-height: 1.5;
  color: var(--text-primary);
  background: #fff;
  box-sizing: border-box;
}
.rubriek-textarea:focus { outline: none; border-color: #000; }

.rubriek-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 4px;
}

.rubriek-fout { font-size: 12px; color: var(--red); }

/* ── Icon knoppen ────────────────────────────────────────────────────────── */
.btn-icon {
  width: 32px; height: 32px;
  border: 1px solid var(--border); background: #fff; border-radius: 6px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: var(--text-secondary); transition: background 0.12s, color 0.12s;
}
.btn-icon:hover { background: var(--gray50); color: var(--text-primary); }
.btn-icon-danger:hover { background: var(--red-bg); color: var(--red); border-color: #fca5a5; }

/* ── Modals ──────────────────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center; z-index: 200;
}
.modal-card {
  background: #fff; border-radius: 10px; padding: 32px 36px;
  width: 480px; max-width: calc(100vw - 40px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.12);
}
.modal-card-delete { width: 420px; }
.modal-title { font-size: 18px; font-weight: 700; margin-bottom: 20px; color: var(--text-primary); }
.modal-title-delete { color: var(--red); }

.btn-delete {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 10px 20px; border: none; border-radius: 6px;
  background: var(--red); color: #fff; font-size: 14px; font-weight: 600;
  cursor: pointer; font-family: inherit; transition: opacity 0.15s;
}
.btn-delete:hover { opacity: 0.88; }
.btn[disabled] { opacity: 0.4; cursor: not-allowed; }
</style>
