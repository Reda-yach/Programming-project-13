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
      { label: 'Dashboard', to: '/docent' },
      { label: 'Studenten', to: '/docent/studenten' },
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

function rubriekTekst(rij, punt) {
  return rij.rubrieken?.find((r) => r.punt === punt)?.beschrijving || ''
}

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
    let stageId = route.params.stageId
    if (!stageId) {
      await stageStore.laad()
      stageId = stageStore.aanvraag?.stage_id
    }
    if (!stageId) throw new Error('Geen stage gevonden.')

    const token = localStorage.getItem('token')
    const res = await fetch(`${API}/stages/${stageId}/evaluatie/vergelijking?fase=${fase}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Laden mislukt')
    competenties.value = data.competenties || []
    evaluatieMeta.value = data.evaluaties || { student: null, mentor: null }
  } catch (e) {
    fout.value = e.message
  } finally {
    laden.value = false
  }
}

onMounted(laad)
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />
    <main class="content">

      <button class="btn btn-secondary mb-16" @click="router.back()">← Terug</button>

      <h1 class="page-title" style="margin-bottom:4px;">{{ titel }} — beoordeling</h1>
      <p class="text-secondary text-xs mb-16">
        Rubric: 5 — Uitstekend &nbsp;|&nbsp; 3 — Goed &nbsp;|&nbsp; 1 — Voldoende &nbsp;|&nbsp; 0 — Niet aangetoond
      </p>

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
                <strong v-if="c.student?.score != null">{{ c.student.score }}/5</strong>
                <span v-else class="text-secondary">— niet ingevuld</span>
              </p>
              <p v-if="c.student?.toelichting" class="toelichting-tekst">{{ c.student.toelichting }}</p>
              <p v-else class="text-secondary text-xs" style="font-style:italic;">Geen toelichting.</p>
            </div>

            <!-- Mentor -->
            <div class="kolom kolom-mentor">
              <p class="kolom-titel">Beoordeling mentor</p>
              <p class="score-regel">
                Score:
                <strong v-if="c.mentor?.score != null">{{ c.mentor.score }}/5</strong>
                <span v-else class="text-secondary">— niet ingevuld</span>
              </p>
              <p v-if="c.mentor?.score != null && rubriekTekst(c, c.mentor.score)" class="text-xs text-secondary" style="margin-bottom:6px;">
                {{ rubriekTekst(c, c.mentor.score) }}
              </p>
              <p v-if="c.mentor?.toelichting" class="toelichting-tekst">{{ c.mentor.toelichting }}</p>
              <p v-else class="text-secondary text-xs" style="font-style:italic;">Geen feedback.</p>
            </div>
          </div>
        </div>

        <div class="card mt-16 flex items-center gap-16" style="flex-wrap:wrap;">
          <span>Totaal student: <strong>{{ studentTotaal }}</strong> / {{ maxScore }}</span>
          <span>Totaal mentor: <strong>{{ mentorTotaal }}</strong> / {{ maxScore }}</span>
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
@media (max-width: 640px) {
  .vergelijk-grid {
    grid-template-columns: 1fr;
  }
}
</style>
