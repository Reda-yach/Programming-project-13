<script setup>
import { ref, onMounted } from 'vue'
import TopBarDocentStagecommissie from '@/components/TopBarDocentStagecommissie.vue'

const navLinks = ref([
  { label: 'Studenten', to: '/docent-studenten' },
  { label: 'Logboek', to: '/docent-logboek-overzicht' },
  { label: 'Evaluaties', to: '/docent-evaluaties' },
  { label: 'Aanvragen', to: '/docent-aanvragen' },
])

const aanvragen = ref([])
const geselecteerde = ref(null)
const laadFout = ref('')
const bezig = ref(false)

// Beslissing-formulier
const beslissing = ref('')
const motivatie = ref('')
const formFout = ref('')
const succesmelding = ref('')

onMounted(async () => {
  await laadAanvragen()
})

async function laadAanvragen() {
  laadFout.value = ''
  const token = localStorage.getItem('token')
  try {
    const res = await fetch('http://localhost:3000/api/stages', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Ophalen mislukt')
    aanvragen.value = await res.json()
  } catch {
    laadFout.value = 'Aanvragen konden niet geladen worden.'
  }
}

async function selecteer(aanvraag) {
  formFout.value = ''
  succesmelding.value = ''
  beslissing.value = ''
  motivatie.value = ''
  geselecteerde.value = null

  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/stages/${aanvraag.stage_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Detail ophalen mislukt')
    geselecteerde.value = await res.json()
  } catch {
    laadFout.value = 'Detail kon niet geladen worden.'
  }
}

function terugNaarLijst() {
  geselecteerde.value = null
  beslissing.value = ''
  motivatie.value = ''
  formFout.value = ''
  succesmelding.value = ''
}

function kiesBeslissing(keuze) {
  beslissing.value = keuze
  formFout.value = ''
}

async function verzendBeslissing() {
  formFout.value = ''

  if (!beslissing.value) {
    formFout.value = 'Kies een beslissing.'
    return
  }
  if ((beslissing.value === 'afkeuren' || beslissing.value === 'aanpassing') && !motivatie.value.trim()) {
    formFout.value = 'Motivatie is verplicht bij afkeuren of aanpassing vragen.'
    return
  }

  bezig.value = true
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/stages/${geselecteerde.value.stage_id}/beslissing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ beslissing: beslissing.value, motivatie: motivatie.value }),
    })
    const data = await res.json()
    if (!res.ok) {
      formFout.value = data.error || 'Beslissing opslaan mislukt.'
      return
    }
    succesmelding.value = `Beslissing opgeslagen: ${beslissingLabel(beslissing.value)}`
    await laadAanvragen()
    setTimeout(() => {
      terugNaarLijst()
    }, 1800)
  } catch {
    formFout.value = 'Er ging iets mis. Probeer opnieuw.'
  } finally {
    bezig.value = false
  }
}

function beslissingLabel(b) {
  if (b === 'goedkeuren') return 'Goedgekeurd'
  if (b === 'afkeuren') return 'Afgewezen'
  if (b === 'aanpassing') return 'Aanpassing gevraagd'
  return b
}

function statusBadge(status) {
  if (status === 'ingediend') return 'badge-yellow'
  if (status === 'in_behandeling') return 'badge-yellow'
  if (status === 'goedgekeurd') return 'badge-green'
  if (status === 'afgewezen') return 'badge-red'
  return ''
}

function statusLabel(status) {
  if (status === 'ingediend') return 'Ingediend'
  if (status === 'in_behandeling') return 'In behandeling'
  if (status === 'goedgekeurd') return 'Goedgekeurd'
  if (status === 'afgewezen') return 'Afgewezen'
  if (status === 'aanpassing_gevraagd') return 'Aanpassing gevraagd'
  return status
}

function formatDatum(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="page">
    <TopBarDocentStagecommissie :links="navLinks" />

    <main class="content">

      <!-- LIJSTWEERGAVE -->
      <div v-if="!geselecteerde">
        <h1 class="page-title">Aanvragen</h1>

        <p v-if="laadFout" class="text-secondary" style="color:#dc2626;">{{ laadFout }}</p>

        <div v-if="aanvragen.length === 0 && !laadFout" class="card mt-24">
          <p class="text-secondary">Geen openstaande aanvragen.</p>
        </div>

        <div
          v-for="aanvraag in aanvragen"
          :key="aanvraag.stage_id"
          class="card mt-16"
        >
          <div class="flex justify-between items-center">
            <div>
              <div class="td-name">{{ aanvraag.voornaam }} {{ aanvraag.student }}</div>
              <div class="td-sub">{{ aanvraag.bedrijf }}</div>
              <div class="text-secondary text-xs mt-8">
                {{ aanvraag.stagetitel }} &nbsp;·&nbsp;
                Ingediend op {{ formatDatum(aanvraag.ingediend_op) }}
              </div>
            </div>
            <div class="flex items-center gap-16">
              <span class="badge badge-pill" :class="statusBadge(aanvraag.status)">
                {{ statusLabel(aanvraag.status) }}
              </span>
              <button class="btn btn-primary btn-sm" @click="selecteer(aanvraag)">
                Bekijk →
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- DETAILWEERGAVE -->
      <div v-else>
        <button class="btn btn-secondary mb-16" @click="terugNaarLijst">← Aanvragen</button>

        <!-- Succesmelding -->
        <div v-if="succesmelding" class="card mt-8 mb-16" style="background:#f0fdf4;border:1px solid #bbf7d0;">
          <p class="font-semibold" style="color:#15803d;">✓ {{ succesmelding }}</p>
        </div>

        <h1 class="page-title">{{ geselecteerde.stagetitel }}</h1>
        <div class="flex items-center gap-12 mt-4 mb-24">
          <span class="badge badge-pill" :class="statusBadge(geselecteerde.status)">
            {{ statusLabel(geselecteerde.status) }}
          </span>
          <span class="text-secondary text-sm">Ingediend op {{ formatDatum(geselecteerde.ingediend_op) }}</span>
        </div>

        <!-- Student -->
        <section class="card mb-16">
          <h2 class="form-section-title">Gegevens student</h2>
          <div class="form-grid-2 mt-12">
            <div>
              <p class="text-secondary text-xs">Naam</p>
              <p class="font-semibold">{{ geselecteerde.student_voornaam }} {{ geselecteerde.student_naam }}</p>
            </div>
            <div>
              <p class="text-secondary text-xs">Studentnummer</p>
              <p class="font-semibold">{{ geselecteerde.studentnummer }}</p>
            </div>
            <div>
              <p class="text-secondary text-xs">Opleiding</p>
              <p class="font-semibold">{{ geselecteerde.opleiding }}</p>
            </div>
            <div>
              <p class="text-secondary text-xs">E-mail</p>
              <p class="font-semibold">{{ geselecteerde.student_email }}</p>
            </div>
            <div>
              <p class="text-secondary text-xs">Telefoon</p>
              <p class="font-semibold">{{ geselecteerde.student_telefoon || '—' }}</p>
            </div>
          </div>
        </section>

        <!-- Bedrijf -->
        <section class="card mb-16">
          <h2 class="form-section-title">Gegevens bedrijf</h2>
          <div class="form-grid-2 mt-12">
            <div>
              <p class="text-secondary text-xs">Bedrijf</p>
              <p class="font-semibold">{{ geselecteerde.bedrijf }}</p>
            </div>
            <div>
              <p class="text-secondary text-xs">Sector</p>
              <p class="font-semibold">{{ geselecteerde.bedrijf_sector }}</p>
            </div>
            <div>
              <p class="text-secondary text-xs">Adres</p>
              <p class="font-semibold">{{ geselecteerde.bedrijf_adres }}</p>
            </div>
          </div>
        </section>

        <!-- Mentor -->
        <section class="card mb-16">
          <h2 class="form-section-title">Stagementor</h2>
          <div class="form-grid-2 mt-12">
            <div>
              <p class="text-secondary text-xs">Naam</p>
              <p class="font-semibold">{{ geselecteerde.mentor_voornaam }} {{ geselecteerde.mentor_naam }}</p>
            </div>
            <div>
              <p class="text-secondary text-xs">Functie</p>
              <p class="font-semibold">{{ geselecteerde.mentor_functie }}</p>
            </div>
            <div>
              <p class="text-secondary text-xs">E-mail</p>
              <p class="font-semibold">{{ geselecteerde.mentor_email }}</p>
            </div>
            <div>
              <p class="text-secondary text-xs">Telefoon</p>
              <p class="font-semibold">{{ geselecteerde.mentor_telefoon || '—' }}</p>
            </div>
          </div>
        </section>

        <!-- Stageopdracht -->
        <section class="card mb-16">
          <h2 class="form-section-title">Stageopdracht</h2>
          <p class="mt-12" style="white-space:pre-line;line-height:1.6;">{{ geselecteerde.beschrijving }}</p>
          <div class="form-grid-2 mt-16">
            <div>
              <p class="text-secondary text-xs">Startdatum</p>
              <p class="font-semibold">{{ formatDatum(geselecteerde.startdatum) }}</p>
            </div>
            <div>
              <p class="text-secondary text-xs">Einddatum</p>
              <p class="font-semibold">{{ formatDatum(geselecteerde.einddatum) }}</p>
            </div>
          </div>
        </section>

        <!-- Beslissing -->
        <section class="card mb-16">
          <h2 class="form-section-title">Beslissing</h2>

          <div class="flex gap-12 mt-16">
            <button
              class="btn"
              :class="beslissing === 'goedkeuren' ? 'btn-primary' : 'btn-secondary'"
              @click="kiesBeslissing('goedkeuren')"
            >
              Goedkeuren
            </button>
            <button
              class="btn"
              :class="beslissing === 'aanpassing' ? 'btn-primary' : 'btn-secondary'"
              @click="kiesBeslissing('aanpassing')"
            >
              Aanpassing vragen
            </button>
            <button
              class="btn"
              :class="beslissing === 'afkeuren' ? 'btn-primary' : 'btn-secondary'"
              style="border-color:#dc2626;"
              :style="beslissing === 'afkeuren' ? 'background:#dc2626;' : ''"
              @click="kiesBeslissing('afkeuren')"
            >
              Afkeuren
            </button>
          </div>

          <div class="form-group mt-16" v-if="beslissing">
            <label>
              Motivatie
              <span v-if="beslissing !== 'goedkeuren'" style="color:#dc2626;"> *</span>
              <span v-else class="text-secondary text-xs"> (optioneel)</span>
            </label>
            <textarea
              v-model="motivatie"
              rows="4"
              class="form-input"
              :placeholder="
                beslissing === 'goedkeuren'
                  ? 'Eventuele opmerkingen bij goedkeuring...'
                  : 'Geef een duidelijke reden voor uw beslissing...'
              "
            ></textarea>
          </div>

          <p v-if="formFout" class="text-sm mt-8" style="color:#dc2626;">{{ formFout }}</p>

          <button
            v-if="beslissing"
            class="btn btn-primary mt-16"
            @click="verzendBeslissing"
            :disabled="bezig"
          >
            {{ bezig ? 'Bezig...' : 'Beslissing bevestigen' }}
          </button>
        </section>

      </div>
    </main>
  </div>
</template>

<style scoped></style>
