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

const stageBezig = computed(() =>
  stageStore.status === 'goedgekeurd' &&
  !!stageStore.aanvraag?.startdatum &&
  new Date() >= new Date(stageStore.aanvraag.startdatum)
)

const navLinks = computed(() =>
  stageBezig.value
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

const opgeslagenGebruiker = JSON.parse(localStorage.getItem('gebruiker') || '{}')

const student = ref({
  naam: opgeslagenGebruiker?.naam || '',
  voornaam: opgeslagenGebruiker?.voornaam || '',
  studentnr: opgeslagenGebruiker?.studentnummer || '',
  opleiding: opgeslagenGebruiker?.opleiding || '',
  email: opgeslagenGebruiker?.email || '',
  telefoon: opgeslagenGebruiker?.telefoonnummer || '',
})

// Formuliervelden bedrijf
const bedrijf = ref('')
const sector = ref('')
// Adres opgesplitst in aparte velden
const straatnaam = ref('')
const huisnummer = ref('')
const postcode = ref('')
const gemeente = ref('')
const opdracht = ref('')
const datumVan = ref('')
const datumTot = ref('')

// Formuliervelden mentor (naam opgesplitst in voornaam + achternaam)
const mentorVoornaam = ref('')
const mentorAchternaam = ref('')
const mentorFunctie = ref('')
const mentorEmail = ref('')
const mentorTel = ref('')

// Foutmeldingen per veld
const fouten = reactive({})

// Modal-zichtbaarheid
const toonBevestiging = ref(false)

// Bij het laden: als er al een aanvraag is, vul de velden ermee in
// zodat de student ziet wat hij heeft ingediend.
onMounted(async () => {
  await stageStore.laad()
  if (stageStore.status === 'aanpassing_gevraagd' && stageStore.aanvraag) {
    const a = stageStore.aanvraag
    bedrijf.value = a.bedrijf || ''
    sector.value = a.bedrijf_sector || ''
    straatnaam.value = a.bedrijf_straatnaam || ''
    huisnummer.value = a.bedrijf_huisnummer || ''
    postcode.value = a.bedrijf_postcode || ''
    gemeente.value = a.bedrijf_gemeente || ''
    opdracht.value = a.beschrijving || ''
    datumVan.value = (a.startdatum || '').slice(0, 10)
    datumTot.value = (a.einddatum || '').slice(0, 10)
    mentorVoornaam.value = a.mentor_voornaam || ''
    mentorAchternaam.value = a.mentor_naam || ''
    mentorFunctie.value = a.mentor_functie || ''
    mentorEmail.value = a.mentor_email || ''
    mentorTel.value = a.mentor_telefoon || ''
  }
})

function valideer() {
  Object.keys(fouten).forEach((k) => delete fouten[k])

  if (!bedrijf.value.trim()) fouten.bedrijf = 'Bedrijfsnaam is verplicht'
  if (!sector.value.trim()) fouten.sector = 'Sector is verplicht'

  // Adres: straatnaam en gemeente zijn tekst, huisnummer en postcode moeten getallen zijn
  if (!straatnaam.value.trim()) fouten.straatnaam = 'Straatnaam is verplicht'

  if (!huisnummer.value && huisnummer.value !== 0) {
    fouten.huisnummer = 'Huisnummer is verplicht'
  } else if (isNaN(huisnummer.value)) {
    fouten.huisnummer = 'Huisnummer moet een getal zijn'
  } else if (Number(huisnummer.value) <= 0) {
    fouten.huisnummer = 'Huisnummer moet groter zijn dan 0'
  }

  if (!postcode.value && postcode.value !== 0) {
    fouten.postcode = 'Postcode is verplicht'
  } else if (isNaN(postcode.value)) {
    fouten.postcode = 'Postcode moet een getal zijn'
  } else if (String(postcode.value).length !== 4) {
    fouten.postcode = 'Een Belgische postcode bestaat uit 4 cijfers'
  }

  if (!gemeente.value.trim()) fouten.gemeente = 'Gemeente is verplicht'

  if (!opdracht.value.trim()) {
    fouten.opdracht = 'Omschrijving is verplicht'
  } else if (opdracht.value.trim().length < 20) {
    fouten.opdracht = 'Geef een uitgebreidere omschrijving (minstens 20 tekens)'
  }

  if (!datumVan.value) fouten.datumVan = 'Startdatum is verplicht'
  if (!datumTot.value) fouten.datumTot = 'Einddatum is verplicht'
  if (datumVan.value && datumTot.value && datumVan.value >= datumTot.value) {
    fouten.datumTot = 'Einddatum moet na de startdatum liggen'
  }

  if (!mentorVoornaam.value.trim()) fouten.mentorVoornaam = 'Voornaam mentor is verplicht'
  if (!mentorAchternaam.value.trim()) fouten.mentorAchternaam = 'Achternaam mentor is verplicht'
  if (!mentorFunctie.value.trim()) fouten.mentorFunctie = 'Functie is verplicht'

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!mentorEmail.value.trim()) {
    fouten.mentorEmail = 'E-mail mentor is verplicht'
  } else if (!emailRegex.test(mentorEmail.value)) {
    fouten.mentorEmail = 'Ongeldig e-mailadres'
  }

  // Telefoonnummer: verplicht + moet op een geldig nummer lijken.
  // Toegestaan: cijfers, spaties, +, -, haakjes. Minstens 8 cijfers.
  const telRegex = /^[0-9\s+\-()]+$/
  const aantalCijfers = (mentorTel.value.match(/[0-9]/g) || []).length
  if (!mentorTel.value.trim()) {
    fouten.mentorTel = 'Telefoonnummer mentor is verplicht'
  } else if (!telRegex.test(mentorTel.value)) {
    fouten.mentorTel = 'Telefoonnummer mag enkel cijfers, spaties, +, - en () bevatten'
  } else if (aantalCijfers < 8) {
    fouten.mentorTel = 'Telefoonnummer lijkt te kort'
  }

  return Object.keys(fouten).length === 0
}

function bouwAanvraag() {
  return {
    student: student.value,
    bedrijf: {
      bedrijf: bedrijf.value,
      sector: sector.value,
      straatnaam: straatnaam.value,
      huisnummer: huisnummer.value,
      postcode: postcode.value,
      gemeente: gemeente.value,
      opdracht: opdracht.value,
      datumVan: datumVan.value,
      datumTot: datumTot.value,
    },
    mentor: {
      voornaam: mentorVoornaam.value,
      achternaam: mentorAchternaam.value,
      functie: mentorFunctie.value,
      email: mentorEmail.value,
      tel: mentorTel.value,
    },
  }
}

async function handleIndienen() {
  if (alIngediend.value) return
  if (!valideer()) return
  try {
    if (stageStore.status === 'aanpassing_gevraagd') {
      await stageStore.pasAan(bouwAanvraag())
    } else {
      await stageStore.dienIn(bouwAanvraag())
    }
    toonBevestiging.value = true
  } catch (e) {
    alert(e.message)
  }
}

function sluitModal() {
  toonBevestiging.value = false
}

function naarDashboard() {
  router.push('/student')
}
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />

    <main class="content">
      <div class="flex items-center gap-16">
        <h1 class="page-title">Stage-aanvraag indienen</h1>
        <span
          v-if="alIngediend"
          class="badge badge-pill"
          :class="stageStore.status === 'goedgekeurd' ? 'badge-green' : 'badge-yellow'"
        >
          {{ stageStore.status === 'goedgekeurd' ? 'Goedgekeurd' : 'In behandeling' }}
        </span>
      </div>

      <!-- Bij ingediende aanvraag een korte toelichting bovenaan -->
      <p v-if="alIngediend" class="text-secondary text-sm" style="line-height:1.6;">
        <template v-if="stageStore.status === 'goedgekeurd'">
          Je stage-aanvraag is goedgekeurd door de stagecommissie.
          Hieronder zie je de gegevens die je hebt doorgegeven.
        </template>
        <template v-else>
          Je aanvraag is ingediend en wordt beoordeeld door de stagecommissie.
          Hieronder zie je de gegevens die je hebt doorgegeven.
        </template>
      </p>

      <form @submit.prevent="handleIndienen">

        <!-- Gegevens student -->
        <section class="form-section">
          <h2 class="form-section-title">Gegevens student</h2>
          <div class="form-grid-2">
            <div class="form-group">
              <label for="naam">Naam</label>
              <input type="text" id="naam" :value="student.naam" readonly>
            </div>
            <div class="form-group">
              <label for="voornaam">Voornaam</label>
              <input type="text" id="voornaam" :value="student.voornaam" readonly>
            </div>
            <div class="form-group">
              <label for="studentnr">Studentnummer</label>
              <input type="text" id="studentnr" :value="student.studentnr" readonly>
            </div>
            <div class="form-group">
              <label for="opleiding">Opleiding</label>
              <input type="text" id="opleiding" :value="student.opleiding" readonly>
            </div>
            <div class="form-group">
              <label for="email">E-mail</label>
              <input type="email" id="email" :value="student.email" readonly>
            </div>
            <div class="form-group">
              <label for="telefoon">Telefoon</label>
              <input type="tel" id="telefoon" :value="student.telefoon" readonly>
            </div>
          </div>
        </section>

        <!-- Gegevens bedrijf -->
        <section class="form-section mt-24">
          <h2 class="form-section-title">Gegevens bedrijf</h2>
          <div class="form-grid-2">
            <div class="form-group">
              <label for="bedrijf">Bedrijfsnaam</label>
              <input type="text" id="bedrijf" v-model="bedrijf" placeholder="Naam van het bedrijf" :readonly="alIngediend">
              <span v-if="fouten.bedrijf" class="form-error">{{ fouten.bedrijf }}</span>
            </div>
            <div class="form-group">
              <label for="sector">Sector</label>
              <input type="text" id="sector" v-model="sector" placeholder="bv. ICT &amp; Consultancy" :readonly="alIngediend">
              <span v-if="fouten.sector" class="form-error">{{ fouten.sector }}</span>
            </div>
            <div class="form-group">
              <label for="straatnaam">Straatnaam</label>
              <input type="text" id="straatnaam" v-model="straatnaam" placeholder="bv. Nijverheidskaai" :readonly="alIngediend">
              <span v-if="fouten.straatnaam" class="form-error">{{ fouten.straatnaam }}</span>
            </div>
            <div class="form-group">
              <label for="huisnummer">Huisnummer</label>
              <input type="number" id="huisnummer" v-model="huisnummer" min="1" placeholder="bv. 170" :readonly="alIngediend">
              <span v-if="fouten.huisnummer" class="form-error">{{ fouten.huisnummer }}</span>
            </div>
            <div class="form-group">
              <label for="postcode">Postcode</label>
              <input type="number" id="postcode" v-model="postcode" placeholder="bv. 1070" :readonly="alIngediend">
              <span v-if="fouten.postcode" class="form-error">{{ fouten.postcode }}</span>
            </div>
            <div class="form-group">
              <label for="gemeente">Gemeente</label>
              <input type="text" id="gemeente" v-model="gemeente" placeholder="bv. Anderlecht" :readonly="alIngediend">
              <span v-if="fouten.gemeente" class="form-error">{{ fouten.gemeente }}</span>
            </div>
            <div class="form-group form-group-full">
              <label for="opdracht">Omschrijving opdracht</label>
              <textarea id="opdracht" v-model="opdracht" rows="5" placeholder="Beschrijf de stageopdracht (minstens 20 tekens)" :readonly="alIngediend"></textarea>
              <span v-if="fouten.opdracht" class="form-error">{{ fouten.opdracht }}</span>
            </div>
            <div class="form-group">
              <label for="datum-van">Stageperiode van</label>
              <input type="date" id="datum-van" v-model="datumVan" :readonly="alIngediend">
              <span v-if="fouten.datumVan" class="form-error">{{ fouten.datumVan }}</span>
            </div>
            <div class="form-group">
              <label for="datum-tot">Stageperiode tot</label>
              <input type="date" id="datum-tot" v-model="datumTot" :readonly="alIngediend">
              <span v-if="fouten.datumTot" class="form-error">{{ fouten.datumTot }}</span>
            </div>
          </div>
        </section>

        <!-- Gegevens stagementor -->
        <section class="form-section mt-24">
          <h2 class="form-section-title">Gegevens stagementor</h2>
          <div class="form-grid-2">
            <div class="form-group">
              <label for="mentor-voornaam">Voornaam mentor</label>
              <input type="text" id="mentor-voornaam" v-model="mentorVoornaam" placeholder="Voornaam mentor" :readonly="alIngediend">
              <span v-if="fouten.mentorVoornaam" class="form-error">{{ fouten.mentorVoornaam }}</span>
            </div>
            <div class="form-group">
              <label for="mentor-achternaam">Achternaam mentor</label>
              <input type="text" id="mentor-achternaam" v-model="mentorAchternaam" placeholder="Achternaam mentor" :readonly="alIngediend">
              <span v-if="fouten.mentorAchternaam" class="form-error">{{ fouten.mentorAchternaam }}</span>
            </div>
            <div class="form-group">
              <label for="mentor-functie">Functie</label>
              <input type="text" id="mentor-functie" v-model="mentorFunctie" placeholder="bv. Senior Developer" :readonly="alIngediend">
              <span v-if="fouten.mentorFunctie" class="form-error">{{ fouten.mentorFunctie }}</span>
            </div>
            <div class="form-group">
              <label for="mentor-email">E-mail mentor</label>
              <input type="email" id="mentor-email" v-model="mentorEmail" placeholder="mentor@bedrijf.be" :readonly="alIngediend">
              <span v-if="fouten.mentorEmail" class="form-error">{{ fouten.mentorEmail }}</span>
            </div>
            <div class="form-group">
              <label for="mentor-tel">Telefoon mentor</label>
              <input type="tel" id="mentor-tel" v-model="mentorTel" placeholder="+32 ..." :readonly="alIngediend">
              <span v-if="fouten.mentorTel" class="form-error">{{ fouten.mentorTel }}</span>
            </div>
          </div>
        </section>

        <!-- Indienen-knop alleen tonen als er nog niet is ingediend -->
        <div v-if="!alIngediend" class="mt-24">
          <button type="submit" class="btn btn-primary">Indienen</button>
        </div>

      </form>
    </main>

    <!-- Bevestigingsscherm (modal overlay) -->
    <div v-if="toonBevestiging" class="modal-page" style="position:fixed;inset:0;z-index:200;">
      <div class="modal-card">
        <div class="modal-icon">✅</div>
        <h2 class="modal-title">Aanvraag ingediend!</h2>
        <p class="modal-sub">
          Je stage-aanvraag voor <strong>{{ bedrijf || 'het bedrijf' }}</strong> is succesvol ingediend.
          Je begeleider krijgt een melding en neemt de aanvraag in behandeling.
        </p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="sluitModal">Terug naar formulier</button>
          <button class="btn btn-primary" @click="naarDashboard">Naar dashboard</button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Laat het omschrijvingsveld over de volledige breedte van het raster lopen */
.form-group-full {
  grid-column: 1 / -1;
}
</style>