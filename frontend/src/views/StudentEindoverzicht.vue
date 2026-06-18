<script setup>
import { ref, computed, onMounted } from 'vue'
import TopBar from '../components/TopBar.vue'
import { useStageStore } from '../stores/stage'

const stageStore = useStageStore()

const eindoverzichtVrij = computed(() => !!stageStore.aanvraag?.eindoverzicht_vrij)

const navLinks = computed(() => {
  const links = [
    { label: 'Dashboard', to: '/student' },
    { label: 'Aanvraag', to: '/student/aanvraag' },
    { label: 'Contract', to: '/student/contract' },
    { label: 'Logboek', to: '/student/logboek' },
    { label: 'Evaluatie', to: '/student/evaluatie' },
  ]
  if (eindoverzichtVrij.value) {
    links.push({ label: 'Eindoverzicht', to: '/student/eindoverzicht' })
  }
  return links
})

const stage = ref(null)
const evaluaties = ref([])
const logboeken = ref([])
const contract = ref(null)
const laadFout = ref('')

onMounted(async () => {
  await stageStore.laad()
  if (stageId.value) {
    await Promise.all([laadStage(), laadEvaluaties(), laadLogboeken(), laadContract()])
  }
})

const stageId = computed(() => stageStore.aanvraag?.stage_id || null)
const stageActief = computed(() => {
  const s = stageStore.status
  return s === 'goedgekeurd'
})

async function laadStage() {
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/stages/${stageId.value}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) stage.value = await res.json()
  } catch { /* stil */ }
}

async function laadEvaluaties() {
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/stages/${stageId.value}/evaluatie-overzicht`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) evaluaties.value = await res.json()
  } catch { /* stil */ }
}

async function laadLogboeken() {
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/stages/${stageId.value}/logboeken`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) logboeken.value = await res.json()
  } catch { /* stil */ }
}

async function laadContract() {
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`http://localhost:3000/api/contracten/${stageId.value}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) contract.value = await res.json()
  } catch { /* stil */ }
}

const tussentijdse = computed(() => evaluaties.value.filter(e => e.fase === 'tussentijds'))
const finale = computed(() => evaluaties.value.filter(e => e.fase === 'finaal'))
const logboekenGoedgekeurd = computed(() => logboeken.value.filter(l => l.status === 'goedgekeurd').length)
const contractVolledig = computed(() => contract.value?.getekend_student && contract.value?.getekend_mentor && contract.value?.getekend_docent)

function typeLabel(type) {
  return type === 'docent' ? 'Docent' : type === 'mentor' ? 'Mentor' : 'Zelfevaluatie'
}
function formatDatum(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />

    <main class="content">
      <h1 class="page-title">Eindoverzicht stage</h1>

      <template v-if="!stageActief || !eindoverzichtVrij">
        <div class="card mt-24">
          <p class="font-semibold">Eindoverzicht nog niet beschikbaar</p>
          <p class="text-secondary text-sm mt-8">
            {{ !stageActief
              ? 'Dit overzicht is beschikbaar zodra je stage goedgekeurd is.'
              : 'Dit overzicht wordt zichtbaar zodra je docent én mentor hun finale evaluatie hebben ingediend.' }}
          </p>
        </div>
      </template>

      <template v-else>

        <!-- Stagegegevens -->
        <div class="card mt-24">
          <h2 class="form-section-title">Stage</h2>
          <div class="form-grid-2 mt-12">
            <div>
              <p class="text-secondary text-xs">Bedrijf</p>
              <p class="font-semibold">{{ stage?.bedrijf || '—' }}</p>
            </div>
            <div>
              <p class="text-secondary text-xs">Stagetitel</p>
              <p class="font-semibold">{{ stage?.stagetitel || '—' }}</p>
            </div>
            <div>
              <p class="text-secondary text-xs">Periode</p>
              <p>{{ formatDatum(stage?.startdatum) }} — {{ formatDatum(stage?.einddatum) }}</p>
            </div>
            <div>
              <p class="text-secondary text-xs">Status</p>
              <span class="badge badge-pill badge-green">{{ stage?.status || '—' }}</span>
            </div>
          </div>
        </div>

        <!-- Contract -->
        <div class="card mt-16">
          <h2 class="form-section-title">Stagecontract</h2>
          <div v-if="contract" class="flex gap-24 mt-12" style="flex-wrap:wrap;">
            <span>Student:
              <span class="badge" :class="contract.getekend_student ? 'badge-green' : 'badge-gray'">
                {{ contract.getekend_student ? 'Ondertekend' : 'Wacht op handtekening' }}
              </span>
            </span>
            <span>Mentor:
              <span class="badge" :class="contract.getekend_mentor ? 'badge-green' : 'badge-gray'">
                {{ contract.getekend_mentor ? 'Ondertekend' : 'Wacht op handtekening' }}
              </span>
            </span>
            <span>Docent:
              <span class="badge" :class="contract.getekend_docent ? 'badge-green' : 'badge-gray'">
                {{ contract.getekend_docent ? 'Ondertekend' : 'Wacht op handtekening' }}
              </span>
            </span>
          </div>
          <p v-if="contractVolledig" class="text-sm mt-8" style="color:#16a34a;">
            Volledig ondertekend op {{ formatDatum(contract.getekend_op) }}
          </p>
          <p v-else-if="contract" class="text-secondary text-sm mt-8">Nog niet volledig ondertekend.</p>
          <p v-else class="text-secondary text-sm mt-12">Geen contract gevonden.</p>
        </div>

        <!-- Logboeken -->
        <div class="card mt-16">
          <h2 class="form-section-title">Logboek</h2>
          <div class="flex gap-24 mt-12" style="flex-wrap:wrap;">
            <div>
              <p class="text-secondary text-xs">Totaal ingediend</p>
              <p class="font-semibold" style="font-size:24px;">{{ logboeken.length }}</p>
            </div>
            <div>
              <p class="text-secondary text-xs">Goedgekeurd door mentor</p>
              <p class="font-semibold" style="font-size:24px;">{{ logboekenGoedgekeurd }}</p>
            </div>
          </div>
          <div v-if="logboeken.length > 0" class="mt-12">
            <p class="text-secondary text-xs font-semibold mb-8">Weken:</p>
            <div class="flex gap-8" style="flex-wrap:wrap;">
              <span
                v-for="l in logboeken" :key="l.logboek_id"
                class="badge badge-pill"
                :class="l.status === 'goedgekeurd' ? 'badge-green' : l.status === 'ingediend' ? 'badge-yellow' : 'badge-gray'"
              >
                Week {{ l.week_nummer }}
              </span>
            </div>
          </div>
        </div>

        <!-- Tussentijdse evaluaties -->
        <div class="card mt-16">
          <h2 class="form-section-title">Tussentijdse evaluaties</h2>
          <div v-if="tussentijdse.length === 0" class="mt-8">
            <p class="text-secondary text-sm">Nog geen tussentijdse evaluaties beschikbaar.</p>
          </div>
          <div v-for="ev in tussentijdse" :key="ev.evaluatie_id" class="mt-12"
            style="border-bottom:1px solid var(--border);padding-bottom:12px;">
            <div class="flex justify-between items-center">
              <div>
                <span class="font-semibold text-sm">{{ typeLabel(ev.type) }}</span>
                <span class="badge badge-pill badge-yellow ml-8" style="margin-left:8px;">tussentijds</span>
                <p class="text-secondary text-xs mt-4">{{ formatDatum(ev.ingevuld_op) }}</p>
              </div>
              <span v-if="ev.totaalscore !== null" class="font-semibold" style="font-size:20px;">
                {{ ev.totaalscore }}
                <span class="text-secondary text-xs">/{{ ev.totaal_criteria * 5 }}</span>
              </span>
              <span v-else class="text-secondary text-sm">Nog niet ingevuld</span>
            </div>
          </div>
        </div>

        <!-- Finale evaluaties -->
        <div class="card mt-16">
          <h2 class="form-section-title">Finale evaluaties</h2>
          <div v-if="finale.length === 0" class="mt-8">
            <p class="text-secondary text-sm">Nog geen finale evaluaties beschikbaar.</p>
          </div>
          <div v-for="ev in finale" :key="ev.evaluatie_id" class="mt-12"
            style="border-bottom:1px solid var(--border);padding-bottom:12px;">
            <div class="flex justify-between items-center">
              <div>
                <span class="font-semibold text-sm">{{ typeLabel(ev.type) }}</span>
                <span class="badge badge-pill badge-green ml-8" style="margin-left:8px;">finaal</span>
                <p class="text-secondary text-xs mt-4">{{ formatDatum(ev.ingevuld_op) }}</p>
              </div>
              <span v-if="ev.totaalscore !== null" class="font-semibold" style="font-size:20px;">
                {{ ev.totaalscore }}
                <span class="text-secondary text-xs">/{{ ev.totaal_criteria * 5 }}</span>
              </span>
              <span v-else class="text-secondary text-sm">Nog niet ingevuld</span>
            </div>
          </div>
        </div>

      </template>
    </main>
  </div>
</template>

<style scoped></style>
