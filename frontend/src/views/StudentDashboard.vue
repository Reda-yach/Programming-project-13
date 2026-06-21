<script setup>
import { API_URL } from '@/api'
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import { useStageStore } from '../stores/stage'

const stageStore = useStageStore()

onMounted(async () => {
  await stageStore.laad()
  await laadLogboekStatus()
  await laadEvalStatus()
})

const gebruiker = JSON.parse(localStorage.getItem('gebruiker') || '{}')
const student = ref({
  voornaam: gebruiker.voornaam || 'student',
})

const stageStatus = computed(() => stageStore.status)
const stage = computed(() => stageStore.aanvraag)
const motivatie = computed(() => stageStore.motivatie)

// Actief = alle partijen hebben getekend (DB-status 'bezig'). De store mapt
// 'bezig' naar 'goedgekeurd', dus voor het label lezen we de ruwe status.
const stageActief = computed(() => stage.value?.status === 'bezig')

const stageBezig = computed(() =>
  stageStore.volledigGetekend &&
  !!stage.value?.startdatum &&
  new Date() >= new Date(stage.value.startdatum)
)

// Navigatie komt centraal uit de store (zelfde tabs op elk studentscherm).

const logboekWeek = ref(null)
const logboekStatus = ref(null)
const logboekDagenIngevuld = ref(0)

async function laadLogboekStatus() {
  if (!stageStore.volledigGetekend || !stage.value?.startdatum) return
  const start = new Date(stage.value.startdatum)
  const nu = new Date()
  if (nu < start) return
  const week = Math.floor((nu - start) / (7 * 24 * 60 * 60 * 1000)) + 1
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`${API_URL}/api/mijn-logboek/week/${week}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const data = await res.json()
    logboekWeek.value = data.logboek.week_nummer
    logboekStatus.value = data.logboek.status
    logboekDagenIngevuld.value = data.dagen.length
  } catch {}
}

function formatTijd(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return isNaN(d) ? '' : d.toLocaleString('nl-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function meldingPresentatie(b) {
  if (b === 'aanpassing_gevraagd') return { titel: 'Aanpassing gevraagd' }
  if (b === 'afgewezen') return { titel: 'Aanvraag afgewezen' }
  if (b === 'goedgekeurd') return { titel: 'Aanvraag goedgekeurd' }
  return { titel: 'Beslissing commissie' }
}

const meldingen = computed(() =>
  (stageStore.meldingen || []).map((m) => {
    const p = meldingPresentatie(m.beslissing)
    return { titel: p.titel, tijd: formatTijd(m.beslist_op), sub: m.motivatie || 'Geen motivatie opgegeven.' }
  })
)

// Datum netjes tonen (zonder tijd)
function formatDatum(d) {
  if (!d) return ''
  const dt = new Date(d)
  return isNaN(dt) ? d : dt.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

const evaluaties = computed(() => {
  if (!stageStore.volledigGetekend || !stage.value?.startdatum || !stage.value?.einddatum) {
    return {
      tussentijds: { beschikbaar: false, vanaf: null },
      eind: { beschikbaar: false, vanaf: null },
    }
  }

  const start = new Date(stage.value.startdatum)
  const eind = new Date(stage.value.einddatum)
  const nu = new Date()

  const middenDatum = new Date((start.getTime() + eind.getTime()) / 2)
  const eindeDatum = new Date(eind.getTime() - 2 * WEEK_MS)

  return {
    tussentijds: { beschikbaar: nu >= middenDatum, vanaf: middenDatum },
    eind: { beschikbaar: nu >= eindeDatum, vanaf: eindeDatum },
  }
})

// Ingediend-status van de zelfevaluaties, om de dashboard-knop te laten
// wisselen tussen "Nu invullen" en "Bekijk evaluatie".
const evalOverzicht = ref([])
async function laadEvalStatus() {
  const id = stage.value?.stage_id
  if (!id) return
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`${API_URL}/api/stages/${id}/evaluatie-overzicht`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    evalOverzicht.value = await res.json()
  } catch {}
}
const tussentijdsIngediend = computed(() =>
  !!evalOverzicht.value.find(e => e.type === 'student' && e.fase === 'tussentijds' && e.ingediend)
)
const eindIngediend = computed(() =>
  !!evalOverzicht.value.find(e => e.type === 'student' && e.fase === 'finaal' && e.ingediend)
)
</script>

<template>
  <div class="page">
    <TopBar :links="stageStore.studentNavLinks" />

    <main class="content">
      <section>
        <h1 class="page-title">Welkom, {{ student.voornaam }}</h1>
      </section>

      <section class="card-grid-2">
        <!-- Stage Status -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Stage Status</span>
            <span
              class="badge badge-pill"
              :class="{
                'badge-green': stageActief,
                'badge-yellow': stageStatus === 'in_behandeling' || (stageStatus === 'goedgekeurd' && !stageActief),
                'badge-orange': stageStatus === 'aanpassing_gevraagd',
                'badge-red': stageStatus === 'afgewezen',
                'badge-gray': stageStatus === 'geen',
              }"
            >
              {{
                stageActief ? 'Actief'
                  : stageStatus === 'goedgekeurd' ? 'In behandeling'
                  : stageStatus === 'in_behandeling' ? 'In behandeling'
                  : stageStatus === 'aanpassing_gevraagd' ? 'Aanpassing gevraagd'
                  : stageStatus === 'afgewezen' ? 'Afgewezen'
                  : 'Inactief'
              }}
            </span>
          </div>
          <hr class="card-divider" />

          <!-- Goedgekeurd / lopend -->
          <template v-if="stageStatus === 'goedgekeurd'">
            <div class="flex items-center gap-12" style="margin-bottom: 16px;">
              <div style="width:48px;height:48px;background:var(--gray50);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:600;color:var(--text-secondary);flex-shrink:0;">{{ stage?.bedrijf?.charAt(0) || '' }}</div>
              <div>
                <div class="font-semibold" style="font-size:16px;">{{ stage?.bedrijf }}</div>
                <div class="text-secondary text-xs">
                  Stageperiode: {{ formatDatum(stage?.startdatum) }} – {{ formatDatum(stage?.einddatum) }}
                </div>
              </div>
            </div>

            <!-- Tussenfase: goedgekeurd, maar nog niet door alle drie getekend.
                 De stage is nog niet actief; enkel het contract is beschikbaar. -->
            <div
              v-if="!stageStore.volledigGetekend"
              class="card"
              style="background:#fffbeb;border:1px solid #fde68a;margin-bottom:4px;"
            >
              <p class="font-semibold" style="color:#92400e;">Onderteken je stagecontract</p>
              <p class="text-secondary text-sm mt-4" style="line-height:1.6;">
                Je aanvraag is goedgekeurd. Zodra de stagecommissie, je mentor én jij het
                contract hebben ondertekend, wordt je stage actief en gaan je logboek en
                evaluatie open.
              </p>
              <RouterLink to="/student/contract" class="btn btn-primary mt-12">
                Naar contract
              </RouterLink>
            </div>
          </template>

          <!-- In behandeling -->
          <template v-else-if="stageStatus === 'in_behandeling'">
            <div class="font-semibold" style="font-size:16px;margin-bottom:8px;">
              Aanvraag in behandeling
            </div>
            <p class="text-secondary text-sm" style="line-height:1.6;">
              Je stage-aanvraag is ingediend en wordt nu beoordeeld door de stagecommissie.
            </p>
          </template>

          <!-- Aanpassing gevraagd -->
          <template v-else-if="stageStatus === 'aanpassing_gevraagd'">
            <div class="font-semibold" style="font-size:16px;margin-bottom:8px;">
              Aanpassing gevraagd
            </div>
            <p class="text-secondary text-sm" style="line-height:1.6;margin-bottom:16px;">
              De commissie vraagt je om je aanvraag aan te passen:
              <br /><em>{{ motivatie || 'Geen motivatie opgegeven.' }}</em>
            </p>
            <RouterLink to="/student/aanvraag" class="btn btn-primary">
              Aanvraag aanpassen
            </RouterLink>
          </template>

          <!-- Afgewezen -->
          <template v-else-if="stageStatus === 'afgewezen'">
            <div class="font-semibold" style="font-size:16px;margin-bottom:8px;">
              Aanvraag afgewezen
            </div>
            <p class="text-secondary text-sm" style="line-height:1.6;">
              Je stage-aanvraag is afgewezen door de commissie.
              <br /><em>{{ motivatie || 'Geen motivatie opgegeven.' }}</em>
            </p>
          </template>

          <!-- Geen aanvraag -->
          <template v-else>
            <div class="font-semibold" style="font-size:16px;margin-bottom:16px;">
              Geen actieve stage
            </div>
            <RouterLink to="/student/aanvraag" class="btn btn-primary">
              Stage aanvragen
            </RouterLink>
          </template>
        </div>

        <!-- Logboek deze week -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Logboek deze week</span>
            <span
              v-if="logboekStatus"
              class="badge badge-pill"
              :class="{
                'badge-green': logboekStatus === 'goedgekeurd',
                'badge-yellow': logboekStatus === 'ingediend',
                'badge-gray': logboekStatus === 'draft',
              }"
            >
              {{ logboekStatus === 'goedgekeurd' ? 'Bevestigd' : logboekStatus === 'ingediend' ? 'Ingediend' : 'In uitvoering' }}
            </span>
          </div>
          <hr class="card-divider" />

          <template v-if="stageStore.volledigGetekend && logboekWeek !== null">
            <div class="font-semibold" style="font-size:15px;margin-bottom:8px;">Week {{ logboekWeek }}</div>
            <div class="flex gap-8" style="margin-bottom:16px;">
              <div
                v-for="(dag, i) in ['Ma','Di','Wo','Do','Vr']"
                :key="dag"
                style="text-align:center;"
              >
                <div class="text-xs text-secondary" style="margin-bottom:6px;">{{ dag }}</div>
                <div
                  style="width:36px;height:36px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-size:14px;"
                  :style="i < logboekDagenIngevuld
                    ? 'background:var(--green,#16a34a);color:#fff;border:2px solid var(--green,#16a34a);'
                    : 'border:2px solid var(--border);color:var(--text-secondary);'"
                >{{ i < logboekDagenIngevuld ? '✓' : '–' }}</div>
              </div>
            </div>
            <p class="text-secondary text-sm" style="margin-bottom:16px;">
              {{ logboekDagenIngevuld }} van 5 dagen ingevuld
            </p>
            <RouterLink to="/student/logboek" class="btn btn-primary">
              Logboek invullen →
            </RouterLink>
          </template>

          <template v-else>
            <div class="font-semibold" style="font-size:16px;">Geen logboek beschikbaar</div>
            <p class="text-secondary text-sm" style="margin-top:4px;">
              Het logboek wordt beschikbaar zodra het contract door alle partijen is ondertekend en je stage gestart is.
            </p>
          </template>
        </div>
      </section>

      <!-- Rij 2: Evaluaties -->
      <section class="card-grid-2">
        <div class="card">
          <div class="card-header">
            <span class="card-title">Tussentijdse Evaluatie</span>
          </div>
          <hr class="card-divider" />
          <p class="text-secondary text-sm" style="line-height:1.6;margin-bottom:16px;">
            <template v-if="evaluaties.tussentijds.beschikbaar">
              Je kunt nu de tussentijdse evaluatie invullen om je voortgang te bespreken met je mentor en docent.
            </template>
            <template v-else-if="evaluaties.tussentijds.vanaf">
              Beschikbaar vanaf {{ formatDatum(evaluaties.tussentijds.vanaf) }} (midden van je stageperiode).
            </template>
            <template v-else>
              Deze evaluatie wordt beschikbaar rond het midden van je stageperiode.
            </template>
          </p>
          <RouterLink
            v-if="evaluaties.tussentijds.beschikbaar"
            to="/student/evaluatie"
            class="flex items-center gap-8 font-semibold text-sm"
            style="padding-top:8px;"
          >
            {{ tussentijdsIngediend ? 'Bekijk evaluatie →' : 'Nu invullen →' }}
          </RouterLink>
          <span v-else class="flex items-center gap-8 text-sm text-secondary" style="padding-top:8px;">
            Nog niet beschikbaar
          </span>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">Eindevaluatie</span>
          </div>
          <hr class="card-divider" />
          <p class="text-secondary text-sm" style="line-height:1.6;margin-bottom:16px;">
            <template v-if="evaluaties.eind.beschikbaar">
              Je kunt nu de eindevaluatie invullen.
            </template>
            <template v-else-if="evaluaties.eind.vanaf">
              Beschikbaar vanaf {{ formatDatum(evaluaties.eind.vanaf) }} (laatste 2 weken van je stage).
            </template>
            <template v-else>
              Deze evaluatie wordt beschikbaar in de laatste twee weken van je stageperiode.
            </template>
          </p>
          <RouterLink
            v-if="evaluaties.eind.beschikbaar"
            to="/student/evaluatie"
            class="flex items-center gap-8 font-semibold text-sm"
            style="padding-top:8px;"
          >
            {{ eindIngediend ? 'Bekijk evaluatie →' : 'Nu invullen →' }}
          </RouterLink>
          <span v-else class="flex items-center gap-8 text-sm text-secondary" style="padding-top:8px;">
            Nog niet beschikbaar
          </span>
        </div>
      </section>

      <!-- Meldingen & Feedback -->
      <section class="card">
        <div class="card-header">
          <span class="card-title">Meldingen &amp; Feedback</span>
        </div>
        <hr class="card-divider" />

        <template v-if="meldingen.length">
          <div
            v-for="(melding, i) in meldingen"
            :key="i"
            class="notification-item"
            :style="i === meldingen.length - 1 ? 'border-bottom:none;' : ''"
          >
            <div class="notification-body">
              <div class="flex justify-between">
                <span class="notification-title">{{ melding.titel }}</span>
                <span class="notification-time">{{ melding.tijd }}</span>
              </div>
              <p class="notification-sub">{{ melding.sub }}</p>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="font-semibold" style="font-size:16px;">Geen meldingen</div>
        </template>
      </section>
    </main>
  </div>
</template>

<style scoped></style>