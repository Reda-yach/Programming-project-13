<script setup>
import { ref, computed, onMounted } from 'vue'
import TopBar from '../components/TopBar.vue'

// ─── Nav ────────────────────────────────────────────────────────────────────
const navLinks = ref([
  { label: 'Competenties', to: '/admin/competenties' },
  { label: 'Stages',       to: '/admin/stages' },
  { label: 'Accounts',     to: '/admin/accounts' },
  { label: 'Aanvragen',    to: '/admin/aanvragen' },
])

// ─── Opleidingen ─────────────────────────────────────────────────────────────
const opleidingen = ref([
  { id: 1, naam: 'Toegepaste Informatica' },
  { id: 2, naam: 'Elektromechanica' },
])
const geselecteerdeOpleiding = ref(opleidingen.value[0])

// ─── Competenties ────────────────────────────────────────────────────────────
const competenties = ref([])
const bezig        = ref(false)
const bericht      = ref('')
const berichtType  = ref('') // 'success' | 'error'

// Modal: nieuw toevoegen
const toonModal   = ref(false)
const nieuweComp  = ref({ naam: '', omschrijving: '', gewicht: 0 })
const modalFout   = ref('')

// Inline bewerken
const bewerkId    = ref(null)
const bewerkData  = ref({})

// ─── Computed ────────────────────────────────────────────────────────────────
const totaalGewicht = computed(() =>
  competenties.value.reduce((som, c) => som + Number(c.gewicht), 0)
)

const totaalOk = computed(() => totaalGewicht.value === 100)

// ─── Lifecycle ───────────────────────────────────────────────────────────────
onMounted(() => laadCompetenties())

// ─── API helpers ─────────────────────────────────────────────────────────────
function token() {
  return localStorage.getItem('token')
}

async function laadCompetenties() {
  bezig.value = true
  try {
    const res = await fetch(
      `http://localhost:3000/api/competenties/${geselecteerdeOpleiding.value.id}`,
      { headers: { Authorization: `Bearer ${token()}` } }
    )
    competenties.value = await res.json()
  } catch {
    toonBericht('Competenties konden niet geladen worden.', 'error')
  } finally {
    bezig.value = false
  }
}

function wisselOpleiding(opleiding) {
  geselecteerdeOpleiding.value = opleiding
  bewerkId.value = null
  laadCompetenties()
}

// ─── Toevoegen ───────────────────────────────────────────────────────────────
function openModal() {
  nieuweComp.value = { naam: '', omschrijving: '', gewicht: 0 }
  modalFout.value  = ''
  toonModal.value  = true
}

function sluitModal() {
  toonModal.value = false
}

async function voegToe() {
  if (!nieuweComp.value.naam.trim()) {
    modalFout.value = 'Naam is verplicht.'
    return
  }
  if (Number(nieuweComp.value.gewicht) <= 0) {
    modalFout.value = 'Gewicht moet groter zijn dan 0.'
    return
  }

  try {
    const res = await fetch('http://localhost:3000/api/competenties', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token()}`,
      },
      body: JSON.stringify({
        ...nieuweComp.value,
        opleiding_id: geselecteerdeOpleiding.value.id,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      sluitModal()
      await laadCompetenties()
      toonBericht('Competentie toegevoegd.', 'success')
    } else {
      modalFout.value = data.error || 'Toevoegen mislukt.'
    }
  } catch {
    modalFout.value = 'Verbindingsfout.'
  }
}

// ─── Inline bewerken ─────────────────────────────────────────────────────────
function startBewerk(competentie) {
  bewerkId.value   = competentie.id
  bewerkData.value = { ...competentie }
}

function annuleerBewerk() {
  bewerkId.value = null
}

async function slaBewerkenOp() {
  try {
    const res = await fetch(
      `http://localhost:3000/api/competenties/${bewerkId.value}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify(bewerkData.value),
      }
    )
    if (res.ok) {
      bewerkId.value = null
      await laadCompetenties()
      toonBericht('Wijzigingen opgeslagen.', 'success')
    } else {
      const data = await res.json()
      toonBericht(data.error || 'Opslaan mislukt.', 'error')
    }
  } catch {
    toonBericht('Verbindingsfout.', 'error')
  }
}

// ─── Verwijderen ─────────────────────────────────────────────────────────────
async function verwijder(id) {
  if (!confirm('Competentie verwijderen?')) return
  try {
    const res = await fetch(
      `http://localhost:3000/api/competenties/${id}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      }
    )
    if (res.ok) {
      await laadCompetenties()
      toonBericht('Competentie verwijderd.', 'success')
    }
  } catch {
    toonBericht('Verwijderen mislukt.', 'error')
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

      <!-- Paginatitel -->
      <div>
        <h1 class="page-title">Competentiebeheer</h1>
      </div>

      <!-- Opleiding-tabs -->
      <div class="opleiding-tabs">
        <button
          v-for="opl in opleidingen"
          :key="opl.id"
          class="opleiding-tab"
          :class="{ active: geselecteerdeOpleiding.id === opl.id }"
          @click="wisselOpleiding(opl)"
        >
          {{ opl.naam }}
        </button>
      </div>

      <!-- Feedbackbericht -->
      <div
        v-if="bericht"
        class="bericht"
        :class="berichtType === 'success' ? 'bericht-success' : 'bericht-error'"
      >
        {{ bericht }}
      </div>

      <!-- Competentietabel -->
      <div class="table-wrapper">

        <!-- Tabelheader -->
        <div class="tabel-header">
          <div class="col-competentie">
            <span>Competentie</span>
          </div>
          <div class="col-omschrijving">
            <span>Omschrijving</span>
          </div>
          <div class="col-gewicht">
            <span>Gewicht</span>
          </div>
          <div class="col-acties">
            <!-- leeg -->
          </div>
        </div>

        <div class="tabel-divider"></div>

        <!-- Laadindicator -->
        <div v-if="bezig" class="tabel-rij">
          <p class="text-secondary text-sm">Laden…</p>
        </div>

        <!-- Lege staat -->
        <div v-else-if="competenties.length === 0" class="tabel-rij">
          <p class="text-secondary text-sm">
            Geen competenties gevonden voor deze opleiding.
          </p>
        </div>

        <!-- Rijen -->
        <template v-else>
          <div
            v-for="(comp, index) in competenties"
            :key="comp.id"
          >
            <!-- Normale weergave -->
            <div v-if="bewerkId !== comp.id" class="tabel-rij tabel-rij-hover">
              <div class="col-competentie">
                <span class="font-semibold">{{ comp.naam }}</span>
              </div>
              <div class="col-omschrijving">
                <span class="text-secondary text-sm">{{ comp.omschrijving }}</span>
              </div>
              <div class="col-gewicht">
                <span class="gewicht-badge">{{ comp.gewicht }}%</span>
              </div>
              <div class="col-acties">
                <button class="btn btn-sm btn-secondary" @click="startBewerk(comp)">
                  Bewerken
                </button>
                <button class="btn btn-sm btn-danger" @click="verwijder(comp.id)">
                  Verwijderen
                </button>
              </div>
            </div>

            <!-- Inline bewerkrij -->
            <div v-else class="tabel-rij bewerk-rij">
              <div class="col-competentie">
                <input
                  v-model="bewerkData.naam"
                  class="form-input"
                  placeholder="Naam"
                />
              </div>
              <div class="col-omschrijving">
                <input
                  v-model="bewerkData.omschrijving"
                  class="form-input"
                  placeholder="Omschrijving"
                />
              </div>
              <div class="col-gewicht">
                <input
                  v-model.number="bewerkData.gewicht"
                  type="number"
                  min="0"
                  max="100"
                  class="form-input gewicht-input"
                />
              </div>
              <div class="col-acties">
                <button class="btn btn-sm btn-primary" @click="slaBewerkenOp">
                  Opslaan
                </button>
                <button class="btn btn-sm btn-secondary" @click="annuleerBewerk">
                  Annuleren
                </button>
              </div>
            </div>

            <div v-if="index < competenties.length - 1" class="tabel-divider"></div>
          </div>
        </template>

        <div class="tabel-divider"></div>

        <!-- Footer: totaal + toevoegen-knop -->
        <div class="tabel-footer">
          <div class="flex items-center gap-8">
            <span class="text-secondary text-sm">Totaal gewicht:</span>
            <span
              class="totaal-badge"
              :class="totaalOk ? 'totaal-ok' : 'totaal-nok'"
            >
              {{ totaalGewicht }}% {{ totaalOk ? '✓' : '✗' }}
            </span>
          </div>
          <button class="btn btn-sm btn-secondary" @click="openModal">
            + Competentie toevoegen
          </button>
        </div>
      </div>

    </main>

    <!-- Modal: nieuw toevoegen -->
    <div v-if="toonModal" class="modal-overlay" @click.self="sluitModal">
      <div class="modal-card">
        <h2 class="modal-title">Competentie toevoegen</h2>
        <p class="text-secondary text-sm" style="margin-bottom: 20px;">
          Voeg een nieuwe competentie toe voor
          <strong>{{ geselecteerdeOpleiding.naam }}</strong>.
        </p>

        <div class="form-group">
          <label>Naam</label>
          <input
            v-model="nieuweComp.naam"
            class="form-input"
            placeholder="bijv. Technische vaardigheden"
          />
        </div>

        <div class="form-group" style="margin-top: 14px;">
          <label>Omschrijving</label>
          <textarea
            v-model="nieuweComp.omschrijving"
            class="form-input"
            rows="3"
            placeholder="Korte omschrijving van de competentie…"
          ></textarea>
        </div>

        <div class="form-group" style="margin-top: 14px;">
          <label>Gewicht (%)</label>
          <input
            v-model.number="nieuweComp.gewicht"
            type="number"
            min="0"
            max="100"
            class="form-input"
            placeholder="bijv. 25"
          />
        </div>

        <p v-if="modalFout" class="form-error" style="margin-top: 8px;">
          {{ modalFout }}
        </p>

        <div class="flex gap-8" style="margin-top: 24px; justify-content: flex-end;">
          <button class="btn btn-secondary" @click="sluitModal">
            Annuleren
          </button>
          <button class="btn btn-primary" @click="voegToe">
            Toevoegen
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* ── Opleiding-tabs ─────────────────────────────────────────────────────────── */
.opleiding-tabs {
  display: flex;
  gap: 4px;
}

.opleiding-tab {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  transition: background 0.15s, color 0.15s;
}

.opleiding-tab:hover {
  background: var(--gray50);
  color: var(--text-primary);
}

.opleiding-tab.active {
  background: #000;
  color: #fff;
}

/* ── Tabel ──────────────────────────────────────────────────────────────────── */
.tabel-header {
  display: flex;
  align-items: center;
  padding: 13px 24px;
  background: var(--gray50);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.tabel-divider {
  height: 1px;
  background: var(--border);
}

.tabel-rij {
  display: flex;
  align-items: center;
  padding: 18px 24px;
  background: #fff;
  gap: 0;
}

.tabel-rij-hover:hover {
  background: #fafafa;
}

.bewerk-rij {
  background: #fafffe;
}

.tabel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--gray50);
}

/* ── Kolommen ──────────────────────────────────────────────────────────────── */
.col-competentie {
  width: 280px;
  flex-shrink: 0;
  font-size: 14px;
}

.col-omschrijving {
  flex: 1;
  font-size: 13px;
  padding-right: 16px;
}

.col-gewicht {
  width: 90px;
  flex-shrink: 0;
}

.col-acties {
  width: 200px;
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* ── Gewicht-badge ─────────────────────────────────────────────────────────── */
.gewicht-badge {
  display: inline-flex;
  padding: 4px 10px;
  background: var(--gray50);
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.gewicht-input {
  width: 70px;
  padding: 6px 10px;
  font-size: 13px;
}

/* ── Totaal-badge ──────────────────────────────────────────────────────────── */
.totaal-badge {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
}

.totaal-ok {
  background: #dcf5e5;
  color: #16a34a;
}

.totaal-nok {
  background: var(--red-bg);
  color: var(--red);
}

/* ── Feedbackbericht ───────────────────────────────────────────────────────── */
.bericht {
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
}

.bericht-success {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #dcfce7;
}

.bericht-error {
  background: var(--red-bg);
  color: var(--red);
  border: 1px solid #fca5a5;
}

/* ── Modal ─────────────────────────────────────────────────────────────────── */
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
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 4px;
  color: var(--text-primary);
}

/* ── Buttons aanpassen voor kleinere tabelknoppen ──────────────────────────── */
.col-acties .btn-sm {
  font-size: 12px;
  padding: 5px 12px;
}
</style>