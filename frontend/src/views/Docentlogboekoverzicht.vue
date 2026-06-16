<script setup>
import { ref } from 'vue'
import TopBarDocentStagecommissie from '@/components/TopBarDocentStagecommissie.vue'

const navLinks = ref([
  { label: 'Studenten', to: '/docent-studenten' },
  { label: 'Logboek', to: '/docent-logboek-overzicht' },
  { label: 'Evaluaties', to: '/docent-evaluaties' },
  { label: 'Aanvragen', to: '/docent-aanvragen' },
])

const logboeken = ref([
  {
    id: 1,
    naam: 'Emma De Smedt',
    opleiding: 'Toegepaste Informatica',
    bedrijf: 'Cronos Group NV',
    recenteWeek: 'Week 8',
    recenteDatum: '20–24 jan 2025',
    aantalEntries: 4,
  },
  {
    id: 2,
    naam: 'Thomas Maes',
    opleiding: 'Bedrijfsmanagement',
    bedrijf: 'Proximus NV',
    recenteWeek: 'Week 7',
    recenteDatum: '13–17 jan 2025',
    aantalEntries: 3,
  },
  {
    id: 3,
    naam: 'Lisa Van den Berg',
    opleiding: 'Communicatiemanagement',
    bedrijf: 'Colruyt Group',
    recenteWeek: '',
    recenteDatum: '',
    aantalEntries: 0,
  },
  {
    id: 4,
    naam: 'Remi Jacobs',
    opleiding: 'Toegepaste Informatica',
    bedrijf: 'Belfius Bank SA',
    recenteWeek: 'Week 8',
    recenteDatum: '20–24 jan 2025',
    aantalEntries: 4,
  },
])
</script>

<template>
  <div class="page">
    <TopBarDocentStagecommissie :links="navLinks" />

    <main class="content">
      <h1 class="page-title">Logboeken</h1>
      <div class="table-wrapper">
        <section
          v-for="log in logboeken"
          :key="log.id"
          class="card"
          style="border:none;border-bottom:1px solid var(--border);border-radius:0;"
        >
          <div class="flex justify-between items-center">
            <div>
              <div class="td-name">{{ log.naam }}</div>
              <div class="td-sub">{{ log.opleiding }} · {{ log.bedrijf }}</div>
              <div class="text-secondary text-xs mt-8">
                <template v-if="log.aantalEntries">
                  <span class="font-semibold">Meest recente entry:</span>
                  {{ log.recenteWeek }} · {{ log.recenteDatum }} · {{ log.aantalEntries }} entries
                </template>
                <template v-else>
                  <span class="font-semibold">Meest recente entry:</span> Nog geen entries
                </template>
              </div>
            </div>
            <router-link to="/docent-logboek-detail" class="btn btn-primary btn-sm">
              Logboeken inkijken →
            </router-link>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>