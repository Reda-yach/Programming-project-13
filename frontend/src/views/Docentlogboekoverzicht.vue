<script setup>
import { ref, onMounted } from 'vue'
import TopBarDocentStagecommissie from '@/components/TopBarDocentStagecommissie.vue'

const API = 'http://localhost:3000/api'

const navLinks = ref([
  { label: 'Studenten', to: '/docent-studenten' },
  { label: 'Logboek', to: '/docent-logboek-overzicht' },
  { label: 'Evaluaties', to: '/docent-evaluaties' },
  { label: 'Aanvragen', to: '/docent-aanvragen' },
])

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
                    Week {{ s.laatste_week }} bereikt ·
                  </span>
                  <span
                    v-if="s.weken_ingediend > 0"
                    class="badge badge-yellow badge-pill"
                    style="font-size:11px;"
                  >{{ s.weken_ingediend }} wacht op bevestiging</span>
                  <span
                    v-if="s.weken_bevestigd > 0"
                    class="badge badge-green badge-pill"
                    style="font-size:11px;"
                  >{{ s.weken_bevestigd }} bevestigd</span>
                  <span
                    v-if="Number(s.totaal_weken) - Number(s.weken_ingediend) - Number(s.weken_bevestigd) > 0"
                    class="badge badge-pill"
                    style="font-size:11px;background:var(--gray100,#f3f4f6);color:var(--text-secondary);"
                  >
                    {{ Number(s.totaal_weken) - Number(s.weken_ingediend) - Number(s.weken_bevestigd) }} concept
                  </span>
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
