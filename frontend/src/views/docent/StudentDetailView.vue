<script setup>
import { computed, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import TopBar from '../../components/TopBar.vue'

const route = useRoute()

const navLinks = [
  { label: 'Studenten', to: '/docent/studenten' },
  { label: 'Logboek', to: '/docent/logboek' },
  { label: 'Evaluatie', to: '/docent/evaluatie' },
]

const student = ref({
  id: 'EHB-2024-0842',
  naam: 'Emma De Smedt',
  opleiding: 'Toegepaste Informatica',
  bedrijf: 'Cronos Group NV',
  mentor: 'K. Peeters',
  begeleider: 'Jan Vermeersch (ik)',
  periode: '01/02 – 31/05/2025',
  resterend: '42 dagen',
  statusLabel: 'Stage actief',
  weekStatus: 'Week 5: in afwachting van mentor',
  weekCount: '8 weken ingediend',
  contact: 'k.peeters@cronos.be · Senior Developer',
  adres: 'Veldkant 33A, 2550 Kontich',
})

const milestoneItems = [
  { done: true, label: 'Stage aanvraag goedgekeurd' },
  { done: false, label: 'Tussentijdse evaluatie', deadline: 'Deadline: 15 mrt 2025' },
  { done: false, label: 'Eindevaluatie', deadline: 'Deadline: 15 mei 2025' },
]

const weekBadges = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8']

const studentId = computed(() => route.params.id || student.value.id)
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />

    <main class="content">
      <p class="breadcrumb">
        <RouterLink to="/docent/studenten">← Mijn studenten</RouterLink>
      </p>

      <section class="card">
        <div class="flex justify-between items-center" style="margin-bottom: 16px; gap: 16px; flex-wrap: wrap;">
          <div>
            <h1 style="font-size: 22px; font-weight: 700;">{{ student.naam }}</h1>
            <p class="text-secondary text-sm">{{ studentId }} · {{ student.opleiding }}</p>
          </div>
          <span class="badge badge-green" style="border-radius: 9999px; font-size: 12px; padding: 5px 14px;">{{ student.statusLabel }}</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px;">
          <article>
            <div class="text-xs text-secondary" style="text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Bedrijf</div>
            <div class="font-medium">{{ student.bedrijf }}</div>
          </article>
          <article>
            <div class="text-xs text-secondary" style="text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Mentor (bedrijf)</div>
            <div class="font-medium">{{ student.mentor }}</div>
          </article>
          <article>
            <div class="text-xs text-secondary" style="text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Begeleider</div>
            <div class="font-medium">{{ student.begeleider }}</div>
          </article>
          <article>
            <div class="text-xs text-secondary" style="text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Periode</div>
            <div class="font-medium">{{ student.periode }}</div>
          </article>
          <article>
            <div class="text-xs text-secondary" style="text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Resterend</div>
            <div class="font-medium">{{ student.resterend }}</div>
          </article>
        </div>

        <div style="margin-top: 20px;">
          <RouterLink to="/docent/documenten" class="btn btn-secondary btn-sm">📄 Documenten</RouterLink>
        </div>
      </section>

      <section class="card">
        <h2 class="card-title" style="margin-bottom: 20px;">Stage-voortgang &amp; mijlpalen</h2>
        <div class="milestone-list">
          <article v-for="item in milestoneItems" :key="item.label" class="milestone-item">
            <div class="milestone-dot" :class="{ done: item.done }">{{ item.done ? '✓' : '' }}</div>
            <span :class="item.done ? '' : 'text-secondary'">{{ item.label }}</span>
            <span v-if="item.deadline" class="milestone-date">{{ item.deadline }}</span>
          </article>
        </div>
      </section>

      <div class="card-grid-2">
        <section class="card">
          <h2 class="card-title">Logboek</h2>
          <hr class="card-divider" />
          <p class="font-semibold" style="font-size: 20px;">{{ student.weekCount }}</p>
          <p class="text-secondary text-sm" style="color: var(--orange); margin-top: 4px;">{{ student.weekStatus }}</p>
          <div class="flex gap-8" style="margin-top: 12px; flex-wrap: wrap;">
            <span
              v-for="week in weekBadges"
              :key="week"
              class="badge"
              :class="week === 'W5' ? 'badge-yellow' : week === 'W6' || week === 'W7' || week === 'W8' ? 'badge-gray' : 'badge-green'"
              style="border-radius: 4px;"
            >
              {{ week }}
            </span>
          </div>
          <RouterLink to="/docent/logboek" class="btn btn-primary" style="margin-top: 16px;">Logboek bekijken →</RouterLink>
        </section>

        <section class="card">
          <h2 class="card-title">Evaluaties</h2>
          <hr class="card-divider" />
          <div style="margin-bottom: 16px;">
            <p class="font-medium text-sm">Tussentijdse evaluatie</p>
            <RouterLink to="/docent/evaluatie" class="btn btn-primary btn-sm" style="margin-top: 8px;">Evaluatie bekijken →</RouterLink>
          </div>
          <div>
            <p class="font-medium text-sm">Eindevaluatie</p>
            <p class="text-secondary text-xs" style="margin-top: 4px; color: var(--text-secondary);">Nog niet beschikbaar 🔒</p>
          </div>
        </section>
      </div>

      <section class="card">
        <h2 class="card-title" style="margin-bottom: 16px;">Betrokken personen</h2>
        <div class="flex gap-24" style="flex-wrap: wrap;">
          <article>
            <div class="text-xs text-secondary" style="text-transform: uppercase; margin-bottom: 4px;">Mentor (bedrijf)</div>
            <div class="font-semibold">{{ student.mentor }}</div>
            <div class="text-sm text-secondary">{{ student.contact }}</div>
          </article>
          <article>
            <div class="text-xs text-secondary" style="text-transform: uppercase; margin-bottom: 4px;">Bedrijf</div>
            <div class="font-semibold">{{ student.bedrijf }}</div>
            <div class="text-sm text-secondary">{{ student.adres }}</div>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>
