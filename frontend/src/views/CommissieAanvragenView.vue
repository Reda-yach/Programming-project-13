<script setup>
import { ref, computed } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'


const aanvragen = ref([
  {
    id: 1,
    naam: 'Emma De Smedt',
    bedrijf: 'Cronos Group NV',
    datum: '14 jan 2025',
    status: 'In behandeling',
    studentnummer: 'EHB-2024-0842',
    opleiding: 'Toegepaste Informatica',
    sector: 'ICT & Consultancy',
    stageperiode: '01/02/2025 – 31/05/2025',
    ingediendOp: '14 januari 2025',
    stagementor: 'K. Peeters (Senior Dev.)',
    docentEhb: 'Jan Vermeersch',
  },
  {
    id: 2,
    naam: 'Thomas Maes',
    bedrijf: 'Proximus NV',
    datum: '13 jan 2025',
    status: 'In behandeling',
    studentnummer: '',
    opleiding: '',
    sector: '',
    stageperiode: '',
    ingediendOp: '13 januari 2025',
    stagementor: '',
    docentEhb: '',
  },
  {
    id: 3,
    naam: 'Lisa Van den Berg',
    bedrijf: 'Colruyt Group',
    datum: '12 jan 2025',
    status: 'In behandeling',
    studentnummer: '',
    opleiding: '',
    sector: '',
    stageperiode: '',
    ingediendOp: '12 januari 2025',
    stagementor: '',
    docentEhb: '',
  },
  {
    id: 4,
    naam: 'Remi Jacobs',
    bedrijf: 'Belfius Bank SA',
    datum: '10 jan 2025',
    status: 'In behandeling',
    studentnummer: '',
    opleiding: '',
    sector: '',
    stageperiode: '',
    ingediendOp: '10 januari 2025',
    stagementor: '',
    docentEhb: '',
  },
  {
    id: 5,
    naam: 'Sara Claes',
    bedrijf: 'ING België',
    datum: '9 jan 2025',
    status: 'In behandeling',
    studentnummer: '',
    opleiding: '',
    sector: '',
    stageperiode: '',
    ingediendOp: '9 januari 2025',
    stagementor: '',
    docentEhb: '',
  },
])

const geselecteerdeId = ref(1)
const feedback = ref('')

const geselecteerd = computed(() =>
  aanvragen.value.find(a => a.id === geselecteerdeId.value)
)

function selecteer(id) {
  geselecteerdeId.value = id
  feedback.value = ''
}

function handleDecision(type) {
  // type: 'goedkeuren' | 'aanpassing' | 'afkeuren'
  if ((type === 'aanpassing' || type === 'afkeuren') && !feedback.value.trim()) {
    alert('Feedback is verplicht bij aanpassingen vragen of afkeuren.')
    return
  }
  console.log('Beslissing:', type, 'voor aanvraag', geselecteerdeId.value, '| Feedback:', feedback.value)
  // TODO: API-call naar backend
}
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

        <div
          v-for="aanvraag in aanvragen"
          :key="aanvraag.id"
          class="sidebar-item"
          :class="{ active: aanvraag.id === geselecteerdeId }"
          @click="selecteer(aanvraag.id)"
        >
          <div class="sidebar-item-name">{{ aanvraag.naam }}</div>
          <div class="sidebar-item-sub">{{ aanvraag.bedrijf }}</div>
          <div class="sidebar-item-meta">
            <span class="sidebar-item-date">{{ aanvraag.datum }}</span>
            <StatusBadge :status="aanvraag.status" />
          </div>
        </div>
      </aside>

      <main class="split-main">
        <template v-if="geselecteerd">
          <h2 style="font-size:24px;font-weight:700;margin-bottom:8px;">
            {{ geselecteerd.naam }}
          </h2>
          <StatusBadge :status="geselecteerd.status" />

          <div class="card" style="margin-top:20px;margin-bottom:20px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px 32px;">
              <div>
                <div class="text-secondary text-xs">Studentnummer</div>
                <div class="font-medium">{{ geselecteerd.studentnummer }}</div>
              </div>
              <div>
                <div class="text-secondary text-xs">Opleiding</div>
                <div class="font-medium">{{ geselecteerd.opleiding }}</div>
              </div>
              <div>
                <div class="text-secondary text-xs">Bedrijf</div>
                <div class="font-medium">{{ geselecteerd.bedrijf }}</div>
              </div>
              <div>
                <div class="text-secondary text-xs">Sector</div>
                <div class="font-medium">{{ geselecteerd.sector }}</div>
              </div>
              <div>
                <div class="text-secondary text-xs">Stageperiode</div>
                <div class="font-medium">{{ geselecteerd.stageperiode }}</div>
              </div>
              <div>
                <div class="text-secondary text-xs">Ingediend op</div>
                <div class="font-medium">{{ geselecteerd.ingediendOp }}</div>
              </div>
              <div>
                <div class="text-secondary text-xs">Stagementor</div>
                <div class="font-medium">{{ geselecteerd.stagementor }}</div>
              </div>
              <div>
                <div class="text-secondary text-xs">Docent EhB</div>
                <div class="font-medium">{{ geselecteerd.docentEhb }}</div>
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
              <button class="btn btn-outline-green" @click="handleDecision('goedkeuren')">
                ✔ Goedkeuren
              </button>
              <button class="btn btn-outline-orange" @click="handleDecision('aanpassing')">
                ✎ Aanpassingen vragen
              </button>
              <button class="btn btn-outline-red" @click="handleDecision('afkeuren')">
                ✖ Afkeuren
              </button>
            </div>
          </div>
        </template>
      </main>
    </div>
  </div>
</template>
