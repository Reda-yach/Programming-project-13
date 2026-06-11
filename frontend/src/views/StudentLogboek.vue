<script setup>
import { ref, onMounted } from 'vue'
import TopBar from '../components/TopBar.vue'

const navLinks = ref([
  { label: 'Dashboard', to: '/student' },
  { label: 'Aanvraag', to: '/student/aanvraag' },
  { label: 'Logboek', to: '/student/logboek' },
  { label: 'Evaluatie', to: '/student/evaluatie' },
])

const weekNummer = ref(1)
const ingediend = ref(false)
const stageId = ref(null)

const dagen = ref([
  { dag: 'ma', label: 'Maandag', activiteiten: '', reflectie: '', leerpunten: '' },
  { dag: 'di', label: 'Dinsdag', activiteiten: '', reflectie: '', leerpunten: '' },
  { dag: 'wo', label: 'Woensdag', activiteiten: '', reflectie: '', leerpunten: '' },
  { dag: 'do', label: 'Donderdag', activiteiten: '', reflectie: '', leerpunten: '' },
  { dag: 'vr', label: 'Vrijdag', activiteiten: '', reflectie: '', leerpunten: '' },
])

onMounted(async () => {
  const token = localStorage.getItem('token')
  const res = await fetch('http://localhost:3000/api/stage', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const data = await res.json()
  if (data.stage) stageId.value = data.stage.stage_id
})

const alleIngevuld = () => dagen.value.every(d => d.activiteiten.trim() !== '')

async function indienen() {
  const token = localStorage.getItem('token')
  const gebruiker = JSON.parse(localStorage.getItem('gebruiker'))
  await fetch('http://localhost:3000/api/logboeken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      student_id: gebruiker.id,
      stage_id: stageId.value,
      week_nummer: weekNummer.value,
      activiteiten: dagen.value.map(d => `${d.label}: ${d.activiteiten}`).join('\n'),
      reflectie: dagen.value.map(d => `${d.label}: ${d.reflectie}`).join('\n'),
      leerpunten: dagen.value.map(d => `${d.label}: ${d.leerpunten}`).join('\n'),
      uren: 40
    })
  })
  ingediend.value = true
}
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />
    <main class="content">

      <div class="flex items-center gap-16">
        <h1 class="page-title">Logboek — Week {{ weekNummer }}</h1>
        <span v-if="ingediend" class="badge badge-green">Ingediend</span>
      </div>

      <div class="flex gap-8 mt-16">
        <button class="btn btn-secondary" @click="weekNummer--" :disabled="weekNummer <= 1">
          ← Week {{ weekNummer - 1 }}
        </button>
        <button class="btn btn-secondary" @click="weekNummer++">
          Week {{ weekNummer + 1 }} →
        </button>
      </div>

      <div v-for="dag in dagen" :key="dag.dag" class="card mt-24">
        <h2 class="form-section-title">{{ dag.label }}</h2>

        <div class="form-group mt-8">
          <label>Beschrijving van uitgevoerde taken</label>
          <textarea
            v-model="dag.activiteiten"
            :readonly="ingediend"
            rows="3"
            class="form-input"
            placeholder="Wat heb je vandaag gedaan?"
          ></textarea>
        </div>

        <div class="form-group mt-8">
          <label>Reflectie</label>
          <textarea
            v-model="dag.reflectie"
            :readonly="ingediend"
            rows="3"
            class="form-input"
            placeholder="Hoe verliep de dag?"
          ></textarea>
        </div>

        <div class="form-group mt-8">
          <label>Eventuele problemen of leerpunten</label>
          <textarea
            v-model="dag.leerpunten"
            :readonly="ingediend"
            rows="3"
            class="form-input"
            placeholder="Welke problemen of leerpunten had je?"
          ></textarea>
        </div>
      </div>

      <div class="mt-24 flex gap-8">
        <button
          class="btn btn-primary"
          @click="indienen"
          :disabled="!alleIngevuld() || ingediend"
        >
          Logboek indienen bij mentor
        </button>
      </div>

      <p v-if="!alleIngevuld() && !ingediend" class="text-secondary text-sm mt-8">
        ⚠ Vul eerst alle 5 dagen in voor je het logboek kan indienen.
      </p>

    </main>
  </div>
</template>

<style scoped></style>
