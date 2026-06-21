<script setup>
import { API_URL } from '@/api'
import { ref, computed, onMounted } from 'vue'
import TopBarDocentStagecommissie from '@/components/TopBarDocentStagecommissie.vue'

const API = `${API_URL}/api`
const navLinks = ref([{ label: 'Logboeken', to: '/mentor' }])

const dagNamen = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag']
const dagKort = {
  maandag: 'Maandag', dinsdag: 'Dinsdag', woensdag: 'Woensdag',
  donderdag: 'Donderdag', vrijdag: 'Vrijdag',
}

const logboeken = ref([])
const geselecteerd = ref(null)
const feedbackTekst = ref('')
const laden = ref(false)
const detailLaden = ref(false)
const bevestigenBezig = ref(false)
const fout = ref(null)
const successMelding = ref(null)

const ingediend = computed(() => logboeken.value.filter(l => l.status === 'ingediend'))
const goedgekeurd = computed(() => logboeken.value.filter(l => l.status === 'goedgekeurd'))

async function laadLogboeken() {
  laden.value = true
  fout.value = null
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`${API}/mentor/logboeken`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Laden mislukt')
    logboeken.value = data
  } catch (e) {
    fout.value = e.message
  } finally {
    laden.value = false
  }
}

async function openDetail(logboek) {
  detailLaden.value = true
  fout.value = null
  successMelding.value = null
  feedbackTekst.value = ''
  geselecteerd.value = null
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`${API}/logboeken/${logboek.logboek_id}/volledig`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Laden mislukt')
    geselecteerd.value = data
  } catch (e) {
    fout.value = e.message
  } finally {
    detailLaden.value = false
  }
}

function sluitDetail() {
  geselecteerd.value = null
  feedbackTekst.value = ''
  successMelding.value = null
  fout.value = null
}

async function bevestig() {
  if (bevestigenBezig.value || !geselecteerd.value) return
  bevestigenBezig.value = true
  fout.value = null
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`${API}/logboeken/${geselecteerd.value.logboek.logboek_id}/bevestigen`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ feedback: feedbackTekst.value }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Bevestigen mislukt')

    geselecteerd.value.logboek.status = 'goedgekeurd'

    if (feedbackTekst.value.trim()) {
      const gebruiker = JSON.parse(localStorage.getItem('gebruiker') || '{}')
      geselecteerd.value.feedback.push({
        opmerking: feedbackTekst.value.trim(),
        voornaam: gebruiker.voornaam || '',
        auteur: gebruiker.naam || '',
        rol: 'mentor',
        created_at: new Date().toISOString(),
      })
    }

    const idx = logboeken.value.findIndex(
      l => l.logboek_id === geselecteerd.value.logboek.logboek_id
    )
    if (idx >= 0) logboeken.value[idx].status = 'goedgekeurd'

    successMelding.value = 'Logboek bevestigd!'
    feedbackTekst.value = ''
  } catch (e) {
    fout.value = e.message
  } finally {
    bevestigenBezig.value = false
  }
}

function dagVoorLogboek(dagNaam) {
  return geselecteerd.value?.dagen?.find(d => d.dag === dagNaam) || null
}

function formatDatum(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('nl-BE', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

onMounted(() => {
  laadLogboeken()
})
</script>

<template>
  <div class="page">
    <TopBarDocentStagecommissie :links="navLinks" />

    <main class="content">

      <!-- Detail view -->
      <template v-if="detailLaden || geselecteerd">
        <button
          class="text-secondary text-sm"
          style="background:none;border:none;cursor:pointer;padding:0;margin-bottom:16px;"
          @click="sluitDetail"
        >← Terug naar overzicht</button>

        <div v-if="detailLaden" class="text-secondary text-sm">Laden…</div>

        <template v-if="geselecteerd">
          <!-- Header -->
          <section class="card" style="margin-bottom:16px;">
            <div class="flex justify-between items-center">
              <div>
                <div class="td-name">
                  {{ geselecteerd.logboek.student_voornaam }} {{ geselecteerd.logboek.student_naam }}
                  — Week {{ geselecteerd.logboek.week_nummer }}
                </div>
                <div class="td-sub">{{ geselecteerd.logboek.bedrijf }}</div>
                <div v-if="geselecteerd.logboek.ingediend_op" class="text-secondary text-xs" style="margin-top:4px;">
                  Ingediend op {{ formatDatum(geselecteerd.logboek.ingediend_op) }}
                </div>
              </div>
              <span
                class="badge badge-pill"
                :class="geselecteerd.logboek.status === 'goedgekeurd' ? 'badge-green' : 'badge-yellow'"
              >
                {{ geselecteerd.logboek.status === 'goedgekeurd' ? 'Bevestigd' : 'Wacht op bevestiging' }}
              </span>
            </div>
          </section>

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
                :class="dagVoorLogboek(dagNaam) ? 'badge-green' : 'badge-yellow'"
              >{{ dagVoorLogboek(dagNaam) ? 'Ingevuld' : 'Leeg' }}</span>
            </div>

            <template v-if="dagVoorLogboek(dagNaam)">
              <div class="text-sm" style="margin-bottom:8px;">
                <span class="text-secondary">Uitgevoerde taken</span>
                <div style="margin-top:4px;white-space:pre-wrap;">
                  {{ dagVoorLogboek(dagNaam).activiteiten || '—' }}
                </div>
              </div>
              <div class="text-sm" style="margin-bottom:8px;">
                <span class="text-secondary">Reflectie</span>
                <div style="margin-top:4px;white-space:pre-wrap;">
                  {{ dagVoorLogboek(dagNaam).reflectie || '—' }}
                </div>
              </div>
              <div class="text-sm">
                <span class="text-secondary">Problemen / leerpunten</span>
                <div style="margin-top:4px;white-space:pre-wrap;">
                  {{ dagVoorLogboek(dagNaam).leerpunten || '—' }}
                </div>
              </div>
            </template>
            <div v-else class="text-secondary text-sm">Geen invoer voor deze dag.</div>
          </section>

          <!-- Bestaande feedback -->
          <section v-if="geselecteerd.feedback.length" class="card" style="margin-bottom:16px;">
            <div class="font-semibold" style="margin-bottom:12px;">Feedback</div>
            <div
              v-for="(fb, i) in geselecteerd.feedback"
              :key="i"
              style="padding:8px 0;"
              :style="i < geselecteerd.feedback.length - 1 ? 'border-bottom:1px solid var(--border);' : ''"
            >
              <div class="flex justify-between">
                <span class="font-medium text-sm">{{ fb.voornaam }} {{ fb.auteur }}</span>
                <span class="text-secondary text-xs">{{ formatDatum(fb.created_at) }}</span>
              </div>
              <p class="text-sm" style="margin-top:4px;">{{ fb.opmerking }}</p>
            </div>
          </section>

          <!-- Bevestigen sectie -->
          <section v-if="geselecteerd.logboek.status === 'ingediend'" class="card">
            <div class="font-semibold" style="margin-bottom:12px;">Week bevestigen</div>
            <div v-if="fout" style="color:var(--red,#dc2626);font-size:14px;margin-bottom:12px;">{{ fout }}</div>
            <div v-if="successMelding" style="color:var(--green,#16a34a);font-size:14px;margin-bottom:12px;">✓ {{ successMelding }}</div>
            <div class="form-group" style="margin-bottom:16px;">
              <label>Feedback voor de student (optioneel)</label>
              <textarea
                v-model="feedbackTekst"
                rows="4"
                placeholder="Geef feedback aan de student…"
              ></textarea>
            </div>
            <button class="btn btn-primary" :disabled="bevestigenBezig" @click="bevestig">
              {{ bevestigenBezig ? 'Bevestigen…' : '✓ Week bevestigen' }}
            </button>
          </section>

          <section v-else-if="geselecteerd.logboek.status === 'goedgekeurd'" class="card">
            <div v-if="successMelding" style="color:var(--green,#16a34a);font-size:14px;">✓ {{ successMelding }}</div>
            <div v-else class="text-secondary text-sm">
              Deze week is al bevestigd.
            </div>
          </section>
        </template>
      </template>

      <!-- Lijst view -->
      <template v-else>
        <h1 class="page-title">Logboeken</h1>

        <div v-if="laden" class="text-secondary text-sm">Laden…</div>
        <div v-else-if="fout" style="color:var(--red,#dc2626);font-size:14px;">{{ fout }}</div>

        <template v-else>
          <!-- Wacht op bevestiging -->
          <div v-if="ingediend.length">
            <div class="flex items-center gap-8" style="margin-bottom:12px;">
              <h2 class="font-semibold" style="font-size:16px;">Wacht op bevestiging</h2>
              <span class="badge badge-yellow badge-pill">{{ ingediend.length }}</span>
            </div>
            <div class="table-wrapper">
              <section
                v-for="log in ingediend"
                :key="log.logboek_id"
                class="card"
                style="border:none;border-bottom:1px solid var(--border);border-radius:0;"
              >
                <div class="flex justify-between items-center">
                  <div>
                    <div class="td-name">
                      {{ log.student_voornaam }} {{ log.student_naam }} — Week {{ log.week_nummer }}
                    </div>
                    <div class="td-sub">{{ log.bedrijf }}</div>
                    <div v-if="log.ingediend_op" class="text-secondary text-xs" style="margin-top:4px;">
                      Ingediend op {{ formatDatum(log.ingediend_op) }}
                    </div>
                  </div>
                  <button class="btn btn-primary btn-sm" @click="openDetail(log)">
                    Bekijken & bevestigen →
                  </button>
                </div>
              </section>
            </div>
          </div>

          <!-- Bevestigd -->
          <div v-if="goedgekeurd.length" :style="ingediend.length ? 'margin-top:32px;' : ''">
            <h2 class="font-semibold" style="font-size:16px;margin-bottom:12px;">Bevestigd</h2>
            <div class="table-wrapper">
              <section
                v-for="log in goedgekeurd"
                :key="log.logboek_id"
                class="card"
                style="border:none;border-bottom:1px solid var(--border);border-radius:0;"
              >
                <div class="flex justify-between items-center">
                  <div>
                    <div class="td-name">
                      {{ log.student_voornaam }} {{ log.student_naam }} — Week {{ log.week_nummer }}
                    </div>
                    <div class="td-sub">{{ log.bedrijf }}</div>
                  </div>
                  <div class="flex items-center gap-12">
                    <span class="badge badge-green badge-pill">Bevestigd</span>
                    <button class="btn btn-secondary btn-sm" @click="openDetail(log)">Bekijken →</button>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <!-- Leeg -->
          <div v-if="!ingediend.length && !goedgekeurd.length">
            <p class="text-secondary" style="margin-top:8px;">
              Geen logboeken ingediend door studenten.
            </p>
          </div>
        </template>
      </template>

    </main>
  </div>
</template>
