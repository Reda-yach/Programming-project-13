<script setup>
// Read-only vergelijking van een evaluatie voor één stage + fase:
// per competentie de zelfevaluatie van de student naast de beoordeling van de
// mentor. Herbruikbaar door student (eigen stage) en docent (per student).
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import { useStageStore } from '../stores/stage'

const route = useRoute()
const router = useRouter()
const stageStore = useStageStore()
const API = 'http://localhost:3000/api'

const fase = route.params.fase
const titel = fase === 'tussentijds' ? 'Tussentijdse evaluatie' : 'Eindevaluatie'

// Student bekijkt zijn eigen stage (uit de store); docent geeft de stageId mee
// via de route. Vandaar deze fallback.
const isDocent = !!route.params.stageId
const navLinks = isDocent
  ? [
      { label: 'Studenten', to: '/docent-studenten' },
      { label: 'Logboek', to: '/docent-logboek-overzicht' },
      { label: 'Evaluaties', to: '/docent-evaluaties' },
      { label: 'Aanvragen', to: '/docent-aanvragen' },
    ]
  : [
      { label: 'Dashboard', to: '/student' },
      { label: 'Aanvraag', to: '/student/aanvraag' },
      { label: 'Logboek', to: '/student/logboek' },
      { label: 'Evaluatie', to: '/student/evaluatie' },
    ]

const laden = ref(true)
const fout = ref('')
const competenties = ref([])
const evaluatieMeta = ref({ student: null, mentor: null })

const stageId = ref(route.params.stageId || null)
const isFinaal = fase === 'finaal'

// Finale eindscore (docent).
const eindbeoordeling = ref(null)
const finaleScore = ref('')
const finaleMotivatie = ref('')
const eindBezig = ref(false)
const eindBericht = ref('')

const studentTotaal = computed(() =>
  competenties.value.reduce((s, c) => s + (c.student?.score ?? 0), 0),
)
const mentorTotaal = computed(() =>
  competenties.value.reduce((s, c) => s + (c.mentor?.score ?? 0), 0),
)
const maxScore = computed(() => competenties.value.length * 5)

async function laad() {
  laden.value = true
  fout.value = ''
  try {
    if (!stageId.value) {
      await stageStore.laad()
      stageId.value = stageStore.aanvraag?.stage_id
    }
    if (!stageId.value) throw new Error('Geen stage gevonden.')

    const token = localStorage.getItem('token')
    const res = await fetch(`${API}/stages/${stageId.value}/evaluatie/vergelijking?fase=${fase}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Laden mislukt')
    competenties.value = data.competenties || []
    evaluatieMeta.value = data.evaluaties || { student: null, mentor: null }

    if (isFinaal) await laadEindbeoordeling()
  } catch (e) {
    fout.value = e.message
  } finally {
    laden.value = false
  }
}

async function laadEindbeoordeling() {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API}/stages/${stageId.value}/eindbeoordeling`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return
  eindbeoordeling.value = await res.json()
  if (eindbeoordeling.value) {
    finaleScore.value = eindbeoordeling.value.score
    finaleMotivatie.value = eindbeoordeling.value.motivatie || ''
  }
}

async function bewaarEindscore() {
  eindBezig.value = true
  eindBericht.value = ''
  try {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API}/stages/${stageId.value}/eindbeoordeling`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ score: finaleScore.value, motivatie: finaleMotivatie.value }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Opslaan mislukt')
    eindBericht.value = 'Finale score opgeslagen!'
    await laadEindbeoordeling()
  } catch (e) {
    eindBericht.value = e.message
  } finally {
    eindBezig.value = false
  }
}

onMounted(laad)
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />
    <main class="content">

      <button class="btn btn-secondary mb-16" @click="router.back()">← Terug</button>

      <h1 class="page-title mb-16">{{ titel }} — beoordeling</h1>

      <div v-if="laden" class="text-secondary text-sm">Laden…</div>
      <div v-else-if="fout" style="color:#dc2626;font-size:14px;">{{ fout }}</div>

      <template v-else>
        <div
          v-if="!evaluatieMeta.mentor"
          class="card mb-16"
          style="background:#fffbeb;border:1px solid #fde68a;"
        >
          <p class="text-sm" style="color:#92400e;">
            De mentor heeft deze evaluatie nog niet ingevuld.
          </p>
        </div>

        <div v-for="c in competenties" :key="c.competentie_id" class="card mt-16">
          <h2 class="form-section-title">{{ c.naam }}</h2>
          <p v-if="c.omschrijving" class="criteria-omschrijving mt-4">{{ c.omschrijving }}</p>

          <div class="vergelijk-grid mt-12">
            <!-- Student -->
            <div class="kolom kolom-student">
              <p class="kolom-titel">Zelfevaluatie student</p>
              <p class="score-regel">
                Score:
                <strong v-if="c.student?.score != null">{{ c.student.score }} / 5</strong>
                <span v-else class="text-secondary">— niet ingevuld</span>
              </p>
              <div v-if="c.rubrieken?.length" class="rubriek-lijst">
                <div
                  v-for="r in c.rubrieken"
                  :key="r.punt"
                  class="rubriek-regel"
                  :class="{ actief: c.student?.score === r.punt }"
                >
                  <span class="rubriek-punt">{{ r.punt }}</span>
                  <span>{{ r.beschrijving }}</span>
                </div>
              </div>
              <p v-if="c.student?.toelichting" class="toelichting-tekst mt-8">{{ c.student.toelichting }}</p>
            </div>

            <!-- Mentor -->
            <div class="kolom kolom-mentor">
              <p class="kolom-titel">Beoordeling mentor</p>
              <p class="score-regel">
                Score:
                <strong v-if="c.mentor?.score != null">{{ c.mentor.score }} / 5</strong>
                <span v-else class="text-secondary">— niet ingevuld</span>
              </p>
              <div v-if="c.rubrieken?.length" class="rubriek-lijst">
                <div
                  v-for="r in c.rubrieken"
                  :key="r.punt"
                  class="rubriek-regel"
                  :class="{ actief: c.mentor?.score === r.punt }"
                >
                  <span class="rubriek-punt">{{ r.punt }}</span>
                  <span>{{ r.beschrijving }}</span>
                </div>
              </div>
              <p v-if="c.mentor?.toelichting" class="toelichting-tekst mt-8">{{ c.mentor.toelichting }}</p>
            </div>
          </div>
        </div>

        <div class="card mt-16 flex items-center gap-16" style="flex-wrap:wrap;">
          <span>Totaal student: <strong>{{ studentTotaal }}</strong> / {{ maxScore }}</span>
          <span>Totaal mentor: <strong>{{ mentorTotaal }}</strong> / {{ maxScore }}</span>
        </div>

        <!-- Finale score (enkel bij de eindevaluatie) -->
        <div v-if="isFinaal" class="card mt-16">
          <h2 class="form-section-title">Finale score docent</h2>

          <!-- Docent: bewerkbaar zolang er nog géén finale score is. Eenmaal
               gegeven is de score vergrendeld en verdwijnt het formulier. -->
          <template v-if="isDocent && !eindbeoordeling">
            <p class="text-secondary text-sm mt-4 mb-12">
              Geef op basis van de zelfevaluatie en de mentorbeoordeling een finale score (op 20).
              Let op: dit kan maar één keer.
            </p>
            <div class="flex items-center gap-12" style="flex-wrap:wrap;">
              <label class="text-sm">Score
                <input
                  v-model="finaleScore"
                  type="number" min="0" max="20" step="0.5"
                  class="form-input"
                  style="width:90px;margin-left:8px;"
                />
                <span class="text-secondary">/ 20</span>
              </label>
            </div>
            <textarea
              v-model="finaleMotivatie"
              rows="4"
              class="form-input mt-12"
              placeholder="Motivatie bij de finale score…"
            ></textarea>
            <div class="flex items-center gap-16 mt-12">
              <button class="btn btn-primary" :disabled="eindBezig" @click="bewaarEindscore">
                {{ eindBezig ? 'Bezig…' : 'Finale score opslaan' }}
              </button>
              <span v-if="eindBericht" class="text-sm" style="color:#dc2626;">{{ eindBericht }}</span>
            </div>
          </template>

          <!-- Read-only: zodra de score gegeven is (docent én student zien dit) -->
          <template v-else>
            <p v-if="eindbeoordeling">
              <span style="font-size:28px;font-weight:700;">{{ eindbeoordeling.score }}</span>
              <span class="text-secondary"> / 20</span>
            </p>
            <p v-if="eindbeoordeling?.motivatie" class="toelichting-tekst mt-8">{{ eindbeoordeling.motivatie }}</p>
            <p v-if="eindbeoordeling" class="text-secondary text-xs mt-8">
              🔒 De finale beoordeling is gegeven en kan niet meer aangepast worden.
            </p>
            <p v-if="!eindbeoordeling" class="text-secondary text-sm">
              De docent heeft nog geen finale score gegeven.
            </p>
          </template>
        </div>
      </template>

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
  font-size: 14px;
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
  margin-top: 4px;
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
