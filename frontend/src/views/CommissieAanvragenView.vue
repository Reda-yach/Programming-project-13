<script setup>
import { ref, computed, onMounted } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useAuthStore } from '@/stores/auth'
import { getStageStatusLabel } from '@/utils/stageStatus'

const auth = useAuthStore()
const API = 'http://localhost:3000/api'

// Sidebar: openstaande aanvragen. Detail: volledige gegevens van de selectie.
const aanvragen = ref([])
const geselecteerdeId = ref(null)
const detail = ref(null)
const feedback = ref('')

const laden = ref(true)
const fout = ref('')
const detailLaden = ref(false)
const verwerken = ref(false)
const melding = ref('')

function authHeaders() {
  return { Authorization: `Bearer ${auth.token}` }
}

function formatKort(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('nl-BE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function statusLabel(status) {
  return getStageStatusLabel(status)
}

// ---------------------------------------------------------------------------
// Data ophalen
// ---------------------------------------------------------------------------
async function laadAanvragen() {
  laden.value = true
  fout.value = ''
  try {
    const res = await fetch(`${API}/begeleider/openstaand`, { headers: authHeaders() })
    if (!res.ok) {
      fout.value = 'Kon de openstaande aanvragen niet laden.'
      return
    }
    aanvragen.value = await res.json()

    if (aanvragen.value.length) {
      // Houd indien mogelijk de huidige selectie aan, anders de eerste.
      const blijft = aanvragen.value.some((a) => a.stage_id === geselecteerdeId.value)
      await selecteer(blijft ? geselecteerdeId.value : aanvragen.value[0].stage_id)
    } else {
      geselecteerdeId.value = null
      detail.value = null
    }
  } catch {
    fout.value = 'Kan geen verbinding maken met de server.'
  } finally {
    laden.value = false
  }
}

async function selecteer(id) {
  geselecteerdeId.value = id
  feedback.value = ''
  melding.value = ''
  detail.value = null
  detailLaden.value = true
  try {
    const res = await fetch(`${API}/stages/${id}`, { headers: authHeaders() })
    if (res.ok) detail.value = await res.json()
  } catch {
    // detail blijft null; de selectie toont dan een lege staat
  } finally {
    detailLaden.value = false
  }
}

// ---------------------------------------------------------------------------
// Beslissing versturen
// ---------------------------------------------------------------------------
const BESLISSING_MAP = {
  goedkeuren: 'goedgekeurd',
  aanpassing: 'meer_info',
  afkeuren: 'afgewezen',
}

async function handleDecision(type) {
  const beslissing = BESLISSING_MAP[type]
  if ((beslissing === 'meer_info' || beslissing === 'afgewezen') && !feedback.value.trim()) {
    melding.value = 'Feedback is verplicht bij aanpassingen vragen of afkeuren.'
    return
  }

  verwerken.value = true
  melding.value = ''
  try {
    const res = await fetch(`${API}/begeleider/${geselecteerdeId.value}/beslissing`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ beslissing, motivatie: feedback.value }),
    })
    const data = await res.json()
    if (!res.ok) {
      melding.value = data.error || 'De beslissing kon niet worden verwerkt.'
      return
    }
    // De aanvraag is afgehandeld → verdwijnt uit de openstaande lijst.
    geselecteerdeId.value = null
    await laadAanvragen()
  } catch {
    melding.value = 'Kan geen verbinding maken met de server.'
  } finally {
    verwerken.value = false
  }
}

onMounted(laadAanvragen)
</script>

<template>
  <div class="page">
    <AppHeader />

    <div class="split-layout">
      <aside class="split-sidebar">
        <div class="sidebar-header">
          <span class="sidebar-title">Aanvragen in behandeling</span>
          <span class="badge" style="border-radius:9999px;background:#000;color:#fff;border:none;">
            {{ aanvragen.length }}
          </span>
        </div>

        <div v-if="laden" class="text-secondary text-sm" style="padding:12px;">
          Aanvragen laden…
        </div>

        <div v-else-if="fout" class="form-error" style="padding:12px;">
          {{ fout }}
        </div>

        <div v-else-if="!aanvragen.length" class="text-secondary text-sm" style="padding:12px;">
          Geen openstaande aanvragen.
        </div>

        <div
          v-for="aanvraag in aanvragen"
          :key="aanvraag.stage_id"
          class="sidebar-item"
          :class="{ active: aanvraag.stage_id === geselecteerdeId }"
          @click="selecteer(aanvraag.stage_id)"
        >
          <div class="sidebar-item-name">{{ aanvraag.voornaam }} {{ aanvraag.student_naam }}</div>
          <div class="sidebar-item-sub">{{ aanvraag.bedrijf }}</div>
          <div class="sidebar-item-meta">
            <span class="sidebar-item-date">{{ formatKort(aanvraag.ingediend_op) }}</span>
            <StatusBadge :status="statusLabel(aanvraag.status)" />
          </div>
        </div>
      </aside>

      <main class="split-main">
        <div v-if="detailLaden" class="text-secondary" style="padding:48px 0;text-align:center;">
          Gegevens laden…
        </div>

        <template v-else-if="detail">
          <h2 style="font-size:24px;font-weight:700;margin-bottom:8px;">
            {{ detail.student_voornaam }} {{ detail.student_naam }}
          </h2>
          <StatusBadge :status="statusLabel(detail.status)" />

          <div class="card" style="margin-top:20px;margin-bottom:20px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px 32px;">
              <div>
                <div class="text-secondary text-xs">Studentnummer</div>
                <div class="font-medium">{{ detail.studentnummer || '—' }}</div>
              </div>
              <div>
                <div class="text-secondary text-xs">Opleiding</div>
                <div class="font-medium">{{ detail.opleiding || '—' }}</div>
              </div>
              <div>
                <div class="text-secondary text-xs">Bedrijf</div>
                <div class="font-medium">{{ detail.bedrijf || '—' }}</div>
              </div>
              <div>
                <div class="text-secondary text-xs">Sector</div>
                <div class="font-medium">{{ detail.bedrijf_sector || '—' }}</div>
              </div>
              <div>
                <div class="text-secondary text-xs">Stageperiode</div>
                <div class="font-medium">
                  {{ formatKort(detail.startdatum) }} – {{ formatKort(detail.einddatum) }}
                </div>
              </div>
              <div>
                <div class="text-secondary text-xs">Ingediend op</div>
                <div class="font-medium">{{ formatKort(detail.ingediend_op) }}</div>
              </div>
              <div>
                <div class="text-secondary text-xs">Stagementor</div>
                <div class="font-medium">
                  {{ detail.mentor_voornaam }} {{ detail.mentor_naam }}
                  <span v-if="detail.mentor_functie" class="text-secondary">
                    ({{ detail.mentor_functie }})
                  </span>
                </div>
              </div>
              <div>
                <div class="text-secondary text-xs">Opdracht</div>
                <div class="font-medium">{{ detail.beschrijving || '—' }}</div>
              </div>
            </div>
          </div>

          <div class="card">
            <h3 class="card-title" style="margin-bottom:16px;">Beoordeling</h3>
            <hr class="card-divider">
            <div class="form-group" style="margin-bottom:20px;">
              <label for="feedback">
                Feedback of motivatie (verplicht bij afkeuren of aanpassing)
              </label>
              <textarea
                id="feedback"
                v-model="feedback"
                rows="4"
                placeholder="Schrijf hier je feedback of motivatie..."
              ></textarea>
            </div>
            <div class="flex gap-12">
              <button class="btn btn-outline-green" :disabled="verwerken" @click="handleDecision('goedkeuren')">
                ✔ Goedkeuren
              </button>
              <button class="btn btn-outline-orange" :disabled="verwerken" @click="handleDecision('aanpassing')">
                ✎ Aanpassingen vragen
              </button>
              <button class="btn btn-outline-red" :disabled="verwerken" @click="handleDecision('afkeuren')">
                ✖ Afkeuren
              </button>
            </div>
            <p v-if="melding" class="form-error" style="margin-top:12px;">{{ melding }}</p>
          </div>
        </template>

        <div v-else-if="!laden" class="text-secondary" style="padding:48px 0;text-align:center;">
          Selecteer een aanvraag om te beoordelen.
        </div>
      </main>
    </div>
  </div>
</template>
