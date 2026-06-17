<script setup>
import { ref, computed, onMounted } from 'vue'
import TopBarDocentStagecommissie from '@/components/TopBarDocentStagecommissie.vue'

const navLinks = ref([
  { label: 'Studenten', to: '/docent-studenten' },
  { label: 'Logboek', to: '/docent-logboek-overzicht' },
  { label: 'Evaluaties', to: '/docent-evaluaties' },
  { label: 'Aanvragen', to: '/docent-aanvragen' },
])

const token = localStorage.getItem('token')

const aanvragen = ref([])
const geselecteerdId = ref(null)
const detail = ref(null)
const feedback = ref('')

const ladenLijst = ref(false)
const ladenDetail = ref(false)
const bezig = ref(false)
const foutLijst = ref(null)
const foutDetail = ref(null)
const foutBeslissing = ref(null)
const feedbackFout = ref(null)

function formatDatum(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDatumKort(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

async function laadAanvragen() {
  ladenLijst.value = true
  foutLijst.value = null
  try {
    const res = await fetch('http://localhost:3000/api/stages', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error((await res.json()).error ?? 'Fout bij ophalen')
    aanvragen.value = await res.json()
    if (aanvragen.value.length > 0) selecteer(aanvragen.value[0].stage_id)
  } catch (e) {
    foutLijst.value = e.message
  } finally {
    ladenLijst.value = false
  }
}

async function selecteer(id) {
  geselecteerdId.value = id
  detail.value = null
  feedback.value = ''
  foutDetail.value = null
  foutBeslissing.value = null
  feedbackFout.value = null

  ladenDetail.value = true
  try {
    const res = await fetch(`http://localhost:3000/api/stages/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error((await res.json()).error ?? 'Fout bij ophalen detail')
    detail.value = await res.json()
  } catch (e) {
    foutDetail.value = e.message
  } finally {
    ladenDetail.value = false
  }
}

async function besliss(actie) {
  feedbackFout.value = null
  foutBeslissing.value = null

  if ((actie === 'afkeuren' || actie === 'aanpassing') && !feedback.value.trim()) {
    feedbackFout.value = 'Feedback is verplicht bij afkeuren of aanpassing vragen.'
    return
  }

  bezig.value = true
  try {
    const res = await fetch(`http://localhost:3000/api/stages/${geselecteerdId.value}/beslissing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ beslissing: actie, motivatie: feedback.value.trim() }),
    })

    if (!res.ok) {
      foutBeslissing.value = (await res.json()).error ?? 'Beslissing kon niet worden opgeslagen.'
      return
    }

    const index = aanvragen.value.findIndex(a => a.stage_id === geselecteerdId.value)
    aanvragen.value.splice(index, 1)
    detail.value = null
    feedback.value = ''

    if (aanvragen.value.length > 0) {
      selecteer(aanvragen.value[Math.min(index, aanvragen.value.length - 1)].stage_id)
    } else {
      geselecteerdId.value = null
    }
  } catch {
    foutBeslissing.value = 'Kan geen verbinding maken met de server.'
  } finally {
    bezig.value = false
  }
}

onMounted(laadAanvragen)
</script>

<template>
  <div class="page">
    <TopBarDocentStagecommissie :links="navLinks" />

    <div class="split-layout">

      <!-- Sidebar -->
      <aside class="split-sidebar">
        <div class="sidebar-header">
          <span class="sidebar-title">Aanvragen in behandeling</span>
          <span class="badge badge-pill" style="background:#000;color:#fff;border:none;">
            {{ aanvragen.length }}
          </span>
        </div>

        <div v-if="ladenLijst" class="text-secondary text-sm" style="padding:16px;">Laden…</div>
        <div v-else-if="foutLijst" class="text-sm" style="padding:16px;color:var(--red);">{{ foutLijst }}</div>
        <div v-else-if="aanvragen.length === 0" class="text-secondary text-sm" style="padding:16px;">
          Geen openstaande aanvragen.
        </div>

        <div
          v-for="aanvraag in aanvragen"
          :key="aanvraag.stage_id"
          class="sidebar-item"
          :class="{ active: aanvraag.stage_id === geselecteerdId }"
          @click="selecteer(aanvraag.stage_id)"
        >
          <div class="sidebar-item-name">{{ aanvraag.voornaam }} {{ aanvraag.student }}</div>
          <div class="sidebar-item-sub">{{ aanvraag.bedrijf }}</div>
          <div class="sidebar-item-meta">
            <span class="sidebar-item-date">{{ formatDatumKort(aanvraag.ingediend_op) }}</span>
            <span class="badge badge-yellow" style="border-radius:4px;font-size:11px;">In behandeling</span>
          </div>
        </div>
      </aside>

      <!-- Hoofdpaneel -->
      <main class="split-main">

        <div v-if="!geselecteerdId && !ladenLijst" class="text-secondary" style="padding-top:48px;text-align:center;">
          Selecteer een aanvraag uit de lijst.
        </div>

        <div v-else-if="ladenDetail" class="text-secondary" style="padding-top:48px;text-align:center;">Laden…</div>

        <div v-else-if="foutDetail" style="color:var(--red);">{{ foutDetail }}</div>

        <template v-else-if="detail">
          <h2 style="font-size:24px;font-weight:700;margin-bottom:8px;">
            {{ detail.student_voornaam }} {{ detail.student_naam }}
          </h2>
          <span class="badge badge-yellow" style="border-radius:4px;margin-bottom:20px;display:inline-block;">
            In behandeling
          </span>

          <div class="card" style="margin-bottom:20px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px 32px;">
              <div>
                <div class="text-secondary text-xs">Studentnummer</div>
                <div class="font-medium">{{ detail.studentnummer }}</div>
              </div>
              <div>
                <div class="text-secondary text-xs">Opleiding</div>
                <div class="font-medium">{{ detail.opleiding }}</div>
              </div>
              <div>
                <div class="text-secondary text-xs">Bedrijf</div>
                <div class="font-medium">{{ detail.bedrijf }}</div>
              </div>
              <div>
                <div class="text-secondary text-xs">Sector</div>
                <div class="font-medium">{{ detail.bedrijf_sector }}</div>
              </div>
              <div>
                <div class="text-secondary text-xs">Stageperiode</div>
                <div class="font-medium">
                  {{ formatDatumKort(detail.startdatum) }} – {{ formatDatumKort(detail.einddatum) }}
                </div>
              </div>
              <div>
                <div class="text-secondary text-xs">Ingediend op</div>
                <div class="font-medium">{{ formatDatum(detail.ingediend_op) }}</div>
              </div>
              <div>
                <div class="text-secondary text-xs">Stagementor</div>
                <div class="font-medium">
                  {{ detail.mentor_voornaam }} {{ detail.mentor_naam }}
                  <span v-if="detail.mentor_functie" class="text-secondary"> ({{ detail.mentor_functie }})</span>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <h3 class="card-title" style="margin-bottom:16px;">Beoordeling</h3>
            <hr class="card-divider" />

            <div class="form-group" style="margin-bottom:20px;">
              <label for="feedback">
                Feedback of motivatie
                <span class="text-secondary text-xs">(verplicht bij afkeuren of aanpassing)</span>
              </label>
              <textarea
                id="feedback"
                v-model="feedback"
                rows="4"
                placeholder="Schrijf hier je feedback of motivatie..."
                :disabled="bezig"
              ></textarea>
              <span v-if="feedbackFout" class="form-error">{{ feedbackFout }}</span>
            </div>

            <p v-if="foutBeslissing" class="form-error" style="margin-bottom:12px;">{{ foutBeslissing }}</p>

            <div class="flex gap-12">
              <button class="btn btn-outline-green" :disabled="bezig" @click="besliss('goedkeuren')">
                ✔ Goedkeuren
              </button>
              <button class="btn btn-outline-orange" :disabled="bezig" @click="besliss('aanpassing')">
                ✎ Aanpassingen vragen
              </button>
              <button class="btn btn-outline-red" :disabled="bezig" @click="besliss('afkeuren')">
                ✖ Afkeuren
              </button>
            </div>
          </div>
        </template>

      </main>
    </div>
  </div>
</template>

<style scoped></style>
