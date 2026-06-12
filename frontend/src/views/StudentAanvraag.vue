<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import { useStageStore } from '../stores/stage'
import { useAuthStore } from '../stores/auth'
import { getStageStatusLabel } from '../utils/stageStatus'

const router = useRouter()
const stageStore = useStageStore()
const authStore = useAuthStore()

// true zodra er al een aanvraag loopt of de stage actief is
const alIngediend = computed(() => stageStore.status === 'in_behandeling' || stageStore.status === 'actief')
const statusLabel = computed(() => getStageStatusLabel(stageStore.status))

// Navbar-links — Dashboard + Aanvraag
const navLinks = ref([
  { label: 'Dashboard', to: '/student' },
  { label: 'Aanvraag', to: '/student/aanvraag' },
])

// Readonly student data — komt later uit de backend / Pinia store
const student = ref({
  naam: 'De Smedt',
  voornaam: 'Emma',
  studentnr: 'EHB-2024-0842',
  opleiding: 'Toegepaste Informatica',
  email: 'emma.desmedt@student.ehb.be',
  telefoon: '+32 479 12 34 56',
})

// Formuliervelden bedrijf
const bedrijf = ref('')
const sector = ref('')
const adres = ref('')
const opdracht = ref('')
const datumVan = ref('')
const datumTot = ref('')

// Formuliervelden mentor
const mentorNaam = ref('')
const mentorFunctie = ref('')
const mentorEmail = ref('')
const mentorTel = ref('')

// Foutmeldingen per veld
const fouten = reactive({})

// Modal-zichtbaarheid
const toonBevestiging = ref(false)
const isSubmitting = ref(false)
const submitError = ref('')

// Bij het laden: als er al een aanvraag is, vul de velden ermee in
// zodat de student ziet wat hij heeft ingediend.
onMounted(() => {
  const a = stageStore.aanvraag
  if (a) {
    bedrijf.value = a.bedrijf.bedrijf
    sector.value = a.bedrijf.sector
    adres.value = a.bedrijf.adres
    opdracht.value = a.bedrijf.opdracht
    datumVan.value = a.bedrijf.datumVan
    datumTot.value = a.bedrijf.datumTot
    mentorNaam.value = a.mentor.naam
    mentorFunctie.value = a.mentor.functie
    mentorEmail.value = a.mentor.email
    mentorTel.value = a.mentor.tel
  }
})

function valideer() {
  Object.keys(fouten).forEach((k) => delete fouten[k])

  if (!bedrijf.value.trim()) fouten.bedrijf = 'Bedrijfsnaam is verplicht'
  if (!sector.value.trim()) fouten.sector = 'Sector is verplicht'
  if (!adres.value.trim()) fouten.adres = 'Adres is verplicht'
  if (!opdracht.value.trim()) fouten.opdracht = 'Omschrijving is verplicht'

  if (!datumVan.value) fouten.datumVan = 'Startdatum is verplicht'
  if (!datumTot.value) fouten.datumTot = 'Einddatum is verplicht'
  if (datumVan.value && datumTot.value && datumVan.value >= datumTot.value) {
    fouten.datumTot = 'Einddatum moet na de startdatum liggen'
  }

  if (!mentorNaam.value.trim()) fouten.mentorNaam = 'Naam mentor is verplicht'
  if (!mentorFunctie.value.trim()) fouten.mentorFunctie = 'Functie is verplicht'

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!mentorEmail.value.trim()) {
    fouten.mentorEmail = 'E-mail mentor is verplicht'
  } else if (!emailRegex.test(mentorEmail.value)) {
    fouten.mentorEmail = 'Ongeldig e-mailadres'
  }

  return Object.keys(fouten).length === 0
}

function bouwAanvraag() {
  return {
    student: student.value,
    bedrijf: {
      bedrijf: bedrijf.value,
      sector: sector.value,
      adres: adres.value,
      opdracht: opdracht.value,
      datumVan: datumVan.value,
      datumTot: datumTot.value,
    },
    mentor: {
      naam: mentorNaam.value,
      functie: mentorFunctie.value,
      email: mentorEmail.value,
      tel: mentorTel.value,
    },
  }
}

async function handleIndienen() {
  if (alIngediend.value) return
  if (!valideer()) return

  isSubmitting.value = true
  submitError.value = ''

  try {
    const response = await fetch('http://localhost:3000/api/aanvraag', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify(bouwAanvraag()),
    })

    const data = await response.json()

    if (!response.ok) {
      submitError.value = data.error || 'De aanvraag kon niet worden ingediend.'
      return
    }

    stageStore.dienIn(bouwAanvraag())

    toonBevestiging.value = true
  } catch (error) {
    submitError.value = 'Kan geen verbinding maken met de backend.'
  } finally {
    isSubmitting.value = false
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
          class="badge badge-pill badge-yellow"
        >
          {{ statusLabel }}
        </span>
      </div>

      <!-- Bij ingediende aanvraag een korte toelichting bovenaan -->
      <p v-if="alIngediend" class="text-secondary text-sm" style="line-height:1.6;">
        Je aanvraag is ingediend en wordt beoordeeld door de stagecommissie.
        Hieronder zie je de gegevens die je hebt doorgegeven.
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
              <label for="adres">Adres</label>
              <input type="text" id="adres" v-model="adres" placeholder="Straat, postcode gemeente" :readonly="alIngediend">
              <span v-if="fouten.adres" class="form-error">{{ fouten.adres }}</span>
            </div>
            <div class="form-group">
              <label for="opdracht">Omschrijving opdracht</label>
              <input type="text" id="opdracht" v-model="opdracht" placeholder="Korte omschrijving van de stage" :readonly="alIngediend">
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
              <label for="mentor-naam">Naam mentor</label>
              <input type="text" id="mentor-naam" v-model="mentorNaam" placeholder="Achternaam mentor" :readonly="alIngediend">
              <span v-if="fouten.mentorNaam" class="form-error">{{ fouten.mentorNaam }}</span>
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
            </div>
          </div>
        </section>

        <!-- Indienen-knop alleen tonen als er nog niet is ingediend -->
        <div v-if="!alIngediend" class="mt-24">
          <button type="submit" class="btn btn-primary" :disabled="isSubmitting">{{ isSubmitting ? 'Indienen…' : 'Indienen' }}</button>
          <p v-if="submitError" class="form-error" style="margin-top: 12px;">{{ submitError }}</p>
        </div>

      </form>
    </main>

    <!-- Bevestigingsscherm (modal overlay) -->
    <div v-if="toonBevestiging" class="modal-page" style="position:fixed;inset:0;z-index:200;">
      <div class="modal-card">
        <div class="modal-icon" aria-hidden="true">OK</div>
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

<style scoped></style>
