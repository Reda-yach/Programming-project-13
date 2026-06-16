<script setup>
import { ref } from 'vue'
import TopBarDocentStagecommissie from '@/components/TopBarDocentStagecommissie.vue'

const navLinks = ref([
  { label: 'Studenten', to: '/docent-studenten' },
  { label: 'Logboek', to: '/docent-logboek-overzicht' },
  { label: 'Evaluaties', to: '/docent-evaluaties' },
  { label: 'Aanvragen', to: '/docent-aanvragen' },
])

const student = ref({
  naam: 'Emma De Smedt',
  bedrijf: 'Cronos Group NV',
  periode: '01/02/2025 – 31/05/2025',
  status: 'In afwachting van mentor',
})

const week = ref({
  nummer: 8,
  periode: '20/01/2025 – 24/01/2025',
})

const dagen = ref([
  {
    id: 1,
    dag: 'Maandag',
    datum: '20/01/2025',
    status: 'Ingediend',
    taken: 'Implementatie van REST API endpoints voor gebruikersbeheer. Unit tests geschreven.',
    reflectie: 'Goed begrip van de architectuur. API structuur volgt de bestaande patronen.',
    problemen: 'Kleine configuratieproblemen met testomgeving. Opgelost na overleg met senior dev.',
  },
  {
    id: 2,
    dag: 'Dinsdag',
    datum: '21/01/2025',
    status: 'Ingediend',
    taken: "Code review gedaan voor collega's PR. Pair programming sessie voor front-end component.",
    reflectie: 'Samenwerking verliep vlot. Nieuwe inzichten over componentarchitectuur.',
    problemen: 'Geen problemen vandaag.',
  },
  {
    id: 3,
    dag: 'Woensdag',
    datum: '22/01/2025',
    status: 'Ingediend',
    taken: 'Sprint retrospective bijgewoond. Documentatie bijgewerkt in Confluence.',
    reflectie: 'Retrospective gaf goed inzicht in teamprocessen en communicatiepatronen.',
    problemen: 'Geen problemen.',
  },
  {
    id: 4,
    dag: 'Donderdag',
    datum: '23/01/2025',
    status: 'Ingediend',
    taken: 'Debugging van performance issue in database queries. Index toegevoegd.',
    reflectie: 'Query optimalisatie met index heeft grote verbetering in responstijd gegeven.',
    problemen: 'Geen problemen.',
  },
  {
    id: 5,
    dag: 'Vrijdag',
    datum: '24/01/2025',
    status: 'Ingediend',
    taken: 'Demo voorbereid en gepresenteerd aan product owner. Sprint planning bijgewoond.',
    reflectie: 'Presentatie goed ontvangen. Feedback verwerkt in backlog voor volgende sprint.',
    problemen: 'Geen.',
  },
])

const mentorfeedback = ref({
  gegeven: false,
  tekst: 'De mentor heeft deze week nog geen feedback gegeven. Zodra de mentor de week bevestigt en feedback achterlaat, verschijnt dit hier.',
})
</script>

<template>
  <div class="page">
    <TopBarDocentStagecommissie :links="navLinks" />

    <main class="content">
      <router-link to="/docent-logboek-overzicht" class="text-secondary text-sm">
        ← {{ student.naam }}
      </router-link>

      <section class="card" style="margin-top:16px;">
        <div class="flex justify-between items-center">
          <div>
            <div class="td-name">Logboek — {{ student.naam }}</div>
            <div class="td-sub">{{ student.bedrijf }} · {{ student.periode }}</div>
          </div>
          <span class="badge badge-pill badge-yellow">{{ student.status }}</span>
        </div>
      </section>

      <div class="flex justify-between items-center" style="margin:16px 0;">
        <button class="btn btn-sm">← Week {{ week.nummer - 1 }}</button>
        <div style="text-align:center;">
          <div class="font-semibold">Week {{ week.nummer }}</div>
          <div class="text-secondary text-sm">{{ week.periode }}</div>
        </div>
        <button class="btn btn-sm">Week {{ week.nummer + 1 }} →</button>
      </div>

      <section
        v-for="dag in dagen"
        :key="dag.id"
        class="card"
        style="margin-bottom:12px;"
      >
        <div class="flex justify-between items-center" style="margin-bottom:12px;">
          <div>
            <span class="font-semibold">{{ dag.dag }}</span>
            <span class="text-secondary text-sm"> {{ dag.datum }}</span>
          </div>
          <span class="badge badge-pill badge-green">{{ dag.status }}</span>
        </div>

        <div class="text-sm" style="margin-bottom:8px;">
          <span class="text-secondary">Uitgevoerde taken</span>
          <div>{{ dag.taken }}</div>
        </div>
        <div class="text-sm" style="margin-bottom:8px;">
          <span class="text-secondary">Reflectie</span>
          <div>{{ dag.reflectie }}</div>
        </div>
        <div class="text-sm">
          <span class="text-secondary">Problemen / leerpunten</span>
          <div>{{ dag.problemen }}</div>
        </div>
      </section>

      <section class="card">
        <div class="flex justify-between items-center" style="margin-bottom:12px;">
          <span class="font-semibold">Mentorfeedback</span>
          <span class="badge badge-pill badge-yellow" v-if="!mentorfeedback.gegeven">
            Nog niet gegeven
          </span>
        </div>
        <div class="text-secondary text-sm">{{ mentorfeedback.tekst }}</div>
      </section>
    </main>
  </div>
</template>