<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import { useAuthStore } from '../stores/auth'
import { getStageStatusInfo } from '../utils/stageStatus'

const authStore = useAuthStore()

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const laden = ref(true)
const fout = ref(null)

const student = ref(null)
const stage = ref(null)
const logboek = ref(null)
const logboekNogNietIngediend = ref(false)
const feedback = ref([])
const meldingen = ref([])

// ---------------------------------------------------------------------------
// Stagestatus
// ---------------------------------------------------------------------------
const stageStatus = computed(() => stage.value?.status ?? 'geen')

// Een stage is "actief" zodra ze loopt, goedgekeurd of afgerond is.
const stageActief = computed(() =>
  ['bezig', 'goedgekeurd', 'afgerond'].includes(stageStatus.value),
)

const navLinks = computed(() =>
  stageActief.value
    ? [
        { label: 'Dashboard', to: '/student' },
        { label: 'Aanvraag', to: '/student/aanvraag' },
        { label: 'Logboek', to: '/student/logboek' },
        { label: 'Evaluatie', to: '/student/evaluatie' },
      ]
    : [
        { label: 'Dashboard', to: '/student' },
        { label: 'Aanvraag', to: '/student/aanvraag' },
      ],
)

// Badge rechtsboven in de stage-kaart — gebruikt de centrale statusvertaling
// zodat dashboard, aanvraag en commissie-view dezelfde termen tonen.
const stageBadge = computed(() => {
  if (stageStatus.value === 'geen') return { label: 'Inactief', kleur: 'badge-red' }
  return getStageStatusInfo(stageStatus.value)
})

// Motivatie van de laatste commissiebeslissing — getoond bij een afgewezen
// aanvraag of een vraag om aanpassingen.
const commissieFeedback = computed(() => stage.value?.beslissing ?? null)

// ---------------------------------------------------------------------------
// Voortgang (afgeleid uit start- en einddatum)
// ---------------------------------------------------------------------------
const WEEK_MS = 7 * 86400000

const voortgang = computed(() => {
  if (!stageActief.value || !stage.value?.startdatum || !stage.value?.einddatum) return null
  const start = new Date(stage.value.startdatum)
  const eind = new Date(stage.value.einddatum)
  const nu = new Date()
  const totaal = Math.max(1, Math.ceil((eind - start) / WEEK_MS))
  const verstreken = Math.min(totaal, Math.max(0, Math.ceil((nu - start) / WEEK_MS)))
  const pct = Math.min(100, Math.max(0, Math.round((verstreken / totaal) * 100)))
  return { totaal, verstreken, resterend: totaal - verstreken, pct }
})

// ---------------------------------------------------------------------------
// Logboek week-raster (Ma–Vr)
// ---------------------------------------------------------------------------
const weekdagen = [
  { key: 'maandag', label: 'Ma' },
  { key: 'dinsdag', label: 'Di' },
  { key: 'woensdag', label: 'Wo' },
  { key: 'donderdag', label: 'Do' },
  { key: 'vrijdag', label: 'Vr' },
]

const dagenMap = computed(() => {
  const map = {}
  for (const d of logboek.value?.dagen ?? []) map[d.dag] = d
  return map
})

function dagIngevuld(key) {
  const d = dagenMap.value[key]
  return !!d && Number(d.uren) > 0
}

const logboekStatusLabel = computed(() => {
  const map = { draft: 'Concept', ingediend: 'Ingediend', goedgekeurd: 'Goedgekeurd' }
  return logboek.value ? (map[logboek.value.status] ?? logboek.value.status) : null
})

const logboekStatusKleur = computed(() => {
  const map = { draft: 'badge-gray', ingediend: 'badge-blue', goedgekeurd: 'badge-green' }
  return logboek.value ? (map[logboek.value.status] ?? 'badge-gray') : 'badge-gray'
})

// ---------------------------------------------------------------------------
// Evaluaties (beschikbaarheid afgeleid uit de stageperiode)
// ---------------------------------------------------------------------------
function evalInfo(type) {
  if (!stageActief.value || !stage.value?.startdatum || !stage.value?.einddatum) {
    return { beschikbaar: false, vanaf: null }
  }
  const start = new Date(stage.value.startdatum)
  const eind = new Date(stage.value.einddatum)
  const vanaf =
    type === 'tussentijds'
      ? new Date((start.getTime() + eind.getTime()) / 2)
      : new Date(eind.getTime() - 2 * WEEK_MS)
  return { beschikbaar: new Date() >= vanaf, vanaf }
}

const evalTussentijds = computed(() => evalInfo('tussentijds'))
const evalEind = computed(() => evalInfo('eind'))

// ---------------------------------------------------------------------------
// Meldingen & feedback samenvoegen tot één tijdlijn
// ---------------------------------------------------------------------------
function meldingType(bericht) {
  const t = (bericht || '').toLowerCase()
  if (/(afgekeurd|afgewezen|geweigerd)/.test(t)) return 'fout'
  if (/(aanpassing|wijzig|aandacht|let op)/.test(t)) return 'waarschuwing'
  if (/(goedgekeurd|bevestigd|ondertekend|akkoord)/.test(t)) return 'goed'
  return 'info'
}

const meldingGlyph = { goed: '✓', fout: '✕', waarschuwing: '!', info: '🔔', feedback: '💬' }

const tijdlijn = computed(() => {
  const items = []
  for (const m of meldingen.value) {
    items.push({
      key: `m-${m.id}`,
      // Gebruik het type uit de database; val terug op een tekst-heuristiek
      // voor oude meldingen zonder type.
      soort: m.type ?? meldingType(m.bericht),
      titel: m.bericht,
      sub: null,
      datum: m.datum,
    })
  }
  for (const f of feedback.value) {
    items.push({
      key: `f-${f.datum}-${f.week_nummer}`,
      soort: 'feedback',
      titel: `Feedback van ${f.van} · week ${f.week_nummer}`,
      sub: f.opmerking,
      datum: f.datum,
    })
  }
  return items.sort((a, b) => new Date(b.datum) - new Date(a.datum))
})

// ---------------------------------------------------------------------------
// Data ophalen
// ---------------------------------------------------------------------------
async function laadDashboard() {
  laden.value = true
  fout.value = null

  // De backend zoekt de student op via gebruiker_id uit de JWT.
  const gebruikerId = authStore.user?.id

  if (!gebruikerId) {
    fout.value = 'Kan je profiel niet laden. Probeer opnieuw in te loggen.'
    laden.value = false
    return
  }

  try {
    const response = await fetch(`http://localhost:3000/api/students/${gebruikerId}/dashboard`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      fout.value = data.error ?? 'Kon dashboarddata niet ophalen.'
      return
    }

    const data = await response.json()
    student.value = data.student
    stage.value = data.stage
    logboek.value = data.logboek
    logboekNogNietIngediend.value = data.logboekNogNietIngediend
    feedback.value = data.feedback ?? []
    meldingen.value = data.meldingen ?? []
  } catch {
    fout.value = 'Kan geen verbinding maken met de server.'
  } finally {
    laden.value = false
  }
}

// ---------------------------------------------------------------------------
// Datum-helpers
// ---------------------------------------------------------------------------
function formatKort(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('nl-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatLang(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('nl-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function relatieveTijd(iso) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'Zojuist'
  if (min < 60) return `${min} min geleden`
  const uur = Math.floor(min / 60)
  if (uur < 24) return `${uur} uur geleden`
  const dag = Math.floor(uur / 24)
  return `${dag} dag${dag > 1 ? 'en' : ''} geleden`
}

onMounted(laadDashboard)
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />

    <main class="content">
      <!-- Laadstatus -->
      <template v-if="laden">
        <div style="padding: 48px 0; text-align: center; color: var(--text-secondary);">
          Dashboard wordt geladen…
        </div>
      </template>

      <!-- Foutmelding -->
      <template v-else-if="fout">
        <div class="card" style="border-color: var(--red);">
          <p style="color: var(--red); font-weight: 600;">{{ fout }}</p>
          <button class="btn btn-secondary" style="margin-top: 12px;" @click="laadDashboard">
            Opnieuw proberen
          </button>
        </div>
      </template>

      <template v-else>
        <!-- Welkomtekst -->
        <section>
          <h1 class="page-title">
            {{ stageActief ? 'Welkom terug' : 'Welkom' }}{{ student ? `, ${student.voornaam}` : '' }}
          </h1>
          <p class="page-subtitle">Hier is een overzicht van je stagevoortgang en openstaande taken.</p>
        </section>

        <!-- Logboek-waarschuwing: deze week nog niet ingediend -->
        <div
          v-if="logboekNogNietIngediend"
          class="card"
          style="background: var(--yellow-bg); border-color: #fbbf24;"
        >
          <div class="flex items-center gap-12">
            <span style="font-size: 20px;">⚠️</span>
            <div>
              <span class="font-semibold" style="font-size: 14px;">
                Je logboek van deze week is nog niet ingediend.
              </span>
              <RouterLink
                to="/student/logboek"
                class="font-semibold text-sm"
                style="display: inline-block; margin-left: 12px;"
              >
                Nu invullen →
              </RouterLink>
            </div>
          </div>
        </div>

        <!-- Rij 1: Stage Status + Logboek deze week -->
        <section class="card-grid-2">
          <!-- Stage Status -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">Stage Status</span>
              <span class="badge badge-pill" :class="stageBadge.kleur">{{ stageBadge.label }}</span>
            </div>
            <hr class="card-divider" />

            <!-- Actieve / afgeronde stage -->
            <template v-if="stageActief && stage">
              <div class="stage-bedrijf">
                <div class="stage-bedrijf-icon">🏢</div>
                <div>
                  <div class="font-semibold" style="font-size: 16px;">{{ stage.bedrijf }}</div>
                  <div class="text-secondary text-xs">
                    Stageperiode: {{ formatKort(stage.startdatum) }} - {{ formatKort(stage.einddatum) }}
                  </div>
                </div>
              </div>

              <template v-if="voortgang">
                <div class="progress-row">
                  <span class="text-sm font-semibold">Voortgang</span>
                  <span class="text-secondary text-xs">
                    Week {{ voortgang.verstreken }} van {{ voortgang.totaal }} ·
                    {{ voortgang.resterend }} resterend
                  </span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill progress-black" :style="{ width: voortgang.pct + '%' }"></div>
                </div>
              </template>
            </template>

            <!-- Aanvraag in behandeling -->
            <template v-else-if="['in_behandeling', 'ingediend'].includes(stageStatus)">
              <div class="font-semibold" style="font-size: 16px; margin-bottom: 8px;">
                Aanvraag in behandeling
              </div>
              <p class="text-secondary text-sm" style="line-height: 1.6;">
                Je stage-aanvraag voor <strong>{{ stage?.stagetitel }}</strong> wordt beoordeeld
                door de stagecommissie.
              </p>
            </template>

            <!-- Aanpassingen vereist -->
            <template v-else-if="stageStatus === 'aanpassing_vereist'">
              <div class="font-semibold" style="font-size: 16px; margin-bottom: 8px;">
                Aanpassingen vereist
              </div>
              <p class="text-secondary text-sm" style="line-height: 1.6; margin-bottom: 16px;">
                De stagecommissie vraagt aanpassingen aan je aanvraag voor
                <strong>{{ stage?.stagetitel }}</strong>. Bekijk de feedback hieronder en dien
                je aanvraag opnieuw in.
              </p>

              <div
                v-if="commissieFeedback?.motivatie"
                class="card"
                style="background: var(--yellow-bg); border-color: #fbbf24; margin-bottom: 16px;"
              >
                <div class="text-secondary text-xs" style="margin-bottom: 4px;">
                  Feedback van {{ commissieFeedback.van }}
                </div>
                <p class="text-sm" style="line-height: 1.6;">{{ commissieFeedback.motivatie }}</p>
              </div>

              <RouterLink to="/student/aanvraag" class="btn btn-primary">
                Aanvraag aanpassen
              </RouterLink>
            </template>

            <!-- Afgewezen -->
            <template v-else-if="stageStatus === 'afgewezen'">
              <div class="font-semibold" style="font-size: 16px; margin-bottom: 8px;">
                Aanvraag afgewezen
              </div>
              <p class="text-secondary text-sm" style="line-height: 1.6; margin-bottom: 16px;">
                Je aanvraag voor <strong>{{ stage?.stagetitel }}</strong> werd niet goedgekeurd.
              </p>

              <div
                v-if="commissieFeedback?.motivatie"
                class="card"
                style="background: var(--red-bg, #fef2f2); border-color: var(--red); margin-bottom: 16px;"
              >
                <div class="text-secondary text-xs" style="margin-bottom: 4px;">
                  Reden van {{ commissieFeedback.van }}
                </div>
                <p class="text-sm" style="line-height: 1.6;">{{ commissieFeedback.motivatie }}</p>
              </div>

              <RouterLink to="/student/aanvraag" class="btn btn-primary">
                Nieuwe aanvraag indienen
              </RouterLink>
            </template>

            <!-- Geen stage -->
            <template v-else>
              <div class="font-semibold" style="font-size: 16px; margin-bottom: 16px;">
                Geen actieve stage
              </div>
              <RouterLink to="/student/aanvraag" class="btn btn-primary">Stage aanvragen</RouterLink>
            </template>
          </div>

          <!-- Logboek deze week -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">Logboek deze week</span>
              <span v-if="logboek" class="badge badge-pill" :class="logboekStatusKleur">
                {{ logboekStatusLabel }}
              </span>
            </div>
            <hr class="card-divider" />

            <template v-if="stageActief">
              <div class="week-grid">
                <div v-for="dag in weekdagen" :key="dag.key" class="week-day">
                  <span class="week-day-label">{{ dag.label }}</span>
                  <span class="day-circle" :class="{ done: dagIngevuld(dag.key) }">
                    {{ dagIngevuld(dag.key) ? '✓' : '🕑' }}
                  </span>
                </div>
              </div>
              <div class="flex items-center justify-between" style="margin-top: 20px;">
                <span class="text-secondary text-xs">
                  {{ logboek ? `${logboek.uren ?? 0} uur geregistreerd` : 'Nog niets geregistreerd' }}
                </span>
                <RouterLink to="/student/logboek" class="font-semibold text-sm">
                  Logboek openen →
                </RouterLink>
              </div>
            </template>

            <template v-else>
              <div class="font-semibold" style="font-size: 15px;">Geen logboek beschikbaar</div>
              <p class="text-secondary text-sm" style="line-height: 1.6; margin-top: 8px;">
                Het logboek is beschikbaar zodra je stage actief is.
              </p>
            </template>
          </div>
        </section>

        <!-- Rij 2: Tussentijdse Evaluatie + Eindevaluatie -->
        <section class="card-grid-2">
          <!-- Tussentijdse evaluatie -->
          <div class="card">
            <div class="card-header">
              <span class="card-title" :class="{ 'card-title-center': !stageActief }">
                Tussentijdse Evaluatie
              </span>
              <span
                v-if="stageActief"
                class="badge badge-pill"
                :class="evalTussentijds.beschikbaar ? 'badge-blue' : 'badge-gray'"
              >
                {{ evalTussentijds.beschikbaar ? 'Beschikbaar' : 'In afwachting' }}
              </span>
            </div>
            <hr class="card-divider" />

            <p class="text-secondary text-sm" style="line-height: 1.6; margin-bottom: 16px;">
              Je kunt de tussentijdse evaluatie invullen om je voortgang tot nu toe te bespreken
              met je mentor en docent.
            </p>
            <RouterLink
              v-if="stageActief && evalTussentijds.beschikbaar"
              to="/student/evaluatie"
              class="font-semibold text-sm"
            >
              Nu invullen →
            </RouterLink>
            <span v-else class="eval-locked">Nog niet beschikbaar 🔒</span>
          </div>

          <!-- Eindevaluatie -->
          <div class="card">
            <div class="card-header">
              <span class="card-title" :class="{ 'card-title-center': !stageActief }">
                Eindevaluatie
              </span>
              <span
                v-if="stageActief"
                class="badge badge-pill"
                :class="evalEind.beschikbaar ? 'badge-blue' : 'badge-gray'"
              >
                {{ evalEind.beschikbaar ? 'Beschikbaar' : 'In afwachting' }}
              </span>
            </div>
            <hr class="card-divider" />

            <p class="text-secondary text-sm" style="line-height: 1.6; margin-bottom: 16px;">
              Deze evaluatie wordt beschikbaar in de laatste twee weken van je stageperiode<template
                v-if="evalEind.vanaf"
              >
                (vanaf {{ formatLang(evalEind.vanaf) }})</template
              >.
            </p>
            <RouterLink
              v-if="stageActief && evalEind.beschikbaar"
              to="/student/evaluatie-eind"
              class="font-semibold text-sm"
            >
              Nu invullen →
            </RouterLink>
            <span v-else class="eval-locked">Nog niet beschikbaar 🔒</span>
          </div>
        </section>

        <!-- Meldingen & Feedback -->
        <section class="card">
          <div class="card-header">
            <span class="card-title">Meldingen &amp; Feedback</span>
          </div>
          <hr class="card-divider" />

          <template v-if="tijdlijn.length">
            <div
              v-for="(item, i) in tijdlijn"
              :key="item.key"
              class="notification-item"
              :style="i === tijdlijn.length - 1 ? 'border-bottom: none;' : ''"
            >
              <div class="melding-icon" :class="item.soort">{{ meldingGlyph[item.soort] }}</div>
              <div class="notification-body">
                <div class="flex justify-between gap-12">
                  <span class="notification-title">{{ item.titel }}</span>
                  <span class="notification-time">{{ relatieveTijd(item.datum) }}</span>
                </div>
                <p v-if="item.sub" class="notification-sub">{{ item.sub }}</p>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="font-semibold" style="font-size: 15px;">Geen meldingen</div>
          </template>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped></style>
