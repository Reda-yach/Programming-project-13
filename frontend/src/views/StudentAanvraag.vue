<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import { useStageStore } from '../stores/stage'

const router = useRouter()
const stageStore = useStageStore()

const alIngediend = computed(() =>
  stageStore.status === 'in_behandeling' || stageStore.status === 'goedgekeurd'
)

const opgeslagenGebruiker = JSON.parse(localStorage.getItem('gebruiker') || '{}')

const student = ref({
  naam: opgeslagenGebruiker?.naam || '',
  voornaam: opgeslagenGebruiker?.voornaam || '',
  studentnr: opgeslagenGebruiker?.studentnummer || '',
  opleiding: opgeslagenGebruiker?.opleiding || '',
  email: opgeslagenGebruiker?.email || '',
  telefoon: opgeslagenGebruiker?.telefoonnummer || '',
})

// Bedrijfselectie
const beschikbareBedrijven = ref([])
const gekozenBedrijfId = ref('')
const toonVoorstelForm = ref(false)

// Voorstel-velden (nieuw bedrijf)
const voorstelNaam = ref('')
const voorstelEmail = ref('')
const voorstelTel = ref('')

// Stage-velden
const stagetitel = ref('')
const opdracht = ref('')
const datumVan = ref('')
const datumTot = ref('')

const fouten = reactive({})
const toonBevestiging = ref(false)
const bezig = ref(false)
const serverFout = ref('')

async function laadBedrijven() {
  const token = localStorage.getItem('token')
  try {
    const res = await fetch('http://localhost:3000/api/bedrijven', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) beschikbareBedrijven.value = await res.json()
  } catch {
    // stil falen — dropdown blijft leeg
  }
}

onMounted(async () => {
  await stageStore.laad()
  await laadBedrijven()

  const vulIn = ['in_behandeling', 'goedgekeurd', 'aanpassing_gevraagd']
  if (vulIn.includes(stageStore.status) && stageStore.aanvraag) {
    const a = stageStore.aanvraag
    gekozenBedrijfId.value = a.bedrijf_id ? String(a.bedrijf_id) : ''
    stagetitel.value = a.stagetitel || ''
    opdracht.value = a.beschrijving || ''
    datumVan.value = (a.startdatum || '').slice(0, 10)
    datumTot.value = (a.einddatum || '').slice(0, 10)
  }
})

function selecteerBedrijf(val) {
  if (val === 'voorstel') {
    toonVoorstelForm.value = true
    gekozenBedrijfId.value = ''
  } else {
    toonVoorstelForm.value = false
    gekozenBedrijfId.value = val
  }
}

function valideer() {
  Object.keys(fouten).forEach((k) => delete fouten[k])

  if (!gekozenBedrijfId.value && !toonVoorstelForm.value) {
    fouten.bedrijf = 'Kies een bedrijf of stel er één voor.'
  }

  if (toonVoorstelForm.value) {
    if (!voorstelNaam.value.trim()) fouten.voorstelNaam = 'Bedrijfsnaam is verplicht'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!voorstelEmail.value.trim()) fouten.voorstelEmail = 'Contact-e-mail is verplicht'
    else if (!emailRegex.test(voorstelEmail.value)) fouten.voorstelEmail = 'Ongeldig e-mailadres'
  }

  if (!stagetitel.value.trim()) fouten.stagetitel = 'Stagetitel is verplicht'
  else if (stagetitel.value.trim().length > 200) fouten.stagetitel = 'Stagetitel mag maximaal 200 tekens bevatten'

  if (!opdracht.value.trim()) fouten.opdracht = 'Omschrijving is verplicht'
  else if (opdracht.value.trim().length < 20) fouten.opdracht = 'Geef een uitgebreidere omschrijving (minstens 20 tekens)'

  if (!datumVan.value) fouten.datumVan = 'Startdatum is verplicht'
  if (!datumTot.value) fouten.datumTot = 'Einddatum is verplicht'
  if (datumVan.value && datumTot.value && datumVan.value >= datumTot.value) {
    fouten.datumTot = 'Einddatum moet na de startdatum liggen'
  }

  return Object.keys(fouten).length === 0
}

async function handleIndienen() {
  if (alIngediend.value) return
  if (!valideer()) return

  bezig.value = true
  serverFout.value = ''
  const token = localStorage.getItem('token')

  try {
    let bedrijfIdOmTeGebruiken = gekozenBedrijfId.value

    // Stap 1: nieuw bedrijf voorstellen als de student er één opgaf
    if (toonVoorstelForm.value) {
      const voorstelRes = await fetch('http://localhost:3000/api/bedrijven/voorstel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          naam: voorstelNaam.value.trim(),
          contact_email: voorstelEmail.value.trim(),
          contact_telefoonnummer: voorstelTel.value.trim() || null,
        }),
      })
      const voorstelData = await voorstelRes.json()
      if (!voorstelRes.ok) {
        serverFout.value = voorstelData.error || 'Bedrijfsvoorstel mislukt.'
        return
      }
      bedrijfIdOmTeGebruiken = voorstelData.bedrijf_id
    }

    // Stap 2: stage-aanvraag indienen
    const aanvraagRes = await fetch('http://localhost:3000/api/aanvraag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        bedrijf_id: bedrijfIdOmTeGebruiken,
        stagetitel: stagetitel.value.trim(),
        beschrijving: opdracht.value.trim(),
        startdatum: datumVan.value,
        einddatum: datumTot.value,
      }),
    })
    const aanvraagData = await aanvraagRes.json()
    if (!aanvraagRes.ok) {
      serverFout.value = aanvraagData.error || 'Indienen mislukt.'
      return
    }

    await stageStore.laad()
    toonBevestiging.value = true
  } catch {
    serverFout.value = 'Er ging iets mis. Probeer opnieuw.'
  } finally {
    bezig.value = false
  }
}

function naarDashboard() {
  router.push('/student')
}
</script>

<template>
  <div class="page">
    <TopBar :links="stageStore.studentNavLinks" />

    <main class="content">
      <h1 class="page-title">Stage-aanvraag indienen</h1>

      <form @submit.prevent="handleIndienen">
        <fieldset class="form-lock" :disabled="alIngediend">

          <!-- Gegevens student -->
          <section class="form-section">
            <h2 class="form-section-title">Gegevens student</h2>
            <div class="form-grid-2">
              <div class="form-group">
                <label>Naam</label>
                <input type="text" :value="student.naam" readonly>
              </div>
              <div class="form-group">
                <label>Voornaam</label>
                <input type="text" :value="student.voornaam" readonly>
              </div>
              <div class="form-group">
                <label>Studentnummer</label>
                <input type="text" :value="student.studentnr" readonly>
              </div>
              <div class="form-group">
                <label>Opleiding</label>
                <input type="text" :value="student.opleiding" readonly>
              </div>
              <div class="form-group">
                <label>E-mail</label>
                <input type="email" :value="student.email" readonly>
              </div>
              <div class="form-group">
                <label>Telefoon</label>
                <input type="tel" :value="student.telefoon" readonly>
              </div>
            </div>
          </section>

          <!-- Bedrijfselectie -->
          <section class="form-section mt-24">
            <h2 class="form-section-title">Stagebedrijf</h2>
            <div class="form-group">
              <label for="bedrijf-select">Selecteer een bedrijf</label>
              <select id="bedrijf-select" @change="selecteerBedrijf($event.target.value)" :value="toonVoorstelForm ? 'voorstel' : gekozenBedrijfId">
                <option value="" disabled>— Kies een bedrijf —</option>
                <option v-for="b in beschikbareBedrijven" :key="b.bedrijf_id" :value="String(b.bedrijf_id)">
                  {{ b.naam }}
                </option>
                <option value="voorstel">Mijn bedrijf staat er niet → voorstel toevoegen</option>
              </select>
              <span v-if="fouten.bedrijf" class="form-error">{{ fouten.bedrijf }}</span>
            </div>

            <!-- Nieuw bedrijf voorstellen -->
            <div v-if="toonVoorstelForm" class="card mt-16" style="border:1px solid var(--border);">
              <p class="text-secondary text-sm mb-12">Vul de gegevens in van het bedrijf waar je stage wil lopen. De admin keurt het bedrijf goed voordat je aanvraag definitief goedgekeurd kan worden.</p>
              <div class="form-grid-2">
                <div class="form-group form-group-full">
                  <label>Bedrijfsnaam <span style="color:#dc2626">*</span></label>
                  <input type="text" v-model="voorstelNaam" placeholder="Naam van het bedrijf">
                  <span v-if="fouten.voorstelNaam" class="form-error">{{ fouten.voorstelNaam }}</span>
                </div>
                <div class="form-group">
                  <label>Contact-e-mail <span style="color:#dc2626">*</span></label>
                  <input type="email" v-model="voorstelEmail" placeholder="contact@bedrijf.be">
                  <span v-if="fouten.voorstelEmail" class="form-error">{{ fouten.voorstelEmail }}</span>
                </div>
                <div class="form-group">
                  <label>Telefoon bedrijf</label>
                  <input type="tel" v-model="voorstelTel" placeholder="+32 ...">
                </div>
              </div>
            </div>
          </section>

          <!-- Stage-details -->
          <section class="form-section mt-24">
            <h2 class="form-section-title">Stagegegevens</h2>
            <div class="form-grid-2">
              <div class="form-group form-group-full">
                <label for="stagetitel">Stagetitel</label>
                <input id="stagetitel" type="text" v-model="stagetitel" maxlength="200" placeholder="Korte titel voor de stage (bv. Webapplicatie voor HR)">
                <span v-if="fouten.stagetitel" class="form-error">{{ fouten.stagetitel }}</span>
              </div>
              <div class="form-group form-group-full">
                <label for="opdracht">Omschrijving opdracht</label>
                <textarea id="opdracht" v-model="opdracht" rows="5" placeholder="Beschrijf de stageopdracht (minstens 20 tekens)"></textarea>
                <span v-if="fouten.opdracht" class="form-error">{{ fouten.opdracht }}</span>
              </div>
              <div class="form-group">
                <label for="datum-van">Stageperiode van</label>
                <input type="date" id="datum-van" v-model="datumVan">
                <span v-if="fouten.datumVan" class="form-error">{{ fouten.datumVan }}</span>
              </div>
              <div class="form-group">
                <label for="datum-tot">Stageperiode tot</label>
                <input type="date" id="datum-tot" v-model="datumTot">
                <span v-if="fouten.datumTot" class="form-error">{{ fouten.datumTot }}</span>
              </div>
            </div>
          </section>

        </fieldset>

        <div v-if="serverFout" class="card mt-16" style="border:1px solid #fca5a5;background:#fef2f2;">
          <p style="color:#dc2626;">{{ serverFout }}</p>
        </div>

        <div v-if="!alIngediend" class="mt-24">
          <button type="submit" class="btn btn-primary" :disabled="bezig">
            {{ bezig ? 'Bezig...' : (stageStore.status === 'aanpassing_gevraagd' ? 'Opnieuw indienen' : 'Indienen') }}
          </button>
        </div>
      </form>
    </main>

    <!-- Bevestigingsmodal -->
    <div v-if="toonBevestiging" class="modal-page" style="position:fixed;inset:0;z-index:200;">
      <div class="modal-card">
        <div class="modal-icon">✓</div>
        <h2 class="modal-title">Aanvraag ingediend!</h2>
        <p class="modal-sub">
          Je stage-aanvraag is succesvol ingediend.
          De stagecommissie neemt de aanvraag in behandeling.
        </p>
        <div class="modal-actions">
          <button class="btn btn-primary" @click="naarDashboard">Naar dashboard</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-group-full {
  grid-column: 1 / -1;
}
.form-lock {
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 0;
}
.form-lock:disabled input,
.form-lock:disabled select,
.form-lock:disabled textarea {
  background: var(--gray50);
  color: var(--text-secondary);
  -webkit-text-fill-color: var(--text-secondary);
  opacity: 1;
  cursor: default;
}
</style>
