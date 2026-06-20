<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import TopBarDocentStagecommissie from '@/components/TopBarDocentStagecommissie.vue'
import { docentNavLinks } from './docentNav'

const API = 'http://localhost:3000/api'
const route = useRoute()

// 'Aanvragen' enkel voor commissie-docenten (zie docentNav.js).
const navLinks = docentNavLinks()

const dagNamen = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag']
const dagKort = {
  maandag: 'Maandag', dinsdag: 'Dinsdag', woensdag: 'Woensdag',
  donderdag: 'Donderdag', vrijdag: 'Vrijdag',
}

const stage = ref(null)
const logboeken = ref([])
const detail = ref(null)
const geselecteerdeWeek = ref(null)
const stageLaden = ref(false)
const detailLaden = ref(false)
const fout = ref(null)

const geselecteerdLogboek = computed(() =>
  logboeken.value.find(l => l.week_nummer === geselecteerdeWeek.value) || null
)

async function laadStageEnLogboeken() {
  stageLaden.value = true
  fout.value = null
  const token = localStorage.getItem('token')
  const stage_id = route.params.stage_id

  try {
    const [stageRes, logRes] = await Promise.all([
      fetch(`${API}/stages/${stage_id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API}/stages/${stage_id}/logboeken`, { headers: { Authorization: `Bearer ${token}` } }),
    ])

    const stageData = await stageRes.json()
    if (!stageRes.ok) throw new Error(stageData.error || 'Stage laden mislukt')
    stage.value = stageData

    const logData = await logRes.json()
    if (!logRes.ok) throw new Error(logData.error || 'Logboeken laden mislukt')
    logboeken.value = logData

    if (logData.length > 0) {
      const ingediendWeek = logData.find(l => l.status === 'ingediend')
      geselecteerdeWeek.value = ingediendWeek
        ? ingediendWeek.week_nummer
        : logData[logData.length - 1].week_nummer
      await laadDetail(geselecteerdeWeek.value)
    }
  } catch (e) {
    fout.value = e.message
  } finally {
    stageLaden.value = false
  }
}

async function laadDetail(weekNummer) {
  const logboek = logboeken.value.find(l => l.week_nummer === weekNummer)
  if (!logboek) return

  geselecteerdeWeek.value = weekNummer
  detailLaden.value = true
  detail.value = null
  const token = localStorage.getItem('token')

  try {
    const res = await fetch(`${API}/logboeken/${logboek.logboek_id}/volledig`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Detail laden mislukt')
    detail.value = data
  } catch (e) {
    fout.value = e.message
  } finally {
    detailLaden.value = false
  }
}

function dagVoorDetail(dagNaam) {
  return detail.value?.dagen?.find(d => d.dag === dagNaam) || null
}

function statusLabel(status) {
  if (status === 'goedgekeurd') return 'Bevestigd'
  if (status === 'ingediend') return 'Ingediend'
  return 'Concept'
}

function statusKlasse(status) {
  if (status === 'goedgekeurd') return 'badge-green'
  if (status === 'ingediend') return 'badge-yellow'
  return ''
}

function formatDatum(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('nl-BE', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

onMounted(() => {
  laadStageEnLogboeken()
})

async function navigeerNaarWeek(week) {
  huidigWeek.value = week
  feedback.value = ''
  feedbackBericht.value = ''
  await laadFeedback()
}

async function laadFeedback() {
  if (!huidigLogboek.value) return
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/logboeken/${huidigLogboek.value.logboek_id}/feedback`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    bestaandeFeedback.value = await res.json()
  } catch {
    bestaandeFeedback.value = []
  }
}

async function slaFeedbackOp() {
  if (!feedback.value.trim() || !huidigLogboek.value) return
  bezig.value = true
  feedbackBericht.value = ''
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/logboeken/${huidigLogboek.value.logboek_id}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ gebruiker_id: gebruiker.id, opmerking: feedback.value }),
    })
    if (res.ok) {
      feedback.value = ''
      feedbackBericht.value = 'Feedback opgeslagen!'
      await laadFeedback()
      setTimeout(() => (feedbackBericht.value = ''), 2500)
    }
  } catch {
    feedbackBericht.value = 'Opslaan mislukt.'
  } finally {
    bezig.value = false
  }
}

function statusBadge(status) {
  if (status === 'goedgekeurd') return 'badge-green'
  if (status === 'ingediend') return 'badge-yellow'
  if (status === 'draft') return 'badge-red'
  return ''
}
</script>

<template>
  <div class="page">
    <TopBarDocentStagecommissie :links="navLinks" />

    <main class="content">
      <router-link to="/docent-logboek-overzicht" class="text-secondary text-sm">
        ← Overzicht logboeken
      </router-link>

      <div v-if="stageLaden" class="text-secondary text-sm" style="margin-top:16px;">Laden…</div>
      <div v-else-if="fout" style="color:var(--red,#dc2626);font-size:14px;margin-top:16px;">{{ fout }}</div>

      <template v-else-if="stage">
        <!-- Student header -->
        <section class="card" style="margin-top:16px;">
          <div class="flex justify-between items-center">
            <div>
              <div class="td-name">
                {{ stage.student_voornaam }} {{ stage.student_naam }}
              </div>
              <div class="td-sub">{{ stage.bedrijf }} · {{ stage.opleiding }}</div>
              <div class="text-secondary text-xs" style="margin-top:4px;" v-if="stage.startdatum">
                {{ formatDatum(stage.startdatum) }} – {{ formatDatum(stage.einddatum) }}
              </div>
            </div>
          </div>
        </section>

        <!-- Geen logboeken -->
        <div v-if="!logboeken.length" class="text-secondary text-sm" style="margin-top:16px;">
          Deze student heeft nog geen logboekentries.
        </div>

        <template v-else>
          <!-- Week selectie (dropdown i.p.v. een knop per week) -->
          <div class="week-selector" style="margin-top:16px;margin-bottom:16px;">
            <label class="week-selector-label">Week</label>
            <select
              class="week-select"
              :value="geselecteerdeWeek"
              @change="laadDetail(Number($event.target.value))"
            >
              <option
                v-for="log in logboeken"
                :key="log.week_nummer"
                :value="log.week_nummer"
              >
                Week {{ log.week_nummer }} — {{ statusLabel(log.status) }}
              </option>
            </select>
          </div>

          <!-- Week detail -->
          <div v-if="detailLaden" class="text-secondary text-sm">Laden…</div>

          <template v-else-if="detail">
            <!-- Status badge -->
            <div style="margin-bottom:12px;">
              <span
                class="badge badge-pill"
                :class="statusKlasse(detail.logboek.status)"
              >
                {{ statusLabel(detail.logboek.status) }}
              </span>
              <span v-if="detail.logboek.ingediend_op" class="text-secondary text-xs" style="margin-left:8px;">
                {{ formatDatum(detail.logboek.ingediend_op) }}
              </span>
            </div>

            <!-- Dag-voor-dag invoer -->
            <section
              v-for="dagNaam in dagNamen"
              :key="dagNaam"
              class="card"
              style="margin-bottom:12px;"
            >
              <div class="flex justify-between items-center" style="margin-bottom:10px;">
                <span class="font-semibold">{{ dagKort[dagNaam] }}</span>
                <span
                  class="badge badge-pill"
                  :class="dagVoorDetail(dagNaam) ? 'badge-green' : ''"
                  style="font-size:11px;"
                >{{ dagVoorDetail(dagNaam) ? 'Ingevuld' : 'Leeg' }}</span>
              </div>

              <template v-if="dagVoorDetail(dagNaam)">
                <div class="text-sm" style="margin-bottom:8px;">
                  <span class="text-secondary">Uitgevoerde taken</span>
                  <div style="margin-top:4px;white-space:pre-wrap;">
                    {{ dagVoorDetail(dagNaam).activiteiten || '—' }}
                  </div>
                </div>
                <div class="text-sm" style="margin-bottom:8px;">
                  <span class="text-secondary">Reflectie</span>
                  <div style="margin-top:4px;white-space:pre-wrap;">
                    {{ dagVoorDetail(dagNaam).reflectie || '—' }}
                  </div>
                </div>
                <div class="text-sm">
                  <span class="text-secondary">Problemen / leerpunten</span>
                  <div style="margin-top:4px;white-space:pre-wrap;">
                    {{ dagVoorDetail(dagNaam).leerpunten || '—' }}
                  </div>
                </div>
              </template>
              <div v-else class="text-secondary text-sm">Geen invoer voor deze dag.</div>
            </section>

            <!-- Mentorfeedback -->
            <section class="card">
              <div class="font-semibold" style="margin-bottom:12px;">Mentorfeedback</div>
              <template v-if="detail.feedback.length">
                <div
                  v-for="(fb, i) in detail.feedback"
                  :key="i"
                  style="padding:8px 0;"
                  :style="i < detail.feedback.length - 1 ? 'border-bottom:1px solid var(--border);' : ''"
                >
                  <div class="flex justify-between">
                    <span class="font-medium text-sm">{{ fb.voornaam }} {{ fb.auteur }}</span>
                    <span class="text-secondary text-xs">{{ formatDatum(fb.created_at) }}</span>
                  </div>
                  <p class="text-sm" style="margin-top:4px;">{{ fb.opmerking }}</p>
                </div>
              </template>
              <div v-else class="text-secondary text-sm">
                Nog geen feedback van de mentor voor deze week.
              </div>
            </section>
          </template>
        </template>
      </template>
    </main>
  </div>
</template>

<style scoped>
/* Weekkeuze-stijl staat globaal in styles.css (gedeeld met de mentor). */
</style>
