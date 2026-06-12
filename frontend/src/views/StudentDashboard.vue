<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import { useStageStore } from '../stores/stage'

const stageStore = useStageStore()

// Ingelogde gebruiker
const student = ref({
  voornaam: 'Emma',
})

// Stage-status komt nu uit de store: 'geen' | 'in_behandeling' | 'actief'
const stageStatus = computed(() => stageStore.status)

// Stage-gegevens (alleen gevuld zodra de stage actief is)
const stage = computed(() => stageStore.aanvraag)

// Navbar-items hangen af van de stage-status.
// Zonder actieve stage: alleen Dashboard + Aanvraag.
const navLinks = computed(() =>
  stageStatus.value === 'actief'
    ? [
        { label: 'Dashboard', to: '/student' },
        { label: 'Aanvraag', to: '/student/aanvraag' },
        { label: 'Logboek', to: '/student/logboek' },
        { label: 'Evaluatie', to: '/student/evaluatie' },
      ]
    : [
        { label: 'Dashboard', to: '/student' },
        { label: 'Aanvraag', to: '/student/aanvraag' },
      ],
)

// Logboek deze week (leeg in deze toestand)
const logboekDagen = ref([])

// Meldingen (leeg in deze toestand)
const meldingen = ref([])

// Evaluaties — reageren op de stage-status.
const evaluaties = computed(() => ({
  tussentijds: {
    beschikbaar: stageStatus.value === 'actief',
    vanaf: null,
  },
  eind: {
    beschikbaar: stageStatus.value === 'actief' || stageStatus.value === 'afgerond',
    vanaf: null,
  },
}))
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />

    <main class="content">
      <!-- Welkomtekst -->
      <section>
        <h1 class="page-title">Welkom terug, {{ student.voornaam }}</h1>
      </section>

      <!-- Rij 1: Stage Status + Logboek deze week -->
      <section class="card-grid-2">
        <!-- Stage Status -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Stage Status</span>
            <span
              class="badge badge-pill"
              :class="{
                'badge-green': stageStatus === 'actief',
                'badge-yellow': stageStatus === 'in_behandeling',
                'badge-gray': stageStatus === 'geen',
              }"
            >
              {{
                stageStatus === 'actief'
                  ? 'Actief'
                  : stageStatus === 'in_behandeling'
                    ? 'In behandeling'
                    : 'Inactief'
              }}
            </span>
          </div>
          <hr class="card-divider" />

          <!-- Met actieve stage -->
          <template v-if="stageStatus === 'actief'">
            <div class="flex items-center gap-12" style="margin-bottom: 16px;">
              <div style="width:48px;height:48px;background:var(--gray50);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;flex-shrink:0;">Bedrijf</div>
              <div>
                <div class="font-semibold" style="font-size:16px;">{{ stage?.bedrijf?.bedrijf }}</div>
                <div class="text-secondary text-xs">
                  Stageperiode: {{ stage?.bedrijf?.datumVan }} - {{ stage?.bedrijf?.datumTot }}
                </div>
              </div>
            </div>
          </template>

          <!-- In behandeling -->
          <template v-else-if="stageStatus === 'in_behandeling'">
            <div class="font-semibold" style="font-size:16px;margin-bottom:8px;">
              Aanvraag in behandeling
            </div>
            <p class="text-secondary text-sm" style="line-height:1.6;">
              Je stage-aanvraag is ingediend en wordt nu beoordeeld door de stagecommissie.
            </p>
          </template>

          <!-- Zonder aanvraag (lege toestand) -->
          <template v-else>
            <div class="font-semibold" style="font-size:16px;margin-bottom:16px;">
              Geen actieve stage
            </div>
            <RouterLink to="/student/aanvraag" class="btn btn-primary">
              Stage aanvragen
            </RouterLink>
          </template>
        </div>

        <!-- Logboek deze week -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Logboek deze week</span>
          </div>
          <hr class="card-divider" />

          <template v-if="logboekDagen.length">
            <div class="flex justify-between" style="margin-bottom:16px;">
              <div v-for="dag in logboekDagen" :key="dag.dag" style="text-align:center;">
                <div class="text-xs text-secondary" style="margin-bottom:6px;">{{ dag.dag }}</div>
                <div style="width:36px;height:36px;border-radius:9999px;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--text-secondary);font-size:16px;">–</div>
              </div>
            </div>
            <RouterLink to="/student/logboek" class="btn btn-primary w-full" style="margin-top:8px;">
              Logboek invullen
            </RouterLink>
          </template>

          <template v-else>
            <div class="font-semibold" style="font-size:16px;">Geen logboek beschikbaar</div>
          </template>
        </div>
      </section>

      <!-- Rij 2: Evaluaties -->
      <section class="card-grid-2">
        <!-- Tussentijdse Evaluatie -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Tussentijdse Evaluatie</span>
          </div>
          <hr class="card-divider" />
          <p class="text-secondary text-sm" style="line-height:1.6;margin-bottom:16px;">
            <template v-if="evaluaties.tussentijds.beschikbaar">
              Je kunt nu de tussentijdse evaluatie invullen om je voortgang tot nu toe te
              bespreken met je mentor en docent.
            </template>
            <template v-else-if="evaluaties.tussentijds.vanaf">
              Deze evaluatie wordt beschikbaar rond het midden van je stageperiode
              (vanaf {{ evaluaties.tussentijds.vanaf }}).
            </template>
            <template v-else>
              Deze evaluatie wordt beschikbaar rond het midden van je stageperiode.
            </template>
          </p>
          <RouterLink
            v-if="evaluaties.tussentijds.beschikbaar"
            to="/student/evaluatie"
            class="flex items-center gap-8 font-semibold text-sm"
            style="padding-top:8px;"
          >
            Nu invullen
          </RouterLink>
          <span
            v-else
            class="flex items-center gap-8 text-sm text-secondary"
            style="padding-top:8px;"
          >
            Nog niet beschikbaar
          </span>
        </div>

        <!-- Eindevaluatie -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Eindevaluatie</span>
          </div>
          <hr class="card-divider" />
          <p class="text-secondary text-sm" style="line-height:1.6;margin-bottom:16px;">
            <template v-if="evaluaties.eind.beschikbaar">
              Je kunt nu de eindevaluatie bekijken zodra je stage is afgerond.
            </template>
            <template v-else-if="evaluaties.eind.vanaf">
              Deze evaluatie wordt beschikbaar in de laatste twee weken van je stageperiode
              (vanaf {{ evaluaties.eind.vanaf }}).
            </template>
            <template v-else>
              Deze evaluatie wordt beschikbaar in de laatste twee weken van je stageperiode.
            </template>
          </p>
          <RouterLink
            v-if="evaluaties.eind.beschikbaar"
            to="/student/evaluatie-eind"
            class="flex items-center gap-8 font-semibold text-sm"
            style="padding-top:8px;"
          >
            Nu bekijken
          </RouterLink>
          <span
            v-else
            class="flex items-center gap-8 text-sm text-secondary"
            style="padding-top:8px;"
          >
            Nog niet beschikbaar
          </span>
        </div>
      </section>

      <!-- Meldingen & Feedback -->
      <section class="card">
        <div class="card-header">
          <span class="card-title">Meldingen &amp; Feedback</span>
        </div>
        <hr class="card-divider" />

        <template v-if="meldingen.length">
          <div
            v-for="(melding, i) in meldingen"
            :key="i"
            class="notification-item"
            :style="i === meldingen.length - 1 ? 'border-bottom:none;' : ''"
          >
            <div class="notification-icon">{{ melding.icon }}</div>
            <div class="notification-body">
              <div class="flex justify-between">
                <span class="notification-title">{{ melding.titel }}</span>
                <span class="notification-time">{{ melding.tijd }}</span>
              </div>
              <p class="notification-sub">{{ melding.sub }}</p>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="font-semibold" style="font-size:16px;">Geen meldingen</div>
        </template>
      </section>
    </main>
  </div>
</template>

<style scoped></style>
