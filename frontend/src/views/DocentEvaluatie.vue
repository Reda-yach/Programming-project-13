<template>
  <div class="page">
    <AppTopbar active="evaluaties" />
    <main class="content">

      <p class="breadcrumb">
        <router-link to="/docent/studenten">← Mijn studenten</router-link>
      </p>

      <div v-if="laden" class="text-secondary">Laden...</div>
      <div v-else-if="fout" style="color:var(--red);">{{ fout }}</div>

      <div v-else-if="evaluatie">

        <!-- Rubric legenda -->
        <div class="flex gap-16 mt-8" style="font-size:13px;">
          <span><span style="color:#16a34a;">●</span> 5 – Uitstekend</span>
          <span><span style="color:#2563eb;">●</span> 3 – Goed</span>
          <span><span style="color:#d97706;">●</span> 1 – Onvoldoende</span>
          <span><span style="color:#dc2626;">●</span> 0 – Zeer slecht</span>
        </div>

        <!-- Header -->
        <div class="card mt-16">
          <div class="flex justify-between items-center">
            <div>
              <h1 style="font-size:22px;font-weight:700;">
                {{ evaluatie.type === 'tussentijds' ? 'Tussentijdse evaluatie' : 'Eindevaluatie' }}
              </h1>
              <p class="font-medium mt-4">{{ stage?.student_voornaam }} {{ stage?.student_naam }}</p>
              <p class="text-secondary text-sm">Opleiding: {{ stage?.opleiding }}</p>
              <p class="text-secondary text-sm">Stagegever: {{ stage?.bedrijf }}</p>
              <p class="text-secondary text-sm">
                Evaluatieperiode: {{ evaluatie.type === 'tussentijds' ? 'Tussentijdse evaluatie' : 'Eindevaluatie' }}
              </p>
            </div>

            <!-- Score cirkels -->
            <div class="flex gap-24">
              <div style="text-align:center;">
                <div style="width:56px;height:56px;border-radius:50%;border:3px solid #d97706;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;margin:0 auto;">
                  {{ studentTotaal }}
                </div>
                <p class="text-secondary text-xs mt-4">ZELFSCORE STUDENT</p>
              </div>
              <div style="text-align:center;">
                <div style="width:56px;height:56px;border-radius:50%;border:3px solid #2563eb;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;margin:0 auto;">
                  {{ mentorTotaal }}
                </div>
                <p class="text-secondary text-xs mt-4">SCORE MENTOR</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Criteria -->
        <div
          v-for="criterium in evaluatie.criteria"
          :key="criterium.criterium_id"
          class="card mt-16"
          style="display:grid;grid-template-columns:1fr 1fr;gap:24px;"
        >
          <!-- Links: student beoordeling -->
          <div>
            <p class="text-xs text-secondary" style="text-transform:uppercase;letter-spacing:0.5px;">Student Beoordeling</p>
            <h3 style="font-weight:700;margin-top:4px;">{{ criterium.naam }}</h3>
            <p class="text-secondary text-sm mt-4">{{ criterium.competentie }}</p>

            <!-- Student score knoppen readonly -->
            <div class="flex gap-8 mt-12">
              <button
                v-for="punt in [5, 3, 1, 0]"
                :key="punt"
                class="btn"
                :class="criterium.score === punt ? 'btn-primary' : 'btn-secondary'"
                style="opacity:0.7;cursor:default;"
                disabled
              >
                {{ punt }}
              </button>
            </div>

            <p class="text-sm mt-8">
              Student score:
              <span :style="{ color: scoreKleur(criterium.score) }">
                <strong>{{ scoreLabel(criterium.score) }}</strong>
              </span>
            </p>

            <!-- Zelfreflectie student -->
            <div class="mt-12">
              <p class="text-xs text-secondary" style="text-transform:uppercase;">Zelfreflectie van de student</p>
              <p class="text-sm mt-4" style="white-space:pre-line;color:#374151;">
                {{ criterium.zelfreflectie || 'Zelfbeoordeling: Beschrijf hoe je deze competentie hebt aangetoond in de eerste helft van je stage...' }}
              </p>
            </div>
          </div>

          <!-- Rechts: mentor beoordeling -->
          <div>
            <div class="flex justify-between items-center">
              <p class="text-xs text-secondary" style="text-transform:uppercase;letter-spacing:0.5px;">Mentor Beoordeling</p>
              <span v-if="criterium.mentor_score !== null" class="badge badge-green" style="font-size:11px;">✓ Opgeslagen</span>
              <span v-else class="badge badge-yellow" style="font-size:11px;">Nog niet ingevuld</span>
            </div>

            <p class="text-sm mt-8">
              Mentor score:
              <span :style="{ color: scoreKleur(criterium.mentor_score) }">
                <strong>{{ scoreLabel(criterium.mentor_score) }}</strong>
              </span>
            </p>

            <!-- Mentor score knoppen readonly -->
            <div class="flex gap-8 mt-8">
              <button
                v-for="punt in [5, 3, 1, 0]"
                :key="punt"
                class="btn"
                :class="criterium.mentor_score === punt ? 'btn-primary' : 'btn-secondary'"
                style="opacity:0.7;cursor:default;"
                disabled
              >
                {{ punt }}
              </button>
            </div>

            <!-- Mentor feedback -->
            <div class="mt-12">
              <p class="text-xs text-secondary" style="text-transform:uppercase;">Feedback & Observaties</p>
              <div
                class="mt-4"
                style="background:#f3f4f6;border-radius:6px;padding:12px;font-size:13px;min-height:48px;"
              >
                {{ criterium.mentor_feedback || 'Geen toevoeging.' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Totaal onderaan -->
        <div class="card mt-24 flex items-center gap-16">
          <span>Score: <strong>{{ mentorTotaal }}</strong> / {{ maxScore }}</span>
          <span class="badge" :class="evaluatie.ingediend ? 'badge-green' : 'badge-yellow'">
            {{ evaluatie.ingediend ? '✓ Finale score gegeven' : 'In behandeling' }}
          </span>
        </div>

      </div>

      <div v-else class="card mt-24">
        <p class="text-secondary">Geen evaluatie gevonden.</p>
      </div>

    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppTopbar from '@/components/AppTopbar.vue'

const route = useRoute()
const evaluatie = ref(null)
const stage = ref(null)
const laden = ref(true)
const fout = ref(null)
const API = 'http://localhost:3000/api'

const studentTotaal = computed(() => {
  if (!evaluatie.value?.criteria) return 0
  return evaluatie.value.criteria.reduce((sum, c) => sum + (c.score || 0), 0)
})

const mentorTotaal = computed(() => {
  if (!evaluatie.value?.criteria) return 0
  return evaluatie.value.criteria.reduce((sum, c) => sum + (c.mentor_score || 0), 0)
})

const maxScore = computed(() => {
  if (!evaluatie.value?.criteria) return 0
  return evaluatie.value.criteria.length * 5
})

onMounted(async () => {
  try {
    const token = localStorage.getItem('token')

    // Stage ophalen
    const stageRes = await fetch(`${API}/stages/${route.params.stageId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    stage.value = await stageRes.json()

    // Evaluaties van deze stage ophalen
    const evalRes = await fetch(`${API}/stages/${route.params.stageId}/evaluaties`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const evaluaties = await evalRes.json()

    // Juiste evaluatie kiezen op basis van type
    const type = route.params.type // 'tussentijds' of 'einde'
    const gevonden = evaluaties.find(e =>
      type === 'tussentijds' ? e.type === 'tussentijds' : e.type === 'finaal'
    )

    if (gevonden) {
      // Detail ophalen met criteria
      const detailRes = await fetch(`${API}/evaluaties/${gevonden.evaluatie_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      evaluatie.value = await detailRes.json()
    }
  } catch (e) {
    fout.value = e.message
  } finally {
    laden.value = false
  }
})

function scoreLabel(score) {
  if (score === 5) return '5 – Uitstekend'
  if (score === 3) return '3 – Goed'
  if (score === 1) return '1 – Onvoldoende'
  if (score === 0) return '0 – Zeer slecht'
  return 'Niet ingevuld'
}

function scoreKleur(score) {
  if (score === 5) return '#16a34a'
  if (score === 3) return '#2563eb'
  if (score === 1) return '#d97706'
  if (score === 0) return '#dc2626'
  return '#6b7280'
}
</script>
