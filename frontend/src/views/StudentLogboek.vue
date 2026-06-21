<script setup>
import { API_URL } from '@/api'
import { ref, computed, onMounted } from 'vue'
import TopBar from '../components/TopBar.vue'
import { useStageStore } from '../stores/stage'

const API = `${API_URL}/api`
const stageStore = useStageStore()

const dagNamen = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag']
const dagKort = { maandag: 'Ma', dinsdag: 'Di', woensdag: 'Wo', donderdag: 'Do', vrijdag: 'Vr' }
const dagIndex = { maandag: 0, dinsdag: 1, woensdag: 2, donderdag: 3, vrijdag: 4 }

const huidigeWeek = ref(1)
const maxWeek = ref(1)
const logboek = ref(null)
const dagen = ref([])
const feedback = ref([])
const actieveDag = ref('maandag')
const formulier = ref({ activiteiten: '', reflectie: '', leerpunten: '' })
const opgeslagen = ref(false)
const fout = ref(null)
const laden = ref(false)
const opslaanBezig = ref(false)
const indienenBezig = ref(false)
const vorigeWeekBevestigd = ref(null)

function berekenMaxWeek(startdatum) {
  const start = new Date(startdatum)
  const nu = new Date()
  if (nu < start) return 0
  return Math.floor((nu - start) / (7 * 24 * 60 * 60 * 1000)) + 1
}

const dagData = computed(() => {
  const map = {}
  for (const d of dagen.value) map[d.dag] = d
  return map
})

const aantalIngevuld = computed(() =>
  dagNamen.filter((d) => !!dagData.value[d]).length
)

const kanIndienen = computed(() =>
  aantalIngevuld.value === 5 && logboek.value?.status === 'draft'
)

const isReadonly = computed(() =>
  logboek.value?.status === 'ingediend' ||
  logboek.value?.status === 'goedgekeurd' ||
  isDagToekomst(actieveDag.value)
)

function isDagToekomst(dag) {
  if (huidigeWeek.value < maxWeek.value) return false
  if (!stageStore.aanvraag?.startdatum) return false
  const start = new Date(stageStore.aanvraag.startdatum)
  start.setHours(0, 0, 0, 0)
  const weekMaandag = new Date(start.getTime() + (huidigeWeek.value - 1) * 7 * 24 * 60 * 60 * 1000)
  const dagDatum = new Date(weekMaandag.getTime() + dagIndex[dag] * 24 * 60 * 60 * 1000)
  dagDatum.setHours(0, 0, 0, 0)
  const nu = new Date()
  nu.setHours(0, 0, 0, 0)
  return dagDatum > nu
}

function wisselDag(dag) {
  actieveDag.value = dag
  opgeslagen.value = false
  const d = dagData.value[dag]
  formulier.value = {
    activiteiten: d?.activiteiten || '',
    reflectie: d?.reflectie || '',
    leerpunten: d?.leerpunten || '',
  }
}

async function laadWeek(week) {
  laden.value = true
  fout.value = null
  logboek.value = null
  dagen.value = []
  feedback.value = []
  vorigeWeekBevestigd.value = null

  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`${API}/mijn-logboek/week/${week}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Laden mislukt')

    logboek.value = data.logboek
    dagen.value = data.dagen
    wisselDag('maandag')

    const fbRes = await fetch(`${API}/logboeken/${data.logboek.logboek_id}/feedback`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (fbRes.ok) feedback.value = await fbRes.json()

    if (week > 1) {
      const vRes = await fetch(`${API}/mijn-logboek/week/${week - 1}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (vRes.ok) {
        const vData = await vRes.json()
        if (vData.logboek?.status === 'goedgekeurd') {
          const vFbRes = await fetch(`${API}/logboeken/${vData.logboek.logboek_id}/feedback`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          const vFb = vFbRes.ok ? await vFbRes.json() : []
          vorigeWeekBevestigd.value = {
            week: week - 1,
            door: vFb[0] ? `${vFb[0].voornaam} ${vFb[0].auteur}`.trim() : 'de mentor',
            op: vFb[0]?.created_at || null,
          }
        }
      }
    }
  } catch (e) {
    fout.value = e.message
  } finally {
    laden.value = false
  }
}

async function slaanOp() {
  if (isReadonly.value || opslaanBezig.value) return
  opslaanBezig.value = true
  opgeslagen.value = false
  fout.value = null
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`${API}/logboeken/${logboek.value.logboek_id}/dag`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ dag: actieveDag.value, ...formulier.value }),
    })
    if (!res.ok) throw new Error((await res.json()).error || 'Opslaan mislukt')

    const bestaand = dagen.value.find((d) => d.dag === actieveDag.value)
    if (bestaand) {
      Object.assign(bestaand, formulier.value)
    } else {
      dagen.value.push({ dag: actieveDag.value, ...formulier.value })
    }
    opgeslagen.value = true
  } catch (e) {
    fout.value = e.message
  } finally {
    opslaanBezig.value = false
  }
}

async function dienIn() {
  if (!kanIndienen.value || indienenBezig.value) return
  indienenBezig.value = true
  fout.value = null
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`${API}/logboeken/${logboek.value.logboek_id}/indienen`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error((await res.json()).error || 'Indienen mislukt')
    logboek.value = { ...logboek.value, status: 'ingediend' }
  } catch (e) {
    fout.value = e.message
  } finally {
    indienenBezig.value = false
  }
}

function naarVorigeWeek() {
  if (huidigeWeek.value <= 1) return
  huidigeWeek.value--
  laadWeek(huidigeWeek.value)
}

function naarVolgendeWeek() {
  if (huidigeWeek.value >= maxWeek.value) return
  huidigeWeek.value++
  laadWeek(huidigeWeek.value)
}

function naarWeek(week) {
  huidigeWeek.value = week
  laadWeek(week)
}

function formatDatum(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })
}

onMounted(async () => {
  await stageStore.laad()
  // Logboek pas beschikbaar als het contract door alle drie de partijen is
  // getekend (stage actief). Goedgekeurd-maar-niet-getekend volstaat niet.
  if (!stageStore.volledigGetekend) {
    maxWeek.value = 0
    return
  }
  if (stageStore.aanvraag?.startdatum) {
    maxWeek.value = berekenMaxWeek(stageStore.aanvraag.startdatum)
  }
  if (maxWeek.value > 0) {
    huidigeWeek.value = maxWeek.value
    await laadWeek(huidigeWeek.value)
  }
})
</script>

<template>
  <div class="page">
    <TopBar :links="stageStore.studentNavLinks" />

    <main class="content">

      <!-- Stage niet goedgekeurd of nog niet begonnen -->
      <template v-if="maxWeek === 0">
        <h1 class="page-title">Logboek</h1>
        <p class="text-secondary" style="margin-top:8px;">
          <template v-if="!stageStore.volledigGetekend">
            Het logboek wordt beschikbaar zodra het stagecontract door alle partijen (stagecommissie, mentor en jezelf) is ondertekend.
          </template>
          <template v-else>
            Je stage is nog niet begonnen. Je kunt het logboek invullen vanaf de eerste stagedag.
          </template>
        </p>
      </template>

      <template v-else>
        <!-- Weeknavigatie -->
        <div class="flex items-center gap-16">
          <button
            class="btn btn-secondary btn-sm"
            :disabled="huidigeWeek <= 1"
            @click="naarVorigeWeek"
          >← Week {{ huidigeWeek - 1 }}</button>
          <h1 class="page-title" style="font-size:22px;">Logboek — Week {{ huidigeWeek }}</h1>
          <button
            class="btn btn-secondary btn-sm"
            :disabled="huidigeWeek >= maxWeek"
            @click="naarVolgendeWeek"
          >Week {{ huidigeWeek + 1 }} →</button>
          <span v-if="huidigeWeek === maxWeek" class="font-medium text-sm" style="margin-left:auto;">huidig</span>
        </div>

        <!-- Vorige week bevestigd banner -->
        <div
          v-if="vorigeWeekBevestigd"
          style="background:var(--green-bg);border:1px solid var(--green);border-radius:8px;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;"
        >
          <span style="color:var(--green);font-weight:500;font-size:14px;">
            ✓ Week {{ vorigeWeekBevestigd.week }} bevestigd door {{ vorigeWeekBevestigd.door }}
            <template v-if="vorigeWeekBevestigd.op"> — {{ formatDatum(vorigeWeekBevestigd.op) }}</template>
          </span>
          <button
            style="color:var(--green);background:none;border:none;cursor:pointer;font-size:13px;text-decoration:underline;"
            @click="naarWeek(vorigeWeekBevestigd.week)"
          >Volledig logboek week {{ vorigeWeekBevestigd.week }} bekijken →</button>
        </div>

        <div v-if="fout" style="color:var(--red,#dc2626);font-size:14px;">{{ fout }}</div>
        <div v-if="laden" class="text-secondary text-sm">Laden…</div>

        <template v-if="!laden && logboek">
          <!-- Status badge -->
          <div v-if="logboek.status !== 'draft'" style="margin-bottom:4px;">
            <span
              class="badge badge-pill"
              :class="logboek.status === 'goedgekeurd' ? 'badge-green' : 'badge-yellow'"
            >
              {{ logboek.status === 'goedgekeurd' ? 'Bevestigd door mentor' : 'Ingediend bij mentor' }}
            </span>
          </div>

          <!-- Dagelijkse invoer -->
          <div class="card">
            <div class="flex justify-between items-center" style="margin-bottom:16px;">
              <span class="card-title">Dagelijkse invoer</span>
              <span class="text-secondary text-sm">{{ aantalIngevuld }} van 5 dagen ingevuld</span>
            </div>

            <!-- Dag-tabs -->
            <div class="dag-tabs" style="margin-bottom:24px;">
              <div
                v-for="dag in dagNamen"
                :key="dag"
                class="dag-tab"
                :class="{
                  active: actieveDag === dag,
                  toekomst: isDagToekomst(dag),
                }"
                @click="!isDagToekomst(dag) && wisselDag(dag)"
              >
                <div>{{ dagKort[dag] }}</div>
                <div
                  class="dag-status"
                  :class="isDagToekomst(dag) ? 'toekomst-label' : dagData[dag] ? 'done' : 'open'"
                >
                  {{ isDagToekomst(dag) ? 'Nog niet' : dagData[dag] ? 'Ingevuld' : 'Openstaand' }}
                </div>
              </div>
            </div>

            <!-- Formulier -->
            <div class="form-group" style="margin-bottom:20px;">
              <label>Beschrijving van uitgevoerde taken</label>
              <textarea
                v-model="formulier.activiteiten"
                rows="4"
                placeholder="Wat heb je vandaag gedaan?"
                :readonly="isReadonly"
              ></textarea>
            </div>
            <div class="form-group" style="margin-bottom:20px;">
              <label>Reflectie</label>
              <textarea
                v-model="formulier.reflectie"
                rows="4"
                placeholder="Hoe verliep de dag? Wat leerde je?"
                :readonly="isReadonly"
              ></textarea>
            </div>
            <div class="form-group" style="margin-bottom:20px;">
              <label>Eventuele problemen of leerpunten</label>
              <textarea
                v-model="formulier.leerpunten"
                rows="4"
                placeholder="Welke problemen liep je tegen? Wat wil je verbeteren?"
                :readonly="isReadonly"
              ></textarea>
            </div>

            <div v-if="isDagToekomst(actieveDag)" style="color:var(--text-secondary);font-size:14px;padding:8px 0;">
              Deze dag is nog niet begonnen — je kunt hem invullen zodra de dag aangebroken is.
            </div>
            <div v-else-if="!isReadonly" class="flex items-center gap-12">
              <button class="btn btn-primary" :disabled="opslaanBezig" @click="slaanOp">
                {{ opslaanBezig ? 'Opslaan…' : 'Opslaan' }}
              </button>
              <span v-if="opgeslagen" class="text-sm" style="color:var(--green,#16a34a);">✓ Opgeslagen</span>
            </div>
          </div>

          <!-- Week indienen balk -->
          <div v-if="logboek.status === 'draft'" class="submit-bar">
            <div>
              <div class="submit-bar-title">Week indienen bij mentor</div>
              <div class="submit-bar-sub">
                Dien het logboek van week {{ huidigeWeek }} in zodra alle dagen zijn ingevuld.
              </div>
              <div class="flex items-center gap-8" style="margin-top:8px;">
                <span
                  class="badge"
                  style="border-radius:4px;"
                  :class="aantalIngevuld === 5 ? 'badge-green' : 'badge-orange'"
                >{{ aantalIngevuld }} van 5 dagen ingevuld</span>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;font-size:12px;color:var(--text-secondary);">
                <span v-for="dag in dagNamen" :key="dag">
                  {{ dagData[dag] ? '✓' : '●' }} {{ dagKort[dag] }} — {{ dagData[dag] ? 'Ingevuld' : 'Openstaand' }}
                </span>
              </div>
              <p v-if="aantalIngevuld < 5" class="text-xs" style="color:var(--orange,#ea580c);margin-top:8px;">
                Vul eerst alle 5 dagen in voordat je het logboek indient.
              </p>
            </div>
            <button
              class="btn"
              :class="kanIndienen ? 'btn-primary' : 'btn-secondary'"
              :disabled="!kanIndienen || indienenBezig"
              :style="!kanIndienen ? 'opacity:0.5;cursor:not-allowed;' : ''"
              @click="dienIn"
            >{{ indienenBezig ? 'Indienen…' : 'Logboek indienen' }}</button>
          </div>

          <!-- Ingediend bericht -->
          <div
            v-else-if="logboek.status === 'ingediend'"
            style="background:var(--gray50,#f9fafb);border:1px solid var(--border);border-radius:8px;padding:16px 20px;"
          >
            <div class="font-semibold">Logboek ingediend</div>
            <p class="text-secondary text-sm" style="margin-top:4px;">
              Je logboek van week {{ huidigeWeek }} is ingediend bij de mentor. Je ontvangt een melding zodra de mentor het bevestigt.
            </p>
          </div>

          <!-- Feedback sectie -->
          <div v-if="feedback.length" class="card">
            <div class="card-header">
              <span class="card-title">Feedback van mentor / docent</span>
            </div>
            <hr class="card-divider" />
            <div
              v-for="(fb, i) in feedback"
              :key="i"
              style="padding:12px 0;"
              :style="i < feedback.length - 1 ? 'border-bottom:1px solid var(--border);' : ''"
            >
              <div class="flex justify-between">
                <span class="font-medium text-sm">{{ fb.voornaam }} {{ fb.auteur }}</span>
                <span class="text-secondary text-xs">{{ formatDatum(fb.created_at) }}</span>
              </div>
              <p class="text-sm" style="margin-top:4px;">{{ fb.opmerking }}</p>
            </div>
          </div>
        </template>
      </template>

    </main>
  </div>
</template>

<style scoped>
.dag-tabs {
  display: flex;
  gap: 8px;
}
.dag-tab {
  flex: 1;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.dag-tab.active {
  background: #000;
  color: #fff;
  border-color: #000;
}
.dag-tab.active .dag-status { color: rgba(255, 255, 255, 0.7); }
.dag-status {
  font-size: 11px;
  font-weight: 400;
  margin-top: 3px;
}
.dag-status.open { color: var(--text-secondary); }
.dag-status.done { color: var(--green, #16a34a); }
.dag-tab.active .dag-status.done { color: rgba(255, 255, 255, 0.9); }
.dag-tab.toekomst {
  opacity: 0.4;
  cursor: not-allowed;
}
.dag-status.toekomst-label { color: var(--text-secondary); }

.submit-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  padding: 20px 24px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface, #fff);
}
.submit-bar-title {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
}
.submit-bar-sub {
  font-size: 14px;
  color: var(--text-secondary);
}
</style>
