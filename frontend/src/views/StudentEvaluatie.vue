<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import { useStageStore } from '../stores/stage'

const stageStore = useStageStore()
const router = useRouter()
const token = localStorage.getItem('token')
const API = 'http://localhost:3000/api'

const navLinks = computed(() =>
  stageStore.status === 'goedgekeurd'
    ? [
        { label: 'Dashboard', to: '/student' },
        { label: 'Aanvraag', to: '/student/aanvraag' },
        { label: 'Logboek', to: '/student/logboek' },
        { label: 'Evaluatie', to: '/student/evaluatie' },
      ]
    : [
        { label: 'Dashboard', to: '/student' },
        { label: 'Aanvraag', to: '/student/aanvraag' },
      ]
)

const evaluaties = ref([])
const laden = ref(false)

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

const beschikbaarheid = computed(() => {
  const s = stageStore.aanvraag
  if (!s?.startdatum || !s?.einddatum) {
    return { tussentijds: { beschikbaar: false, vanaf: null }, eind: { beschikbaar: false, vanaf: null } }
  }
  const start = new Date(s.startdatum)
  const eind = new Date(s.einddatum)
  const nu = new Date()
  return {
    tussentijds: {
      beschikbaar: nu >= new Date((start.getTime() + eind.getTime()) / 2),
      vanaf: new Date((start.getTime() + eind.getTime()) / 2),
    },
    eind: {
      beschikbaar: nu >= new Date(eind.getTime() - 2 * WEEK_MS),
      vanaf: new Date(eind.getTime() - 2 * WEEK_MS),
    },
  }
})

function formatDatum(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })
}

const tussentijdsEval = computed(() =>
  evaluaties.value.find(e => e.type === 'student' && e.fase === 'tussentijds')
)
const eindEval = computed(() =>
  evaluaties.value.find(e => e.type === 'student' && e.fase === 'finaal')
)

// Mentor-beoordeling per fase: zichtbaar zodra de mentor minstens één score gaf.
const mentorTussentijds = computed(() =>
  evaluaties.value.find(e => e.type === 'mentor' && e.fase === 'tussentijds')
)
const mentorEind = computed(() =>
  evaluaties.value.find(e => e.type === 'mentor' && e.fase === 'finaal')
)
function mentorBeschikbaar(m) {
  return !!m && Number(m.ingevulde_criteria) > 0
}

function evalStatus(eval_) {
  if (!eval_) return 'niet-gestart'
  if (eval_.ingediend) return 'ingediend'
  return 'bezig'
}

async function laadEvaluaties() {
  const id = stageStore.aanvraag?.stage_id
  if (!id) return
  laden.value = true
  try {
    const res = await fetch(`${API}/stages/${id}/evaluatie-overzicht`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (res.ok) evaluaties.value = data
  } finally {
    laden.value = false
  }
}

function naarEvaluatie(fase) {
  const beschikbaar = fase === 'tussentijds'
    ? beschikbaarheid.value.tussentijds.beschikbaar
    : beschikbaarheid.value.eind.beschikbaar
  if (!beschikbaar) return
  router.push(`/student/evaluatie/${fase}`)
}

onMounted(async () => {
  await stageStore.laad()
  await laadEvaluaties()
})
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />
    <main class="content">

      <template v-if="stageStore.status !== 'goedgekeurd'">
        <h1 class="page-title">Evaluatie</h1>
        <p class="text-secondary" style="margin-top:8px;">
          Evaluaties zijn beschikbaar zodra je stage-aanvraag is goedgekeurd.
        </p>
      </template>

      <template v-else>
        <h1 class="page-title">Mijn evaluaties</h1>
        <p class="text-secondary text-sm" style="margin-bottom:24px;">
          Vul je zelfevaluatie in per moment van je stage.
        </p>

        <div class="form-grid-2">

          <!-- Tussentijdse evaluatie -->
          <div class="card">
            <h2 style="font-size:16px;font-weight:600;margin-bottom:8px;">Tussentijdse evaluatie</h2>

            <p class="text-secondary text-sm">Halverwege je stage beoordeel je jezelf op de competenties.</p>

            <p v-if="!beschikbaarheid.tussentijds.beschikbaar" class="text-xs text-secondary" style="margin-top:6px;">
              Beschikbaar vanaf {{ formatDatum(beschikbaarheid.tussentijds.vanaf) }}
            </p>
            <p v-else-if="tussentijdsEval" class="text-xs text-secondary" style="margin-top:6px;">
              {{ tussentijdsEval.ingevulde_criteria }}/{{ tussentijdsEval.totaal_criteria }} competenties ingevuld
            </p>

            <button
              class="btn btn-sm"
              :class="beschikbaarheid.tussentijds.beschikbaar ? 'btn-primary' : 'btn-secondary'"
              style="margin-top:16px;"
              :disabled="!beschikbaarheid.tussentijds.beschikbaar"
              @click="naarEvaluatie('tussentijds')"
            >
              {{
                evalStatus(tussentijdsEval) === 'ingediend' ? 'Bekijk evaluatie →'
                : evalStatus(tussentijdsEval) === 'bezig' ? 'Verder invullen →'
                : beschikbaarheid.tussentijds.beschikbaar ? 'Starten →'
                : 'Nog niet beschikbaar'
              }}
            </button>

            <router-link
              v-if="mentorBeschikbaar(mentorTussentijds)"
              to="/student/evaluatie/tussentijds/beoordeling"
              class="flex items-center gap-8 font-semibold text-sm"
              style="margin-top:12px;"
            >
              Beoordeling mentor bekijken →
            </router-link>
          </div>

          <!-- Eindevaluatie -->
          <div class="card">
            <h2 style="font-size:16px;font-weight:600;margin-bottom:8px;">Eindevaluatie</h2>

            <p class="text-secondary text-sm">Aan het einde van je stage doe je een volledige zelfreflectie.</p>

            <p v-if="!beschikbaarheid.eind.beschikbaar" class="text-xs text-secondary" style="margin-top:6px;">
              Beschikbaar vanaf {{ formatDatum(beschikbaarheid.eind.vanaf) }} (laatste 2 weken)
            </p>
            <p v-else-if="eindEval" class="text-xs text-secondary" style="margin-top:6px;">
              {{ eindEval.ingevulde_criteria }}/{{ eindEval.totaal_criteria }} competenties ingevuld
            </p>

            <button
              class="btn btn-sm"
              :class="beschikbaarheid.eind.beschikbaar ? 'btn-primary' : 'btn-secondary'"
              style="margin-top:16px;"
              :disabled="!beschikbaarheid.eind.beschikbaar"
              @click="naarEvaluatie('finaal')"
            >
              {{
                evalStatus(eindEval) === 'ingediend' ? 'Bekijk evaluatie →'
                : evalStatus(eindEval) === 'bezig' ? 'Verder invullen →'
                : beschikbaarheid.eind.beschikbaar ? 'Starten →'
                : 'Nog niet beschikbaar'
              }}
            </button>

            <router-link
              v-if="mentorBeschikbaar(mentorEind)"
              to="/student/evaluatie/finaal/beoordeling"
              class="flex items-center gap-8 font-semibold text-sm"
              style="margin-top:12px;"
            >
              Beoordeling mentor bekijken →
            </router-link>
          </div>

        </div>
      </template>

    </main>
  </div>
</template>
