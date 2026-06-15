<script setup>
import { ref, computed, onMounted } from 'vue'
import TopBar from '../components/TopBar.vue'
import { useStageStore } from '../stores/stage'

const stageStore = useStageStore()

const navLinks = ref([
  { label: 'Dashboard', to: '/student' },
  { label: 'Aanvraag', to: '/student/aanvraag' },
  { label: 'Logboek', to: '/student/logboek' },
  { label: 'Evaluatie', to: '/student/evaluatie' },
])

const logboeken = ref([])
const geselecteerd = ref(null)
const toonNieuwFormulier = ref(false)
const laadFout = ref('')
const opslaBericht = ref('')
const bezig = ref(false)

const gebruiker = JSON.parse(localStorage.getItem('gebruiker') || '{}')

// Nieuw logboek formulier
const nieuw = ref({ week_nummer: '', activiteiten: '', reflectie: '', leerpunten: '', uren: '' })
const formFout = ref('')

onMounted(async () => {
  await stageStore.laad()
  await laadLogboeken()
})

const stageId = computed(() => stageStore.aanvraag?.stage_id || null)
const stageActief = computed(() => {
  const s = stageStore.status
  return s === 'goedgekeurd' || s === 'bezig' || s === 'afgerond'
})

async function laadLogboeken() {
  if (!stageId.value) return
  laadFout.value = ''
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/stages/${stageId.value}/logboeken`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Ophalen mislukt')
    logboeken.value = await res.json()
  } catch {
    laadFout.value = 'Logboeken konden niet geladen worden.'
  }
}

function selecteer(logboek) {
  geselecteerd.value = logboek
  toonNieuwFormulier.value = false
}

function terugNaarLijst() {
  geselecteerd.value = null
  toonNieuwFormulier.value = false
  opslaBericht.value = ''
}

function openNieuwFormulier() {
  toonNieuwFormulier.value = true
  geselecteerd.value = null
  formFout.value = ''
  const volgend = logboeken.value.length > 0
    ? Math.max(...logboeken.value.map(l => l.week_nummer)) + 1
    : 1
  nieuw.value = { week_nummer: volgend, activiteiten: '', reflectie: '', leerpunten: '', uren: '' }
}

async function dienNieuwIn() {
  formFout.value = ''
  if (!nieuw.value.week_nummer) { formFout.value = 'Weeknummer is verplicht.'; return }
  if (!nieuw.value.activiteiten.trim()) { formFout.value = 'Beschrijf de uitgevoerde taken.'; return }
  if (!nieuw.value.reflectie.trim()) { formFout.value = 'Reflectie is verplicht.'; return }

  bezig.value = true
  const token = localStorage.getItem('token')
  try {
    const res = await fetch('http://localhost:3000/api/logboeken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        student_id: gebruiker.student_id,
        stage_id: stageId.value,
        week_nummer: Number(nieuw.value.week_nummer),
        activiteiten: nieuw.value.activiteiten,
        reflectie: nieuw.value.reflectie,
        leerpunten: nieuw.value.leerpunten,
        uren: nieuw.value.uren ? Number(nieuw.value.uren) : null,
      }),
    })
    const data = await res.json()
    if (!res.ok) { formFout.value = data.error || 'Indienen mislukt.'; return }
    toonNieuwFormulier.value = false
    await laadLogboeken()
  } catch {
    formFout.value = 'Er ging iets mis. Probeer opnieuw.'
  } finally {
    bezig.value = false
  }
}

function statusBadge(status) {
  if (status === 'goedgekeurd') return 'badge-green'
  if (status === 'ingediend') return 'badge-yellow'
  return 'badge-red'
}

function statusLabel(status) {
  if (status === 'goedgekeurd') return 'Bevestigd door mentor'
  if (status === 'ingediend') return 'Ingediend'
  return 'Concept'
}

function formatDatum(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />

    <main class="content">

      <!-- Geen actieve stage -->
      <template v-if="!stageActief">
        <h1 class="page-title">Logboek</h1>
        <div class="card mt-24">
          <p class="font-semibold">Logboek nog niet beschikbaar</p>
          <p class="text-secondary text-sm mt-8">
            Je kunt een logboek invullen zodra je stage goedgekeurd is.
          </p>
        </div>
      </template>

      <!-- Actieve stage — lijstweergave -->
      <template v-else-if="!geselecteerd && !toonNieuwFormulier">
        <div class="flex justify-between items-center">
          <h1 class="page-title">Logboek</h1>
          <button class="btn btn-primary" @click="openNieuwFormulier">+ Nieuwe week</button>
        </div>

        <p v-if="laadFout" class="text-secondary mt-16" style="color:#dc2626;">{{ laadFout }}</p>

        <div v-if="logboeken.length === 0 && !laadFout" class="card mt-24">
          <p class="font-semibold">Nog geen logboeken</p>
          <p class="text-secondary text-sm mt-8">Klik op "+ Nieuwe week" om je eerste logboek in te dienen.</p>
        </div>

        <div
          v-for="logboek in [...logboeken].reverse()"
          :key="logboek.logboek_id"
          class="card mt-16"
        >
          <div class="flex justify-between items-center">
            <div>
              <div class="font-semibold" style="font-size:16px;">Week {{ logboek.week_nummer }}</div>
              <div class="text-secondary text-xs mt-4">
                Ingediend op {{ formatDatum(logboek.ingediend_op) }}
                · {{ logboek.uren ?? '—' }} uur
              </div>
            </div>
            <div class="flex items-center gap-12">
              <span class="badge badge-pill" :class="statusBadge(logboek.status)">
                {{ statusLabel(logboek.status) }}
              </span>
              <button class="btn btn-secondary btn-sm" @click="selecteer(logboek)">Bekijk →</button>
            </div>
          </div>
        </div>
      </template>

      <!-- Nieuw logboek invullen -->
      <template v-else-if="toonNieuwFormulier">
        <button class="btn btn-secondary mb-16" @click="terugNaarLijst">← Logboek</button>
        <h1 class="page-title">Nieuwe week indienen</h1>

        <section class="card mt-16">
          <div class="form-grid-2">
            <div class="form-group">
              <label>Weeknummer</label>
              <input type="number" v-model="nieuw.week_nummer" class="form-input" min="1" />
            </div>
            <div class="form-group">
              <label>Gewerkte uren</label>
              <input type="number" v-model="nieuw.uren" class="form-input" min="0" step="0.5" placeholder="bv. 38" />
            </div>
          </div>

          <div class="form-group mt-16">
            <label>Beschrijving van uitgevoerde taken <span style="color:#dc2626;">*</span></label>
            <textarea v-model="nieuw.activiteiten" rows="5" class="form-input"
              placeholder="Wat heb je deze week gedaan?"></textarea>
          </div>

          <div class="form-group mt-16">
            <label>Reflectie <span style="color:#dc2626;">*</span></label>
            <textarea v-model="nieuw.reflectie" rows="4" class="form-input"
              placeholder="Wat heb je geleerd? Hoe verliep de samenwerking?"></textarea>
          </div>

          <div class="form-group mt-16">
            <label>Problemen / Leerpunten</label>
            <textarea v-model="nieuw.leerpunten" rows="3" class="form-input"
              placeholder="Welke problemen heb je tegengekomen? Wat waren de leerpunten?"></textarea>
          </div>

          <p v-if="formFout" class="text-sm mt-8" style="color:#dc2626;">{{ formFout }}</p>

          <div class="flex gap-12 mt-24">
            <button class="btn btn-secondary" @click="terugNaarLijst">Annuleren</button>
            <button class="btn btn-primary" @click="dienNieuwIn" :disabled="bezig">
              {{ bezig ? 'Bezig...' : 'Indienen' }}
            </button>
          </div>
        </section>
      </template>

      <!-- Detail logboek -->
      <template v-else-if="geselecteerd">
        <button class="btn btn-secondary mb-16" @click="terugNaarLijst">← Logboek</button>

        <div class="flex items-center gap-12">
          <h1 class="page-title">Week {{ geselecteerd.week_nummer }}</h1>
          <span class="badge badge-pill" :class="statusBadge(geselecteerd.status)">
            {{ statusLabel(geselecteerd.status) }}
          </span>
        </div>
        <p class="text-secondary text-sm mt-4">
          Ingediend op {{ formatDatum(geselecteerd.ingediend_op) }}
          · {{ geselecteerd.uren ?? '—' }} uur
        </p>

        <section class="card mt-16">
          <h2 class="form-section-title">Uitgevoerde taken</h2>
          <p class="mt-8" style="white-space:pre-line;line-height:1.6;">{{ geselecteerd.activiteiten || '—' }}</p>
        </section>

        <section class="card mt-12">
          <h2 class="form-section-title">Reflectie</h2>
          <p class="mt-8" style="white-space:pre-line;line-height:1.6;">{{ geselecteerd.reflectie || '—' }}</p>
        </section>

        <section class="card mt-12">
          <h2 class="form-section-title">Problemen / Leerpunten</h2>
          <p class="mt-8" style="white-space:pre-line;line-height:1.6;">{{ geselecteerd.leerpunten || '—' }}</p>
        </section>
      </template>

    </main>
  </div>
</template>

<style scoped></style>
