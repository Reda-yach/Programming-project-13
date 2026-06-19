<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import TopBar from '../components/TopBar.vue'

const route = useRoute()
const API = 'http://localhost:3000/api'

const navLinks = ref([
  { label: 'Studenten', to: '/mentor' },
  { label: 'Logboeken', to: '/mentor/logboeken' },
  { label: 'Evaluatie', to: '/mentor/evaluatie' },
])

const SCORE_NIVEAUS = [5, 3, 1, 0]

const evaluaties = ref([])
const stagiairs = ref([])
const geselecteerde = ref(null)
const rijen = ref([])            // per competentie: student- + mentorscore
const studentIngediend = ref(false)
const mentorIngediend = ref(false)
const opmerking = ref('')
const bezig = ref(false)
const bericht = ref('')
const laadFout = ref('')
const gebruiker = JSON.parse(localStorage.getItem('gebruiker'))

// Eenmaal ingediend is de mentor-evaluatie vergrendeld en volledig read-only.
const isIngediend = computed(() => mentorIngediend.value)
// Indienen kan pas als elke competentie een score heeft.
const aantalOpen = computed(() => rijen.value.filter((r) => r.mentorScore == null).length)
const allesIngevuld = computed(() => rijen.value.length > 0 && aantalOpen.value === 0)

onMounted(async () => {
  await Promise.all([laadStagiairs(), laadEvaluaties()])
  // Kwam je via een tussentijds/eind-knop op de studentenpagina? Open dan
  // meteen de juiste evaluatie voor die student + fase.
  const { stage, fase } = route.query
  if (stage && fase) await openVoorFase(stage, fase)
})

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function formatDatum(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Beschikbaarheid per fase, identiek aan de student- en studentenpagina:
// - tussentijds: vanaf het midden van de stageperiode
// - eind: vanaf 2 weken vóór de einddatum
function evalBeschikbaarheid(s) {
  if (!s.startdatum || !s.einddatum) {
    return { tussentijds: { beschikbaar: false, vanaf: null }, eind: { beschikbaar: false, vanaf: null } }
  }
  const start = new Date(s.startdatum).getTime()
  const eind = new Date(s.einddatum).getTime()
  const nu = Date.now()
  return {
    tussentijds: { beschikbaar: nu >= (start + eind) / 2, vanaf: new Date((start + eind) / 2) },
    eind: { beschikbaar: nu >= eind - 2 * WEEK_MS, vanaf: new Date(eind - 2 * WEEK_MS) },
  }
}

// De (eventuele) mentor-evaluatie van deze stage voor een fase.
function mentorEval(stageId, fase) {
  return evaluaties.value.find(
    (e) => String(e.stage_id) === String(stageId) && e.fase === fase,
  )
}

// Knoplabel afhankelijk van de status: nog niets, bezig of ingediend.
function knopLabel(stageId, fase) {
  const ev = mentorEval(stageId, fase)
  if (ev?.ingediend) return 'Bekijken →'
  if (ev) return 'Verder invullen →'
  return 'Invullen →'
}

async function laadStagiairs() {
  try {
    const res = await fetch(`${API}/mentors/${gebruiker.id}/stagiairs`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
    if (res.ok) stagiairs.value = await res.json()
  } catch {
    laadFout.value = 'Studenten konden niet geladen worden.'
  }
}

function token() {
  return localStorage.getItem('token')
}

// Opent de mentor-evaluatie voor een specifieke stage + fase.
// Bestaat ze nog niet, dan wordt ze eerst aangemaakt.
async function openVoorFase(stageId, fase) {
  let match = evaluaties.value.find(
    (e) => String(e.stage_id) === String(stageId) && e.fase === fase,
  )
  if (!match) {
    try {
      await fetch(`${API}/stages/${stageId}/evaluatie/aanmaken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ fase, type: 'mentor' }),
      })
      await laadEvaluaties()
      match = evaluaties.value.find(
        (e) => String(e.stage_id) === String(stageId) && e.fase === fase,
      )
    } catch {
      laadFout.value = 'Evaluatie kon niet geopend worden.'
    }
  }
  if (match) await selecteer(match)
}

async function laadEvaluaties() {
  laadFout.value = ''
  try {
    const res = await fetch(`${API}/mentors/${gebruiker.id}/evaluaties`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
    if (!res.ok) throw new Error('Ophalen mislukt')
    evaluaties.value = await res.json()
  } catch {
    laadFout.value = 'Evaluaties konden niet geladen worden.'
  }
}

// Laadt het vergelijkingsoverzicht: per competentie de zelfevaluatie van de
// student naast de (eigen) mentorscore.
async function selecteer(evaluatie) {
  geselecteerde.value = evaluatie
  bericht.value = ''
  opmerking.value = evaluatie.opmerking || ''
  rijen.value = []
  studentIngediend.value = false
  mentorIngediend.value = false
  try {
    const res = await fetch(
      `${API}/stages/${evaluatie.stage_id}/evaluatie/vergelijking?fase=${evaluatie.fase}`,
      { headers: { Authorization: `Bearer ${token()}` } },
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Laden mislukt')

    studentIngediend.value = !!data.evaluaties?.student?.ingediend
    mentorIngediend.value = !!data.evaluaties?.mentor?.ingediend
    rijen.value = (data.competenties || []).map((c) => ({
      competentie_id: c.competentie_id,
      naam: c.naam,
      omschrijving: c.omschrijving,
      rubrieken: c.rubrieken || [],
      studentScore: c.student?.score ?? null,
      studentToelichting: c.student?.toelichting ?? '',
      mentorScore: c.mentor?.score ?? null,
      mentorToelichting: c.mentor?.toelichting ?? '',
    }))
  } catch (e) {
    laadFout.value = e.message
  }
}

function terugNaarLijst() {
  geselecteerde.value = null
  rijen.value = []
  bericht.value = ''
  opmerking.value = ''
}

function rubriekTekst(rij, punt) {
  return rij.rubrieken.find((r) => r.punt === punt)?.beschrijving || ''
}

// Mentorscore voor één competentie zetten + opslaan (toggle bij herklik).
async function zetMentorScore(rij, punt) {
  if (isIngediend.value) return
  rij.mentorScore = rij.mentorScore === punt ? null : punt
  await bewaarRij(rij)
}

async function bewaarRij(rij) {
  if (isIngediend.value) return
  await fetch(`${API}/evaluaties/${geselecteerde.value.evaluatie_id}/competentie/${rij.competentie_id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
    body: JSON.stringify({ score: rij.mentorScore ?? null, toelichting: rij.mentorToelichting ?? null }),
  })
}

const totaalScore = computed(() => rijen.value.reduce((sum, r) => sum + (r.mentorScore || 0), 0))
const studentTotaal = computed(() => rijen.value.reduce((sum, r) => sum + (r.studentScore || 0), 0))
const maxScore = computed(() => rijen.value.length * 5)

// Algemene opmerking + totaalscore tussentijds opslaan (autosave op de feedback).
async function bewaarOpmerking() {
  if (isIngediend.value) return
  await fetch(`${API}/evaluaties/${geselecteerde.value.evaluatie_id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
    body: JSON.stringify({ totaalscore: totaalScore.value, opmerking: opmerking.value }),
  })
}

// Evaluatie definitief indienen: slaat de laatste stand op, vergrendelt ze
// server-side en zet de view op read-only. Kan maar één keer.
async function indienen() {
  if (isIngediend.value || bezig.value) return
  bezig.value = true
  bericht.value = ''
  laadFout.value = ''
  try {
    await fetch(`${API}/evaluaties/${geselecteerde.value.evaluatie_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ totaalscore: totaalScore.value, opmerking: opmerking.value }),
    })
    const res = await fetch(`${API}/evaluaties/${geselecteerde.value.evaluatie_id}/indienen`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token()}` },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Indienen mislukt')
    mentorIngediend.value = true
    geselecteerde.value.totaalscore = totaalScore.value
    geselecteerde.value.ingediend = 1
    bericht.value = 'Evaluatie ingediend! Ze is nu vergrendeld.'
    await laadEvaluaties()
  } catch (e) {
    laadFout.value = e.message
  } finally {
    bezig.value = false
  }
}

function faseLabel(fase) {
  if (fase === 'tussentijds') return 'Tussentijdse evaluatie'
  if (fase === 'finaal') return 'Eindevaluatie'
  return 'Evaluatie'
}
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />
    <main class="content">

      <!-- Overzicht: één kaart per student met een tussentijdse en een eindevaluatie -->
      <div v-if="!geselecteerde">
        <h1 class="page-title">Evaluaties</h1>
        <p class="text-secondary text-sm mt-8 mb-24">
          Vul per student de tussentijdse en de eindevaluatie in. Een knop blijft
          vergrendeld tot de evaluatieperiode start.
        </p>

        <p v-if="laadFout" class="text-secondary mt-16" style="color:#dc2626;">{{ laadFout }}</p>

        <div v-if="stagiairs.length === 0 && !laadFout" class="card mt-16">
          <p class="text-secondary">Geen studenten gevonden.</p>
        </div>

        <div v-for="s in stagiairs" :key="s.stage_id" class="card mt-16">
          <h2 class="form-section-title">{{ s.voornaam }} {{ s.student_naam }}</h2>
          <p class="text-secondary text-sm mt-4">{{ s.bedrijf }}</p>

          <div class="eval-knoppen mt-16">
            <!-- Tussentijdse evaluatie -->
            <div class="eval-blok">
              <p class="eval-titel">Tussentijdse evaluatie</p>
              <template v-if="evalBeschikbaarheid(s).tussentijds.beschikbaar">
                <button class="btn btn-primary btn-sm" @click="openVoorFase(s.stage_id, 'tussentijds')">
                  {{ knopLabel(s.stage_id, 'tussentijds') }}
                </button>
              </template>
              <template v-else>
                <button class="btn btn-secondary btn-sm" disabled>🔒 Vergrendeld</button>
                <p class="text-secondary text-xs mt-4">
                  Vanaf {{ formatDatum(evalBeschikbaarheid(s).tussentijds.vanaf) }}
                </p>
              </template>
            </div>

            <!-- Eindevaluatie -->
            <div class="eval-blok">
              <p class="eval-titel">Eindevaluatie</p>
              <template v-if="evalBeschikbaarheid(s).eind.beschikbaar">
                <button class="btn btn-primary btn-sm" @click="openVoorFase(s.stage_id, 'finaal')">
                  {{ knopLabel(s.stage_id, 'finaal') }}
                </button>
              </template>
              <template v-else>
                <button class="btn btn-secondary btn-sm" disabled>🔒 Vergrendeld</button>
                <p class="text-secondary text-xs mt-4">
                  Vanaf {{ formatDatum(evalBeschikbaarheid(s).eind.vanaf) }}
                </p>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Detail: twee kolommen (student links, mentor rechts) -->
      <div v-else>
        <button class="btn btn-secondary mb-16" @click="terugNaarLijst">
          ← Evaluaties
        </button>

        <div class="flex items-center gap-16">
          <h1 class="page-title" style="margin-bottom:0;">{{ faseLabel(geselecteerde.fase) }}</h1>
          <span v-if="isIngediend" class="badge badge-green badge-pill">Ingediend</span>
        </div>
        <p class="text-secondary text-sm mt-4 mb-16">
          {{ geselecteerde.voornaam }} {{ geselecteerde.student_naam }} — {{ geselecteerde.bedrijf }}
        </p>

        <div
          v-if="isIngediend"
          class="card mb-16"
          style="background:#f0fdf4;border:1px solid #bbf7d0;"
        >
          <p class="text-sm" style="color:#15803d;">
            🔒 Deze evaluatie is ingediend en kan niet meer aangepast worden.
          </p>
        </div>

        <div
          v-if="!isIngediend && !studentIngediend"
          class="card mb-16"
          style="background:#fffbeb;border:1px solid #fde68a;"
        >
          <p class="text-sm" style="color:#92400e;">
            ⚠️ De student heeft de zelfevaluatie nog niet ingediend. Je ziet hieronder
            wat er al ingevuld is; dit kan nog wijzigen.
          </p>
        </div>

        <!-- ====== INVULMODUS (nog niet ingediend) ====== -->
        <template v-if="!isIngediend">
          <!-- Per competentie -->
          <div v-for="rij in rijen" :key="rij.competentie_id" class="card mt-16">
            <h2 class="form-section-title">{{ rij.naam }}</h2>
            <p v-if="rij.omschrijving" class="criteria-omschrijving mt-4">{{ rij.omschrijving }}</p>

            <div class="vergelijk-grid mt-12">

              <!-- Zelfevaluatie student (read-only) -->
              <div class="kolom kolom-student">
                <p class="kolom-titel">Zelfevaluatie student</p>
                <p class="score-regel">
                  Score:
                  <strong v-if="rij.studentScore != null">{{ rij.studentScore }}/5</strong>
                  <span v-else class="text-secondary">— niet ingevuld</span>
                </p>
                <p v-if="rij.studentToelichting" class="toelichting-tekst">
                  {{ rij.studentToelichting }}
                </p>
                <p v-else class="text-secondary text-xs" style="font-style:italic;">
                  Geen toelichting gegeven.
                </p>
              </div>

              <!-- Beoordeling mentor (bewerkbaar) -->
              <div class="kolom kolom-mentor">
                <p class="kolom-titel">Jouw beoordeling</p>
                <div class="flex gap-8 mt-4" style="flex-wrap:wrap;">
                  <button
                    v-for="punt in SCORE_NIVEAUS"
                    :key="punt"
                    class="btn btn-sm"
                    :class="rij.mentorScore === punt ? 'btn-primary' : 'btn-secondary'"
                    :title="rubriekTekst(rij, punt)"
                    @click="zetMentorScore(rij, punt)"
                  >
                    {{ punt }}
                  </button>
                </div>
                <div v-if="rij.rubrieken.length" class="rubriek-lijst mt-8">
                  <div
                    v-for="r in rij.rubrieken"
                    :key="r.punt"
                    class="rubriek-regel"
                    :class="{ actief: rij.mentorScore === r.punt }"
                  >
                    <span class="rubriek-punt">{{ r.punt }}</span>
                    <span>{{ r.beschrijving }}</span>
                  </div>
                </div>
                <textarea
                  v-model="rij.mentorToelichting"
                  class="form-input mt-8"
                  rows="2"
                  placeholder="Feedback op deze competentie…"
                  @change="bewaarRij(rij)"
                ></textarea>
              </div>

            </div>
          </div>

          <!-- Algemene feedback -->
          <div class="card mt-16">
            <h2 class="form-section-title">Algemene feedback</h2>
            <div class="form-group mt-12">
              <textarea
                v-model="opmerking"
                rows="4"
                class="form-input"
                placeholder="Geef algemene feedback op de stage en de stagiair…"
                @change="bewaarOpmerking"
              ></textarea>
            </div>
          </div>

          <!-- Totaal en indienen -->
          <div class="card mt-16 flex items-center gap-16" style="flex-wrap:wrap;">
            <span>
              Totaalscore: <strong>{{ totaalScore }}</strong> / {{ maxScore }}
            </span>
            <div style="margin-left:auto;display:flex;align-items:center;gap:12px;">
              <span v-if="!allesIngevuld" class="text-secondary text-sm">
                Nog {{ aantalOpen }} competentie{{ aantalOpen === 1 ? '' : 's' }} in te vullen
              </span>
              <button
                class="btn btn-primary"
                :disabled="bezig || !allesIngevuld"
                @click="indienen"
              >
                {{ bezig ? 'Bezig...' : 'Evaluatie indienen →' }}
              </button>
            </div>
          </div>
        </template>

        <!-- ====== SAMENVATTING (na indienen): zelfevaluatie + mentor naast elkaar ====== -->
        <template v-else>
          <div v-for="rij in rijen" :key="rij.competentie_id" class="card mt-16">
            <h2 class="form-section-title">{{ rij.naam }}</h2>
            <p v-if="rij.omschrijving" class="criteria-omschrijving mt-4">{{ rij.omschrijving }}</p>

            <div class="vergelijk-grid mt-12">
              <!-- Zelfevaluatie student -->
              <div class="kolom kolom-student">
                <p class="kolom-titel">Zelfevaluatie student</p>
                <p class="score-regel">
                  Score:
                  <strong v-if="rij.studentScore != null">{{ rij.studentScore }} / 5</strong>
                  <span v-else class="text-secondary">— niet ingevuld</span>
                </p>
                <p v-if="rij.studentToelichting" class="toelichting-tekst mt-8">{{ rij.studentToelichting }}</p>
                <p v-else class="text-secondary text-xs" style="font-style:italic;">Geen toelichting gegeven.</p>
              </div>

              <!-- Beoordeling mentor -->
              <div class="kolom kolom-mentor">
                <p class="kolom-titel">Beoordeling mentor</p>
                <p class="score-regel">
                  Score:
                  <strong v-if="rij.mentorScore != null">{{ rij.mentorScore }} / 5</strong>
                  <span v-else class="text-secondary">— niet ingevuld</span>
                </p>
                <p v-if="rij.mentorToelichting" class="toelichting-tekst mt-8">{{ rij.mentorToelichting }}</p>
                <p v-else class="text-secondary text-xs" style="font-style:italic;">Geen toelichting gegeven.</p>
              </div>
            </div>
          </div>

          <!-- Algemene feedback mentor -->
          <div v-if="opmerking" class="card mt-16">
            <h2 class="form-section-title">Algemene feedback</h2>
            <p class="toelichting-tekst mt-8">{{ opmerking }}</p>
          </div>

          <!-- Totalen -->
          <div class="card mt-16 flex items-center gap-16" style="flex-wrap:wrap;">
            <span>Totaal student: <strong>{{ studentTotaal }}</strong> / {{ maxScore }}</span>
            <span>Totaal mentor: <strong>{{ totaalScore }}</strong> / {{ maxScore }}</span>
          </div>
        </template>

      </div>

    </main>
  </div>
</template>

<style scoped>
.eval-knoppen {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.eval-blok {
  flex: 1;
  min-width: 200px;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 8px;
  padding: 12px 14px;
}
.eval-titel {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
}

.vergelijk-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.kolom {
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 8px;
  padding: 12px 14px;
}

.kolom-student {
  background: var(--gray50, #f9fafb);
}

.kolom-titel {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 8px;
}

.criteria-omschrijving {
  font-size: 16px;
  line-height: 1.55;
  color: var(--text-primary, #111);
}

.score-regel {
  font-size: 12px;
  margin-bottom: 6px;
}

.toelichting-tekst {
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.rubriek-lijst {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rubriek-regel {
  display: flex;
  gap: 8px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-secondary, #6b7280);
  padding: 4px 6px;
  border-radius: 4px;
}

.rubriek-regel.actief {
  background: #111;
  color: #fff;
  font-weight: 600;
}

.rubriek-punt {
  min-width: 14px;
  font-weight: 700;
}

@media (max-width: 640px) {
  .vergelijk-grid {
    grid-template-columns: 1fr;
  }
}
</style>
