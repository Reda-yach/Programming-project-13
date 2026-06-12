<script setup>
import { ref, onMounted } from 'vue'
import TopBar from '../components/TopBar.vue'

const navLinks = ref([
  { label: 'Aanvragen', to: '/commissie' },
])

const aanvragen = ref([])
const geselecteerde = ref(null)
const motivatie = ref('')
const bezig = ref(false)
const bericht = ref('')
const gebruiker = JSON.parse(localStorage.getItem('gebruiker'))

onMounted(async () => {
  await laadAanvragen()
})

async function laadAanvragen() {
  const token = localStorage.getItem('token')
  const res = await fetch('http://localhost:3000/api/begeleider/openstaand', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  aanvragen.value = await res.json()
}

function selecteer(aanvraag) {
  geselecteerde.value = aanvraag
  motivatie.value = ''
  bericht.value = ''
}

function terugNaarLijst() {
  geselecteerde.value = null
  motivatie.value = ''
  bericht.value = ''
}

async function beslis(beslissing) {
  if ((beslissing === 'afgekeurd' || beslissing === 'aanpassing_vereist') && !motivatie.value.trim()) {
    bericht.value = 'Vul een motivatie in voor deze beslissing.'
    return
  }

  bezig.value = true
  const token = localStorage.getItem('token')

  const res = await fetch('http://localhost:3000/api/commissie', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      stage_id: geselecteerde.value.stage_id,
      commissielid_id: gebruiker.id,
      beslissing,
      motivatie: motivatie.value
    })
  })

  const data = await res.json()
  bezig.value = false

  if (res.ok) {
    bericht.value = data.message
    await laadAanvragen()
    setTimeout(() => terugNaarLijst(), 1500)
  } else {
    bericht.value = data.error
  }
}
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />
    <main class="content">

      <!-- Lijst van aanvragen -->
      <div v-if="!geselecteerde">
        <h1 class="page-title">Aanvragen in behandeling</h1>
        <p class="text-secondary text-sm mt-8">
          {{ aanvragen.length }} aanvraag(en) wachten op beoordeling.
        </p>

        <div v-if="aanvragen.length === 0" class="card mt-24">
          <p class="text-secondary">Geen openstaande aanvragen.</p>
        </div>

        <div
          v-for="aanvraag in aanvragen"
          :key="aanvraag.stage_id"
          class="card mt-16"
          style="cursor:pointer;"
          @click="selecteer(aanvraag)"
        >
          <div class="flex items-center gap-16">
            <h2 class="form-section-title">
              {{ aanvraag.voornaam }} {{ aanvraag.student_naam }}
            </h2>
            <span class="badge badge-yellow">{{ aanvraag.status }}</span>
          </div>
          <p class="text-secondary text-sm mt-4">{{ aanvraag.bedrijf }}</p>
          <p class="text-secondary text-sm">
            {{ aanvraag.startdatum }} — {{ aanvraag.einddatum }}
          </p>
          <button class="btn btn-primary mt-16">Beoordelen →</button>
        </div>
      </div>

      <!-- Detail van een aanvraag -->
      <div v-else>
        <button class="btn btn-secondary mb-16" @click="terugNaarLijst">
          ← Terug naar overzicht
        </button>

        <h1 class="page-title">
          {{ geselecteerde.voornaam }} {{ geselecteerde.student_naam }}
        </h1>

        <div class="card mt-16">
          <h2 class="form-section-title">Gegevens aanvraag</h2>
          <div class="form-grid-2 mt-12">
            <div>
              <p class="text-secondary text-sm">Bedrijf</p>
              <p><strong>{{ geselecteerde.bedrijf }}</strong></p>
            </div>
            <div>
              <p class="text-secondary text-sm">Periode</p>
              <p>{{ geselecteerde.startdatum }} — {{ geselecteerde.einddatum }}</p>
            </div>
            <div>
              <p class="text-secondary text-sm">Stagetitel</p>
              <p>{{ geselecteerde.stagetitel }}</p>
            </div>
            <div>
              <p class="text-secondary text-sm">Status</p>
              <span class="badge badge-yellow">{{ geselecteerde.status }}</span>
            </div>
          </div>
        </div>

        <div class="card mt-16">
          <h2 class="form-section-title">Beslissing</h2>
          <p class="text-secondary text-sm mt-8">
            Voeg een motivatie toe bij afkeuring of aanpassingen.
          </p>

          <div class="form-group mt-12">
            <label>Motivatie / Feedback</label>
            <textarea
              v-model="motivatie"
              rows="4"
              class="form-input"
              placeholder="Schrijf hier je feedback of reden voor afkeuring..."
            ></textarea>
          </div>

          <p v-if="bericht" class="text-sm mt-8">
            {{ bericht }}
          </p>

          <div class="flex gap-8 mt-16">
            <button
              class="btn btn-primary"
              @click="beslis('goedgekeurd')"
              :disabled="bezig"
              style="background:#16a34a;"
            >
              ✓ Goedkeuren
            </button>
            <button
              class="btn btn-primary"
              @click="beslis('aanpassing_vereist')"
              :disabled="bezig"
              style="background:#d97706;"
            >
              ⚠ Aanpassingen vereist
            </button>
            <button
              class="btn btn-primary"
              @click="beslis('afgekeurd')"
              :disabled="bezig"
              style="background:#dc2626;"
            >
              ✗ Afkeuren
            </button>
          </div>
        </div>

      </div>

    </main>
  </div>
</template>

<style scoped></style>
