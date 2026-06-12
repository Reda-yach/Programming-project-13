<template>
  <div class="page">
    <AppTopbar active="studenten" />

    <main class="content">
      <h1 class="page-title">Mijn studenten</h1>

      <div v-if="laden" class="text-secondary">Laden...</div>
      <div v-else-if="fout" style="color:var(--red);">{{ fout }}</div>

      <div v-else-if="studenten.length === 0" class="card">
        <p class="text-secondary">Geen studenten gevonden.</p>
      </div>

      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style="width:175px;">Student</th>
              <th style="width:235px;">Bedrijf &amp; Mentor</th>
              <th style="width:175px;">Periode</th>
              <th style="width:190px;">Logboek</th>
              <th>Evaluaties</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="student in studenten" :key="student.stage_id">
              <td>
                <router-link :to="`/docent/studenten/${student.stage_id}`">
                  <div class="td-name">{{ student.voornaam }} {{ student.naam }}</div>
                  <div class="td-sub">{{ student.studentnummer }}</div>
                </router-link>
              </td>
              <td>
                <div class="font-medium" style="font-size:13px;">{{ student.bedrijf }}</div>
                <div class="td-sub">{{ student.bedrijf_adres }}</div>
                <hr style="border:none;border-top:1px solid var(--border);margin:4px 0;width:120px;">
                <div style="font-size:12px;">{{ student.mentor_naam }}</div>
                <div style="font-size:12px;color:var(--blue);">{{ student.mentor_email }}</div>
              </td>
              <td>
                <div style="font-size:12px;">
                  {{ formatDatum(student.startdatum) }} – {{ formatDatum(student.einddatum) }}
                </div>
              </td>
              <td>
                <span
                  class="badge"
                  :class="logboekBadge(student.logboek_status)"
                  style="border-radius:6px;font-size:11px;"
                >
                  {{ student.logboek_status || 'Geen logboek' }}
                </span>
              </td>
              <td>
                <div style="display:flex;flex-direction:column;gap:8px;">
                  <router-link
                    :to="`/docent/studenten/${student.stage_id}`"
                    class="btn btn-primary btn-sm"
                  >
                    Bekijken →
                  </router-link>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AppTopbar from '@/components/AppTopbar.vue'

const studenten = ref([])
const laden = ref(true)
const fout = ref(null)

const API = 'http://localhost:3000/api'

onMounted(async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API}/docent/studenten`, {
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
})

function formatDatum(datum) {
  if (!datum) return '—'
  return new Date(datum).toLocaleDateString('nl-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function logboekBadge(status) {
  if (!status) return 'badge-gray'
  if (status.toLowerCase().includes('goedgekeurd')) return 'badge-green'
  if (status.toLowerCase().includes('afwachting') || status.toLowerCase().includes('mentor')) return 'badge-orange'
  if (status.toLowerCase().includes('niet')) return 'badge-red'
  return 'badge-gray'
}
</script>