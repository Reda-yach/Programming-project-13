<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import SignaturePad from '../components/SignaturePad.vue'
import OvereenkomstDocument from '../components/OvereenkomstDocument.vue'

const router = useRouter()

const navLinks = ref([
  { label: 'Studenten', to: '/mentor' },
  { label: 'Logboeken', to: '/mentor/logboeken' },
  { label: 'Evaluatie', to: '/mentor/evaluatie' },
])

const stagiairs = ref([])
const contracten = ref({})
const evaluaties = ref([])
const laden = ref(true)
const gebruiker = JSON.parse(localStorage.getItem('gebruiker'))

// Modal-status voor het tekenen/bekijken van een overeenkomst.
const modalStage = ref(null) // het stagiair-object waarvan de overeenkomst open staat
const modalModus = ref('bekijk') // 'teken' of 'bekijk'
const modalBericht = ref('')
const tekenBezig = ref(false)
const pad = ref(null)

const aantalTeTekenen = computed(
  () => stagiairs.value.filter((s) => contracten.value[s.stage_id] && !contracten.value[s.stage_id].getekend_mentor).length,
)
const aantalLogboekTeBevestigen = computed(
  () => stagiairs.value.filter((s) => s.logboek_status === 'ingediend').length,
)

onMounted(async () => {
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/mentors/${gebruiker.id}/stagiairs`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    stagiairs.value = await res.json()
    for (const s of stagiairs.value) {
      await laadContract(s.stage_id)
    }
    // Mentor-evaluaties ophalen om per stage/fase de ingediend-status te kennen.
    const evalRes = await fetch(`http://localhost:3000/api/mentors/${gebruiker.id}/evaluaties`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (evalRes.ok) evaluaties.value = await evalRes.json()
  } finally {
    laden.value = false
  }
})

// Is de mentor-evaluatie voor deze stage + fase al ingediend?
function evaluatieIngediend(stageId, fase) {
  const e = evaluaties.value.find(
    (ev) => String(ev.stage_id) === String(stageId) && ev.fase === fase,
  )
  return !!e?.ingediend
}

async function laadContract(stageId) {
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/contracten/${stageId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    contracten.value[stageId] = res.ok ? await res.json() : null
  } catch {
    contracten.value[stageId] = null
  }
}

function openOvereenkomst(stagiair, modus) {
  modalStage.value = stagiair
  modalModus.value = modus
  modalBericht.value = ''
}

function sluitModal() {
  modalStage.value = null
  modalBericht.value = ''
}

async function tekenContract() {
  const handtekening = pad.value?.getData()
  if (!handtekening) {
    modalBericht.value = 'Teken eerst je handtekening in het vak.'
    return
  }
  const stageId = modalStage.value.stage_id
  tekenBezig.value = true
  modalBericht.value = ''
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/contracten/${stageId}/tekenen`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ handtekening }),
    })
    const data = await res.json()
    if (!res.ok) {
      modalBericht.value = data.error || 'Tekenen mislukt.'
      return
    }
    await laadContract(stageId)
    // Na tekenen meteen naar de bekijk-weergave van de bijgewerkte overeenkomst.
    modalModus.value = 'bekijk'
  } catch {
    modalBericht.value = 'Er ging iets mis.'
  } finally {
    tekenBezig.value = false
  }
}

function logboekStatus(s) {
  if (s.logboek_status === 'goedgekeurd') return { tekst: 'Bevestigd', klasse: 'badge-green', actie: false }
  if (s.logboek_status === 'ingediend') return { tekst: 'Lees & bevestig →', klasse: 'btn-actie', actie: true }
  return { tekst: 'Niet ingediend', klasse: 'badge-grijs', actie: false }
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function formatDatum(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Zelfde beschikbaarheidslogica als bij de student (StudentEvaluatie.vue):
// - tussentijds: vanaf het midden van de stageperiode
// - eind: vanaf 2 weken vóór de einddatum
function evalBeschikbaarheid(s) {
  if (!s.startdatum || !s.einddatum) {
    return { tussentijds: { beschikbaar: false, vanaf: null }, eind: { beschikbaar: false, vanaf: null } }
  }
  const start = new Date(s.startdatum).getTime()
  const eind = new Date(s.einddatum).getTime()
  const nu = Date.now()
  const midden = new Date((start + eind) / 2)
  const eindVanaf = new Date(eind - 2 * WEEK_MS)
  return {
    tussentijds: { beschikbaar: nu >= midden.getTime(), vanaf: midden },
    eind: { beschikbaar: nu >= eindVanaf.getTime(), vanaf: eindVanaf },
  }
}

function naarEvaluatie(s, fase) {
  const b = evalBeschikbaarheid(s)
  const mag = fase === 'tussentijds' ? b.tussentijds.beschikbaar : b.eind.beschikbaar
  if (mag) router.push({ path: '/mentor/evaluatie', query: { stage: s.stage_id, fase } })
}
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />
    <main class="content">
      <h1 class="page-title">Studenten</h1>
      <p class="text-secondary text-sm mt-8">
        Welkom, {{ gebruiker?.voornaam }}. Bekijk hier uw overzicht voor vandaag.
      </p>

      <!-- Samenvattingskaarten -->
      <div class="overzicht-kaarten mt-24">
        <div class="card kaart">
          <div class="kaart-top">
            <span class="text-secondary text-sm">Contracten te tekenen</span>
            <span class="kaart-icoon">✍️</span>
          </div>
          <p class="kaart-getal">{{ aantalTeTekenen }}</p>
        </div>
        <div class="card kaart">
          <div class="kaart-top">
            <span class="text-secondary text-sm">Te bevestigen logboek</span>
            <span class="kaart-icoon">📖</span>
          </div>
          <p class="kaart-getal">{{ aantalLogboekTeBevestigen }}</p>
          <a class="kaart-link" @click="router.push('/mentor/logboeken')">Bekijk ›</a>
        </div>
      </div>

      <!-- Studententabel -->
      <div v-if="laden" class="card mt-24">
        <p class="text-secondary">Laden…</p>
      </div>
      <div v-else-if="stagiairs.length === 0" class="card mt-24">
        <p class="text-secondary">Geen stagiairs gevonden.</p>
      </div>

      <div v-else class="card mt-24" style="padding:0;overflow:hidden;">
        <table class="studenten-tabel">
          <thead>
            <tr>
              <th>Student</th>
              <th>Logboek</th>
              <th>Tussentijdse evaluatie</th>
              <th>Eindevaluatie</th>
              <th>Stageovereenkomst</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in stagiairs" :key="s.stage_id">
              <!-- Student -->
              <td>
                <div class="font-semibold">{{ s.voornaam }} {{ s.student_naam }}</div>
                <div class="text-secondary text-xs mt-4">{{ s.opleiding }} · {{ s.bedrijf }}</div>
              </td>

              <!-- Logboek -->
              <td>
                <button
                  v-if="logboekStatus(s).actie"
                  class="pill-knop pill-oranje"
                  @click="router.push('/mentor/logboeken')"
                >
                  {{ logboekStatus(s).tekst }}
                </button>
                <span v-else class="pill" :class="logboekStatus(s).klasse">{{ logboekStatus(s).tekst }}</span>
                <div v-if="s.logboek_status === 'ingediend'" class="text-secondary text-xs mt-4">
                  Wachtend op jouw bevestiging
                </div>
              </td>

              <!-- Tussentijdse evaluatie -->
              <td>
                <template v-if="evalBeschikbaarheid(s).tussentijds.beschikbaar">
                  <button class="pill-knop pill-zwart" @click="naarEvaluatie(s, 'tussentijds')">
                    {{ evaluatieIngediend(s.stage_id, 'tussentijds') ? 'Bekijken →' : 'Evalueren →' }}
                  </button>
                  <div class="text-secondary text-xs mt-4">
                    {{ evaluatieIngediend(s.stage_id, 'tussentijds') ? 'Ingediend ✓' : 'Wachtend op evaluatie van jou' }}
                  </div>
                </template>
                <template v-else>
                  <span class="pill badge-grijs">🔒 Niet beschikbaar</span>
                  <div class="text-secondary text-xs mt-4">
                    Beschikbaar vanaf {{ formatDatum(evalBeschikbaarheid(s).tussentijds.vanaf) }}
                  </div>
                </template>
              </td>

              <!-- Eindevaluatie -->
              <td>
                <template v-if="evalBeschikbaarheid(s).eind.beschikbaar">
                  <button class="pill-knop pill-zwart" @click="naarEvaluatie(s, 'finaal')">
                    {{ evaluatieIngediend(s.stage_id, 'finaal') ? 'Bekijken →' : 'Evalueren →' }}
                  </button>
                  <div class="text-secondary text-xs mt-4">
                    {{ evaluatieIngediend(s.stage_id, 'finaal') ? 'Ingediend ✓' : 'Wachtend op evaluatie van jou' }}
                  </div>
                </template>
                <template v-else>
                  <span class="pill badge-grijs">🔒 Niet beschikbaar</span>
                  <div class="text-secondary text-xs mt-4">
                    Beschikbaar vanaf {{ formatDatum(evalBeschikbaarheid(s).eind.vanaf) }}
                  </div>
                </template>
              </td>

              <!-- Stageovereenkomst -->
              <td>
                <template v-if="contracten[s.stage_id]">
                  <button
                    v-if="!contracten[s.stage_id].getekend_mentor"
                    class="pill-knop pill-zwart"
                    @click="openOvereenkomst(s, 'teken')"
                  >
                    Teken →
                  </button>
                  <span v-else class="pill badge-green">Getekend ✓</span>
                  <div class="mt-4">
                    <a class="tabel-link" @click="openOvereenkomst(s, 'bekijk')">Bekijk</a>
                  </div>
                </template>
                <span v-else class="pill badge-grijs">Nog niet beschikbaar</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <!-- Modal: overeenkomst tekenen / bekijken -->
    <div v-if="modalStage" class="modal-overlay" @click.self="sluitModal">
      <div class="modal-venster">
        <div class="modal-kop">
          <h2 style="font-size:18px;font-weight:700;">
            Stageovereenkomst — {{ modalStage.voornaam }} {{ modalStage.student_naam }}
          </h2>
          <button class="modal-sluit" @click="sluitModal">✕</button>
        </div>

        <div class="modal-body">
          <OvereenkomstDocument v-if="contracten[modalStage.stage_id]" :contract="contracten[modalStage.stage_id]" />

          <!-- Teken-sectie -->
          <div v-if="modalModus === 'teken' && contracten[modalStage.stage_id] && !contracten[modalStage.stage_id].getekend_mentor" class="card mt-16">
            <h3 class="form-section-title">Jouw handtekening</h3>
            <p class="text-secondary text-sm mt-4 mb-12">
              Door te ondertekenen bevestig je als stagementor akkoord te gaan met deze overeenkomst.
            </p>
            <SignaturePad ref="pad" />
            <p v-if="modalBericht" class="form-error mt-12">{{ modalBericht }}</p>
            <button class="btn btn-primary mt-12" :disabled="tekenBezig" @click="tekenContract">
              {{ tekenBezig ? 'Bezig...' : 'Contract ondertekenen' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overzicht-kaarten {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}
.kaart-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.kaart-icoon {
  font-size: 18px;
}
.kaart-getal {
  font-size: 32px;
  font-weight: 700;
  margin-top: 16px;
}
.kaart-link {
  display: inline-block;
  margin-top: 8px;
  color: #2563eb;
  font-size: 13px;
  cursor: pointer;
}

.studenten-tabel {
  width: 100%;
  border-collapse: collapse;
}
.studenten-tabel th {
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #64748b);
  background: #f8fafc;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border, #e2e8f0);
}
.studenten-tabel td {
  padding: 16px;
  border-bottom: 1px solid var(--border, #f1f5f9);
  vertical-align: top;
}
.studenten-tabel tr:last-child td {
  border-bottom: none;
}

.pill,
.pill-knop {
  display: inline-block;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 9999px;
  border: none;
}
.pill-knop {
  cursor: pointer;
}
.pill-zwart {
  background: #111827;
  color: #fff;
}
.pill-oranje {
  background: #ffedd5;
  color: #c2410c;
}
.badge-green {
  background: #dcfce7;
  color: #15803d;
}
.badge-grijs {
  background: #f1f5f9;
  color: #64748b;
}
.tabel-link {
  font-size: 13px;
  color: #2563eb;
  cursor: pointer;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 16px;
  overflow-y: auto;
  z-index: 50;
}
.modal-venster {
  background: #fff;
  border-radius: 12px;
  width: 100%;
  max-width: 720px;
}
.modal-kop {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border, #e2e8f0);
}
.modal-sluit {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #64748b;
}
.modal-body {
  padding: 20px;
}
</style>
