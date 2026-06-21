<script setup>
import { API_URL } from '@/api'
import { ref, onMounted } from 'vue'
import TopBarDocentStagecommissie from '@/components/TopBarDocentStagecommissie.vue'
import { docentNavLinks } from './docentNav'

const API = `${API_URL}/api`

// 'Aanvragen' enkel voor commissie-docenten (zie docentNav.js).
const navLinks = docentNavLinks()

const studenten = ref([])
const laden = ref(false)
const fout = ref(null)

async function laadStudenten() {
  laden.value = true
  fout.value = null
  const token = localStorage.getItem('token')
  try {
    const res = await fetch(`${API}/docent/logboeken`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Laden mislukt')
    studenten.value = data
  } catch (e) {
    fout.value = e.message
  } finally {
    laden.value = false
  }
}

// Status van de huidige (laatste) week leesbaar tonen.
function weekStatusLabel(status) {
  const labels = { ingediend: 'Wacht op bevestiging', goedgekeurd: 'Bevestigd', draft: 'Concept' }
  return labels[status] || status || '—'
}
function weekStatusKlasse(status) {
  if (status === 'ingediend') return 'badge-yellow'
  if (status === 'goedgekeurd') return 'badge-green'
  return 'badge-gray'
}

onMounted(() => {
  laadStudenten()
})
</script>

<template>
  <div class="page">
    <TopBarDocentStagecommissie :links="navLinks" />

    <main class="content">
      <h1 class="page-title">Logboeken</h1>

      <div v-if="laden" class="text-secondary text-sm">Laden…</div>
      <div v-else-if="fout" style="color:var(--red,#dc2626);font-size:14px;">{{ fout }}</div>

      <div v-else-if="!studenten.length" class="text-secondary text-sm" style="margin-top:8px;">
        Geen studenten gekoppeld aan jou.
      </div>

      <div v-else class="table-wrapper">
        <section
          v-for="s in studenten"
          :key="s.stage_id"
          class="card"
          style="border:none;border-bottom:1px solid var(--border);border-radius:0;"
        >
          <div class="flex justify-between items-center">
            <div>
              <div class="td-name">{{ s.student_voornaam }} {{ s.student_naam }}</div>
              <div class="td-sub">{{ s.opleiding }} · {{ s.bedrijf }}</div>

              <div class="flex items-center gap-8" style="margin-top:8px;flex-wrap:wrap;">
                <template v-if="s.totaal_weken > 0">
                  <span class="text-secondary text-xs">
                    Week {{ s.laatste_week }} ·
                  </span>
                  <span
                    class="badge badge-pill"
                    :class="weekStatusKlasse(s.huidige_week_status)"
                    style="font-size:11px;"
                  >{{ weekStatusLabel(s.huidige_week_status) }}</span>
                </template>
                <span v-else class="text-secondary text-xs">Nog geen logboekentries</span>
              </div>
            </div>

            <router-link
              :to="`/docent-logboek-detail/${s.stage_id}`"
              class="btn btn-primary btn-sm"
            >
              Logboeken inkijken →
            </router-link>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>
