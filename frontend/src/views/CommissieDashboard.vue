<script setup>
import { ref, onMounted } from 'vue'
import TopBar from '../components/TopBar.vue'

const navLinks = ref([
  { label: 'Aanvragen', to: '/commissie' },
])

const aanvragen = ref([])
const geselecteerde = ref(null)
const detailLaden = ref(false)
const motivatie = ref('')
const bezig = ref(false)
const bericht = ref('')
const laadFout = ref('')

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
  motivatie.value = ''
  bericht.value = ''
  // Volledig detail ophalen; de lijst bevat maar een handvol velden.
  detailLaden.value = true
  geselecteerde.value = aanvraag
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/stages/${aanvraag.stage_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) geselecteerde.value = await res.json()
  } catch {
    // Bij fout tonen we het beperkte lijst-object dat we al hadden.
  } finally {
    detailLaden.value = false
  }
}

function terugNaarLijst() {
  geselecteerde.value = null
  motivatie.value = ''
  bericht.value = ''
}

async function beslis(actie) {
  if ((actie === 'afkeuren' || actie === 'aanpassing') && !motivatie.value.trim()) {
    bericht.value = 'Vul een motivatie in voor deze beslissing.'
    return
  }
  bezig.value = true
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/stages/${geselecteerde.value.stage_id}/beslissing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ beslissing: actie, motivatie: motivatie.value }),
    })
    const data = await res.json()
    if (res.ok) {
      bericht.value = 'Beslissing opgeslagen!'
      await laadAanvragen()
      setTimeout(() => terugNaarLijst(), 1800)
    } else {
      bericht.value = data.error || 'Opslaan mislukt.'
    }
  } catch {
    bericht.value = 'Er ging iets mis.'
  } finally {
    bezig.value = false
  }
}

function statusBadge(status) {
  if (status === 'ingediend') return 'badge-yellow'
  if (status === 'in_behandeling') return 'badge-yellow'
  return 'badge-gray'
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

      <!-- Lijst -->
      <div v-if="!geselecteerde">
        <h1 class="page-title">Aanvragen stagecommissie</h1>
        <p class="text-secondary text-sm mt-4 mb-16">
          {{ aanvragen.length }} aanvraag(en) wachten op beoordeling.
        </p>

        <p v-if="laadFout" class="text-sm" style="color:#dc2626;">{{ laadFout }}</p>

        <div v-if="aanvragen.length === 0 && !laadFout" class="card mt-24">
          <p class="font-semibold">Geen openstaande aanvragen</p>
          <p class="text-secondary text-sm mt-8">Alle aanvragen zijn beoordeeld.</p>
        </div>

        <div
          v-for="aanvraag in aanvragen"
          :key="aanvraag.stage_id"
          class="card mt-16"
        >
          <div class="flex justify-between items-center">
            <div>
              <div class="flex items-center gap-12">
                <span class="font-semibold" style="font-size:16px;">
                  {{ aanvraag.voornaam }} {{ aanvraag.student_naam }}
                </span>
                <span class="badge badge-pill" :class="statusBadge(aanvraag.status)">
                  {{ aanvraag.status }}
                </span>
              </div>
              <p class="text-secondary text-sm mt-4">{{ aanvraag.bedrijf }}</p>
              <p class="text-secondary text-sm">
                {{ formatDatum(aanvraag.startdatum) }} — {{ formatDatum(aanvraag.einddatum) }}
              </p>
            </div>
            <button class="btn btn-primary btn-sm" @click="selecteer(aanvraag)">
              Beoordelen →
            </button>
          </div>
        </div>
      </div>

      <!-- Detail -->
      <div v-else>
        <button class="btn btn-secondary mb-16" @click="terugNaarLijst">← Overzicht</button>

        <h1 class="page-title">
          {{ geselecteerde.student_voornaam || geselecteerde.voornaam }}
          {{ geselecteerde.student_naam || geselecteerde.student }}
        </h1>

        <div class="card mt-16">
          <h2 class="form-section-title">Gegevens aanvraag</h2>
          <p v-if="detailLaden" class="text-secondary text-sm mt-12">Gegevens laden…</p>
          <div v-else class="form-grid-2 mt-12">
            <div>
              <p class="text-secondary text-sm">Studentnummer</p>
              <p class="font-semibold">{{ geselecteerde.studentnummer || '—' }}</p>
            </div>
            <div>
              <p class="text-secondary text-sm">Opleiding</p>
              <p>{{ geselecteerde.opleiding || '—' }}</p>
            </div>
            <div>
              <p class="text-secondary text-sm">E-mail student</p>
              <p>{{ geselecteerde.student_email || '—' }}</p>
            </div>
            <div>
              <p class="text-secondary text-sm">Telefoon student</p>
              <p>{{ geselecteerde.student_telefoon || '—' }}</p>
            </div>
            <div>
              <p class="text-secondary text-sm">Bedrijf</p>
              <p class="font-semibold">{{ geselecteerde.bedrijf || '—' }}</p>
            </div>
            <div>
              <p class="text-secondary text-sm">Sector</p>
              <p>{{ geselecteerde.bedrijf_sector || '—' }}</p>
            </div>
            <div>
              <p class="text-secondary text-sm">Adres bedrijf</p>
              <p>
                {{ geselecteerde.bedrijf_straatnaam || '' }} {{ geselecteerde.bedrijf_huisnummer || '' }}<br>
                {{ geselecteerde.bedrijf_postcode || '' }} {{ geselecteerde.bedrijf_gemeente || '' }}
              </p>
            </div>
            <div>
              <p class="text-secondary text-sm">Provincie</p>
              <p>{{ geselecteerde.bedrijf_provincie || '—' }}</p>
            </div>
            <div>
              <p class="text-secondary text-sm">Stagementor</p>
              <p>
                {{ geselecteerde.mentor_voornaam }} {{ geselecteerde.mentor_naam }}
                <span v-if="geselecteerde.mentor_functie" class="text-secondary">
                  ({{ geselecteerde.mentor_functie }})
                </span>
              </p>
            </div>
            <div>
              <p class="text-secondary text-sm">Contact mentor</p>
              <p>{{ geselecteerde.mentor_email || '—' }} · {{ geselecteerde.mentor_telefoon || '—' }}</p>
            </div>
            <div>
              <p class="text-secondary text-sm">Docent EHB</p>
              <p>{{ [geselecteerde.docent_voornaam, geselecteerde.docent_naam].filter(Boolean).join(' ') || 'Nog niet toegewezen' }}</p>
            </div>
            <div>
              <p class="text-secondary text-sm">Periode</p>
              <p>{{ formatDatum(geselecteerde.startdatum) }} — {{ formatDatum(geselecteerde.einddatum) }}</p>
            </div>
            <div>
              <p class="text-secondary text-sm">Stagetitel</p>
              <p>{{ geselecteerde.stagetitel || '—' }}</p>
            </div>
            <div>
              <p class="text-secondary text-sm">Ingediend op</p>
              <p>{{ formatDatum(geselecteerde.ingediend_op) }}</p>
            </div>
            <div>
              <p class="text-secondary text-sm">Status</p>
              <span class="badge badge-pill" :class="statusBadge(geselecteerde.status)">
                {{ geselecteerde.status }}
              </span>
            </div>
          </div>
          <div v-if="!detailLaden && geselecteerde.beschrijving" class="mt-16">
            <p class="text-secondary text-sm">Opdrachtsomschrijving</p>
            <p class="mt-4" style="white-space:pre-line;line-height:1.6;">{{ geselecteerde.beschrijving }}</p>
          </div>
        </div>

        <div class="card mt-16">
          <h2 class="form-section-title">Beslissing</h2>
          <p class="text-secondary text-sm mt-8 mb-16">
            Motivatie is verplicht bij afkeuring of aanpassingen.
          </p>

          <div class="form-group">
            <label>Motivatie / Feedback</label>
            <textarea
              v-model="motivatie"
              rows="4"
              class="form-input mt-8"
              placeholder="Schrijf hier je feedback of reden voor afkeuring..."
            ></textarea>
          </div>

          <div v-if="bericht" class="mt-12 card" style="background:#f0fdf4;border:1px solid #bbf7d0;">
            <p style="color:#15803d;">{{ bericht }}</p>
          </div>

          <div class="flex gap-8 mt-16" style="flex-wrap:wrap;">
            <button class="btn btn-primary" @click="beslis('goedkeuren')" :disabled="bezig"
              style="background:#16a34a;">
              Goedkeuren
            </button>
            <button class="btn btn-primary" @click="beslis('aanpassing')" :disabled="bezig"
              style="background:#d97706;">
              Aanpassingen vereist
            </button>
            <button class="btn btn-primary" @click="beslis('afkeuren')" :disabled="bezig"
              style="background:#dc2626;">
              Afkeuren
            </button>
          </div>
        </div>
      </div>

    </main>
  </div>
</template>

<style scoped></style>
