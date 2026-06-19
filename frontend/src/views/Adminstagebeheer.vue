<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'

const API = 'http://localhost:3000/api'

const navLinks = ref([
  { label: 'Competenties', to: '/admin/competentiesets' },
  { label: 'Stages',       to: '/admin/stages' },
  { label: 'Accounts',     to: '/admin/accounts' },
  { label: 'Aanvragen',    to: '/admin/aanvragen' },
])

const router = useRouter()

const stages  = ref([])
const bezig   = ref(true)
const fout    = ref('')
const zoekterm = ref('')

function formatPeriode(start, eind) {
  if (!start || !eind) return '—'
  const fmt = (d) => {
    const dt = new Date(d)
    return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}`
  }
  return `${fmt(start)}–${fmt(eind)}`
}

const gefilterdeStages = computed(() => {
  const q = zoekterm.value.toLowerCase().trim()
  if (!q) return stages.value
  return stages.value.filter(s =>
    (s.student_naam || '').toLowerCase().includes(q) ||
    (s.bedrijf || '').toLowerCase().includes(q)
  )
})

async function laadStages() {
  bezig.value = true
  fout.value  = ''
  try {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API}/stages?status=goedgekeurd`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw new Error(data?.error || 'Stages konden niet geladen worden.')
    }
    const data = await res.json()
    // Enrich each stage with docent/mentor detail via separate call
    const detail = await Promise.all(
      data.map(s =>
        fetch(`${API}/stages/${s.stage_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.ok ? r.json() : null)
      )
    )
    stages.value = data.map((s, i) => {
      const d = detail[i] || {}
      return {
        stage_id:     s.stage_id,
        student_naam: `${s.voornaam || ''} ${s.student || ''}`.trim(),
        opleiding:    d.opleiding || '—',
        bedrijf:      s.bedrijf || '—',
        periode:      formatPeriode(s.startdatum, s.einddatum),
        docent:       d.docent_voornaam ? `${d.docent_voornaam} ${d.docent_naam}` : null,
        mentor:       d.mentor_voornaam ? `${d.mentor_voornaam} ${d.mentor_naam}` : null,
        mentor_naam_orig: d.mentor_voornaam ? `${d.mentor_voornaam[0]}. ${d.mentor_naam}` : null,
      }
    })
  } catch (e) {
    fout.value = 'Stages konden niet geladen worden.'
    console.error(e)
  } finally {
    bezig.value = false
  }
}

function volledig(stage) {
  return !!(stage.docent && stage.mentor)
}

function naarKoppelen(stage) {
  router.push({ name: 'admin-stage-koppelen', params: { id: stage.stage_id } })
}

onMounted(laadStages)
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />

    <main class="content">
      <!-- Header row -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="page-title">Stagebeheer</h1>
          <p class="page-subtitle">Koppel docenten en mentors aan goedgekeurde stages.</p>
        </div>
        <div class="zoek-wrapper">
          <span class="zoek-icon">🔍</span>
          <input
            v-model="zoekterm"
            type="text"
            placeholder="Zoek op student of bedrijf..."
            class="zoek-input"
          />
        </div>
      </div>

      <!-- Loading / error -->
      <div v-if="bezig" class="text-secondary">Laden…</div>
      <div v-else-if="fout" class="form-error">{{ fout }}</div>

      <!-- Table -->
      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Opleiding</th>
              <th>Bedrijf</th>
              <th>Periode</th>
              <th>Docent</th>
              <th>Mentor</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="gefilterdeStages.length === 0">
              <td colspan="8" style="text-align:center; color:var(--text-secondary);">
                Geen goedgekeurde stages gevonden.
              </td>
            </tr>
            <tr v-for="stage in gefilterdeStages" :key="stage.stage_id">
              <td class="td-name">{{ stage.student_naam }}</td>
              <td style="color:var(--text-secondary);">{{ stage.opleiding }}</td>
              <td>{{ stage.bedrijf }}</td>
              <td style="color:var(--text-secondary);">{{ stage.periode }}</td>
              <td>
                <span v-if="stage.docent">{{ stage.docent }}</span>
                <span v-else style="color:var(--text-secondary);">—</span>
              </td>
              <td>
                <span v-if="stage.mentor">{{ stage.mentor_naam_orig }}</span>
                <span v-else style="color:var(--text-secondary);">—</span>
              </td>
              <td>
                <span v-if="volledig(stage)" class="badge badge-pill badge-green">Volledig ✓</span>
                <span v-else class="badge badge-pill badge-orange">Incompleet</span>
              </td>
              <td>
                <button
                  v-if="!volledig(stage)"
                  class="btn btn-primary btn-sm"
                  @click="naarKoppelen(stage)"
                >
                  Koppel →
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>

<style scoped>
.zoek-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  min-width: 280px;
}
.zoek-icon { font-size: 13px; color: var(--text-secondary); }
.zoek-input {
  border: none;
  outline: none;
  font-size: 13px;
  color: var(--text-secondary);
  width: 100%;
  background: transparent;
}
.text-secondary { color: var(--text-secondary); }
</style>