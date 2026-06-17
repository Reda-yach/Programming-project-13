<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import { useStageStore } from '../stores/stage'

const route = useRoute()
const router = useRouter()
const stageStore = useStageStore()
const token = localStorage.getItem('token')
const API = 'http://localhost:3000/api'

const fase = route.params.fase
const titel = fase === 'tussentijds' ? 'Tussentijdse evaluatie' : 'Eindevaluatie'

const navLinks = [
  { label: 'Dashboard', to: '/student' },
  { label: 'Aanvraag', to: '/student/aanvraag' },
  { label: 'Logboek', to: '/student/logboek' },
  { label: 'Evaluatie', to: '/student/evaluatie' },
]

const SCORE_LABELS = {
  5: { kort: '5 pt', lang: 'Uitstekend' },
  3: { kort: '3 pt', lang: 'Goed' },
  1: { kort: '1 pt', lang: 'Voldoende' },
  0: { kort: '0 pt', lang: 'Niet aangetoond' },
}

const huidigEval = ref(null)
const laden = ref(false)
const bezig = ref(false)
const fout = ref(null)

const stageId = computed(() => stageStore.aanvraag?.stage_id)
const isIngediend = computed(() => !!huidigEval.value?.ingediend)
const heeftRubrieken = computed(() =>
  huidigEval.value?.criteria?.some(c => c.rubrieken?.length > 0)
)

const totaalScore = computed(() => {
  if (!huidigEval.value?.criteria) return 0
  return huidigEval.value.criteria.reduce((sum, c) => sum + (c.score ?? 0), 0)
})
const maxScore = computed(() => {
  if (!huidigEval.value?.criteria) return 0
  return huidigEval.value.criteria.length * 5
})

function getRubriekBeschrijving(criterium, punt) {
  return criterium.rubrieken?.find(r => r.punt === punt)?.beschrijving || ''
}

async function laadOfMaakAan() {
  if (!stageId.value) return
  laden.value = true
  fout.value = null
  try {
    const overzichtRes = await fetch(`${API}/stages/${stageId.value}/evaluatie-overzicht`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const overzicht = await overzichtRes.json()
    const bestaande = overzicht.find(e => e.type === 'student' && e.fase === fase)

    if (bestaande) {
      await laadDetail(bestaande.evaluatie_id)
    } else {
      const aanmaakRes = await fetch(`${API}/stages/${stageId.value}/evaluatie/aanmaken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fase, type: 'student' }),
      })
      const data = await aanmaakRes.json()
      if (!aanmaakRes.ok) throw new Error(data.error || 'Aanmaken mislukt')
      await laadDetail(data.evaluatie_id)
    }
  } catch (e) {
    fout.value = e.message
  } finally {
    laden.value = false
  }
}

async function laadDetail(evaluatieId) {
  const res = await fetch(`${API}/evaluaties/${evaluatieId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Laden mislukt')
  huidigEval.value = data
}

async function setScore(criteriumId, score) {
  if (isIngediend.value) return
  const criterium = huidigEval.value.criteria.find(c => c.criterium_id === criteriumId)
  if (!criterium) return
  // Toggle: klik op reeds geselecteerde score = deselecteer
  criterium.score = criterium.score === score ? null : score
  await fetch(`${API}/evaluaties/criteria/${criteriumId}/score`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ score: criterium.score }),
  })
}

async function indienen() {
  if (isIngediend.value || bezig.value) return
  bezig.value = true
  fout.value = null
  try {
    await fetch(`${API}/evaluaties/${huidigEval.value.evaluatie_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ totaalscore: totaalScore.value, opmerking: null }),
    })
    const res = await fetch(`${API}/evaluaties/${huidigEval.value.evaluatie_id}/indienen`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Indienen mislukt')
    huidigEval.value.ingediend = 1
  } catch (e) {
    fout.value = e.message
  } finally {
    bezig.value = false
  }
}

onMounted(async () => {
  await stageStore.laad()
  await laadOfMaakAan()
})
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />
    <main class="content">

      <p class="breadcrumb" style="margin-bottom:8px;">
        <router-link to="/student/evaluatie">← Mijn evaluaties</router-link>
      </p>

      <div class="flex items-center gap-16" style="margin-bottom:4px;">
        <h1 class="page-title" style="margin-bottom:0;">{{ titel }}</h1>
        <span v-if="isIngediend" class="badge badge-green badge-pill">Ingediend</span>
      </div>
      <p class="text-secondary text-sm" style="margin-bottom:24px;">
        Klik op een scorekolom om je score te kiezen. Je kunt opnieuw klikken om te wijzigen.
      </p>

      <div v-if="laden" class="text-secondary text-sm">Laden…</div>
      <div v-else-if="fout" style="color:var(--red,#dc2626);font-size:14px;">{{ fout }}</div>

      <template v-else-if="huidigEval">
        <div class="rubric-scroll">
          <table class="rubric-table">
            <thead>
              <tr>
                <th rowspan="2" class="th-criteria">Criteria</th>
                <th v-if="heeftRubrieken" colspan="4" class="th-beoordelingen">Beoordelingen</th>
                <th v-else colspan="4" class="th-beoordelingen">Score</th>
                <th rowspan="2" class="th-punt">Punt</th>
              </tr>
              <tr>
                <th v-for="s in [5, 3, 1, 0]" :key="s" class="th-score">
                  <span class="score-label-pt">{{ SCORE_LABELS[s].kort }}</span>
                  <span class="score-label-naam">{{ SCORE_LABELS[s].lang }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in huidigEval.criteria" :key="c.criterium_id">
                <td class="td-criteria">
                  <span class="font-semibold">{{ c.competentie }}</span>
                  <div v-if="c.naam && c.naam !== c.competentie" class="text-xs text-secondary" style="margin-top:4px;font-weight:400;">
                    {{ c.naam }}
                  </div>
                </td>
                <td
                  v-for="s in [5, 3, 1, 0]"
                  :key="s"
                  class="td-score"
                  :class="{ 'score-selected': c.score === s, 'score-hover': !isIngediend }"
                  :style="isIngediend ? 'cursor:default;' : 'cursor:pointer;'"
                  @click="setScore(c.criterium_id, s)"
                >
                  <template v-if="getRubriekBeschrijving(c, s)">
                    {{ getRubriekBeschrijving(c, s) }}
                  </template>
                  <template v-else>
                    <span class="score-fallback">{{ s }}</span>
                  </template>
                </td>
                <td class="td-punt">
                  <span v-if="c.score != null" class="punt-waarde">{{ c.score }}</span>
                  <span v-else class="text-secondary">—</span>
                  <span class="text-secondary"> /5</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex items-center gap-16" style="margin-top:24px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:12px;">
            <span class="text-secondary text-sm">Totaalscore:</span>
            <strong style="font-size:22px;">{{ totaalScore }}</strong>
            <span class="text-secondary">/{{ maxScore }}</span>
          </div>
          <button
            v-if="!isIngediend"
            class="btn btn-primary"
            style="margin-left:auto;"
            :disabled="bezig"
            @click="indienen"
          >
            {{ bezig ? 'Bezig…' : 'Evaluatie indienen →' }}
          </button>
        </div>
        <p v-if="fout" style="color:var(--red,#dc2626);margin-top:8px;font-size:14px;">{{ fout }}</p>
      </template>

    </main>
  </div>
</template>

<style scoped>
.rubric-scroll {
  overflow-x: auto;
}

.rubric-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 700px;
}

/* Header */
.th-criteria {
  width: 180px;
  text-align: left;
  padding: 10px 14px;
  background: var(--gray50, #f9fafb);
  border: 1px solid var(--border, #e5e7eb);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #6b7280);
  vertical-align: bottom;
}

.th-beoordelingen {
  text-align: center;
  padding: 10px 14px;
  background: var(--gray50, #f9fafb);
  border: 1px solid var(--border, #e5e7eb);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #6b7280);
}

.th-punt {
  width: 70px;
  text-align: center;
  padding: 10px 14px;
  background: var(--gray50, #f9fafb);
  border: 1px solid var(--border, #e5e7eb);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #6b7280);
  vertical-align: bottom;
}

.th-score {
  text-align: center;
  padding: 8px 10px;
  background: var(--gray50, #f9fafb);
  border: 1px solid var(--border, #e5e7eb);
  min-width: 110px;
}

.score-label-pt {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary, #111);
}

.score-label-naam {
  display: block;
  font-size: 11px;
  font-weight: 400;
  color: var(--text-secondary, #6b7280);
  margin-top: 2px;
}

/* Body cells */
.td-criteria {
  padding: 14px;
  border: 1px solid var(--border, #e5e7eb);
  vertical-align: top;
  background: #fff;
}

.td-score {
  padding: 12px 14px;
  border: 1px solid var(--border, #e5e7eb);
  vertical-align: top;
  line-height: 1.5;
  color: var(--text-secondary, #6b7280);
  background: #fff;
  transition: background 0.1s, color 0.1s;
  font-size: 12px;
}

.score-hover:hover:not(.score-selected) {
  background: #f3f4f6;
  color: var(--text-primary, #111);
}

.score-selected {
  background: #111 !important;
  color: #fff !important;
}

.score-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1.5px solid var(--border, #e5e7eb);
  font-size: 13px;
  font-weight: 600;
  margin: 0 auto;
}

.score-selected .score-fallback {
  border-color: transparent;
}

.td-punt {
  text-align: center;
  padding: 12px 10px;
  border: 1px solid var(--border, #e5e7eb);
  vertical-align: middle;
  background: var(--gray50, #f9fafb);
  white-space: nowrap;
}

.punt-waarde {
  font-weight: 700;
  font-size: 15px;
}
</style>
