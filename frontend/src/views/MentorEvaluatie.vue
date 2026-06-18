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
const geselecteerde = ref(null)
const rijen = ref([])            // per competentie: student- + mentorscore
const studentIngediend = ref(false)
const opmerking = ref('')
const bezig = ref(false)
const bericht = ref('')
const laadFout = ref('')
const gebruiker = JSON.parse(localStorage.getItem('gebruiker'))

onMounted(async () => {
  await laadEvaluaties()
  // Kwam je via een tussentijds/eind-knop op de studentenpagina? Open dan
  // meteen de juiste evaluatie voor die student + fase.
  const { stage, fase } = route.query
  if (stage && fase) await openVoorFase(stage, fase)
})

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
  try {
    const res = await fetch(
      `${API}/stages/${evaluatie.stage_id}/evaluatie/vergelijking?fase=${evaluatie.fase}`,
      { headers: { Authorization: `Bearer ${token()}` } },
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Laden mislukt')

    studentIngediend.value = !!data.evaluaties?.student?.ingediend
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
  rij.mentorScore = rij.mentorScore === punt ? null : punt
  await bewaarRij(rij)
}

async function bewaarRij(rij) {
  await fetch(`${API}/evaluaties/${geselecteerde.value.evaluatie_id}/competentie/${rij.competentie_id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
    body: JSON.stringify({ score: rij.mentorScore ?? null, toelichting: rij.mentorToelichting ?? null }),
  })
}

const totaalScore = computed(() => rijen.value.reduce((sum, r) => sum + (r.mentorScore || 0), 0))
const maxScore = computed(() => rijen.value.length * 5)

// Algemene opmerking + totaalscore opslaan.
async function slaOp() {
  bezig.value = true
  bericht.value = ''
  try {
    await fetch(`${API}/evaluaties/${geselecteerde.value.evaluatie_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ totaalscore: totaalScore.value, opmerking: opmerking.value }),
    })
    bericht.value = 'Evaluatie opgeslagen!'
    geselecteerde.value.totaalscore = totaalScore.value
    await laadEvaluaties()
  } catch {
    bericht.value = 'Opslaan mislukt.'
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

      <!-- Overzicht evaluaties -->
      <div v-if="!geselecteerde">
        <h1 class="page-title">Evaluaties</h1>

        <p v-if="laadFout" class="text-secondary mt-16" style="color:#dc2626;">{{ laadFout }}</p>

        <div v-if="evaluaties.length === 0 && !laadFout" class="card mt-24">
          <p class="text-secondary">Geen evaluaties beschikbaar.</p>
        </div>

        <div
          v-for="evaluatie in evaluaties"
          :key="evaluatie.evaluatie_id"
          class="card mt-16"
        >
          <div class="flex items-center gap-16">
            <h2 class="form-section-title">
              {{ evaluatie.voornaam }} {{ evaluatie.student_naam }}
            </h2>
            <span class="badge badge-yellow">{{ faseLabel(evaluatie.fase) }}</span>
          </div>
          <p class="text-secondary text-sm mt-4">{{ evaluatie.bedrijf }}</p>
          <p class="text-secondary text-sm">
            Totaalscore: <strong>{{ evaluatie.totaalscore ?? 'Nog niet ingevuld' }}</strong>
          </p>
          <button class="btn btn-primary mt-16" @click="selecteer(evaluatie)">
            Evaluatie invullen →
          </button>
        </div>
      </div>

      <!-- Detail: twee kolommen (student links, mentor rechts) -->
      <div v-else>
        <button class="btn btn-secondary mb-16" @click="terugNaarLijst">
          ← Evaluaties
        </button>

        <h1 class="page-title">{{ faseLabel(geselecteerde.fase) }}</h1>
        <p class="text-secondary text-sm mt-4 mb-8">
          {{ geselecteerde.voornaam }} {{ geselecteerde.student_naam }} — {{ geselecteerde.bedrijf }}
        </p>
        <p class="text-secondary text-xs mb-16">
          Rubric: 5 — Uitstekend &nbsp;|&nbsp; 3 — Goed &nbsp;|&nbsp; 1 — Voldoende &nbsp;|&nbsp; 0 — Niet aangetoond
        </p>

        <div
          v-if="!studentIngediend"
          class="card mb-16"
          style="background:#fffbeb;border:1px solid #fde68a;"
        >
          <p class="text-sm" style="color:#92400e;">
            ⚠️ De student heeft de zelfevaluatie nog niet ingediend. Je ziet hieronder
            wat er al ingevuld is; dit kan nog wijzigen.
          </p>
        </div>

        <div v-if="bericht" class="card mb-16" style="background:#f0fdf4;border:1px solid #bbf7d0;">
          <p class="font-semibold" style="color:#15803d;">{{ bericht }}</p>
        </div>

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
            ></textarea>
          </div>
        </div>

        <!-- Totaal en opslaan -->
        <div class="card mt-16 flex items-center gap-16">
          <span>
            Totaalscore: <strong>{{ totaalScore }}</strong> / {{ maxScore }}
          </span>
          <button class="btn btn-primary" style="margin-left:auto;" @click="slaOp" :disabled="bezig">
            {{ bezig ? 'Bezig...' : 'Evaluatie opslaan' }}
          </button>
        </div>

      </div>

    </main>
  </div>
</template>

<style scoped>
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
