<script setup>
import { API_URL } from '@/api'
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import { useStageStore } from '../stores/stage'

const route = useRoute()
const router = useRouter()
const stageStore = useStageStore()
const token = localStorage.getItem('token')
const API = `${API_URL}/api`

const fase = route.params.fase
const titel = fase === 'tussentijds' ? 'Tussentijdse evaluatie' : 'Eindevaluatie'

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
  huidigEval.value?.competenties?.some(c => c.rubrieken?.length > 0)
)

const totaalScore = computed(() => {
  if (!huidigEval.value?.competenties) return 0
  return huidigEval.value.competenties.reduce((sum, c) => sum + (c.score ?? 0), 0)
})
const maxScore = computed(() => {
  if (!huidigEval.value?.competenties) return 0
  return huidigEval.value.competenties.length * 5
})

// Aantal competenties zonder score; indienen kan pas als dit 0 is.
const aantalOpen = computed(() => {
  if (!huidigEval.value?.competenties) return 0
  return huidigEval.value.competenties.filter(c => c.score == null).length
})
const allesIngevuld = computed(() =>
  !!huidigEval.value?.competenties?.length && aantalOpen.value === 0
)

function getRubriekBeschrijving(competentie, punt) {
  return competentie.rubrieken?.find(r => r.punt === punt)?.beschrijving || ''
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

async function setScore(competentieId, score) {
  if (isIngediend.value) return
  const competentie = huidigEval.value.competenties.find(c => c.competentie_id === competentieId)
  if (!competentie) return
  // Toggle: klik op reeds geselecteerde score = deselecteer
  competentie.score = competentie.score === score ? null : score
  await bewaarCompetentie(competentie)
}

// Slaat score + toelichting van één competentie op (upsert in evaluatie_score).
async function bewaarCompetentie(competentie) {
  if (isIngediend.value) return
  await fetch(`${API}/evaluaties/${huidigEval.value.evaluatie_id}/competentie/${competentie.competentie_id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ score: competentie.score ?? null, toelichting: competentie.toelichting ?? null }),
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
    <TopBar :links="stageStore.studentNavLinks" />
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
              <template v-for="c in huidigEval.competenties" :key="c.competentie_id">
              <tr>
                <td class="td-criteria">
                  <span class="font-semibold">{{ c.naam }}</span>
                  <div v-if="c.omschrijving" class="text-xs text-secondary" style="margin-top:4px;font-weight:400;">
                    {{ c.omschrijving }}
                  </div>
                </td>
                <td
                  v-for="s in [5, 3, 1, 0]"
                  :key="s"
                  class="td-score"
                  :class="{ 'score-selected': c.score === s, 'score-hover': !isIngediend }"
                  :style="isIngediend ? 'cursor:default;' : 'cursor:pointer;'"
                  @click="setScore(c.competentie_id, s)"
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
              <tr>
                <td class="td-toelichting" colspan="6">
                  <textarea
                    v-model="c.toelichting"
                    class="toelichting-input"
                    rows="2"
                    :readonly="isIngediend"
                    :placeholder="isIngediend ? '' : 'Toelichting: beschrijf hoe je deze competentie hebt aangetoond tijdens je stage…'"
                    @change="bewaarCompetentie(c)"
                  ></textarea>
                </td>
              </tr>
              </template>
            </tbody>
          </table>
        </div>

        <div class="flex items-center gap-16" style="margin-top:24px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:12px;">
            <span class="text-secondary text-sm">Totaalscore:</span>
            <strong style="font-size:22px;">{{ totaalScore }}</strong>
            <span class="text-secondary">/{{ maxScore }}</span>
          </div>
          <div v-if="!isIngediend" style="margin-left:auto;display:flex;align-items:center;gap:12px;">
            <span v-if="!allesIngevuld" class="text-secondary text-sm">
              Nog {{ aantalOpen }} competentie{{ aantalOpen === 1 ? '' : 's' }} in te vullen
            </span>
            <button
              class="btn btn-primary"
              :disabled="bezig || !allesIngevuld"
              @click="indienen"
            >
              {{ bezig ? 'Bezig…' : 'Evaluatie indienen →' }}
            </button>
          </div>
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

.td-toelichting {
  padding: 8px 14px 16px;
  border: 1px solid var(--border, #e5e7eb);
  border-top: none;
  background: #fff;
}

.toelichting-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  color: var(--text-primary, #111);
}

.toelichting-input:focus {
  outline: none;
  border-color: #111;
}

.toelichting-input[readonly] {
  background: var(--gray50, #f9fafb);
  color: var(--text-secondary, #6b7280);
}
</style>
