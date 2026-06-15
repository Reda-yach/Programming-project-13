<template>
  <div class="page">
    <AppTopbar active="studenten" />
    <main class="content">

      <p class="breadcrumb">
        <router-link to="/docent/studenten">← Mijn studenten</router-link>
      </p>

      <div v-if="laden" class="text-secondary">Laden...</div>
      <div v-else-if="fout" style="color:var(--red);">{{ fout }}</div>

      <div v-else-if="student">
        <div class="card">
          <div class="flex justify-between items-center" style="margin-bottom:16px;">
            <div>
              <h1 style="font-size:22px;font-weight:700;">
                {{ student.student_voornaam }} {{ student.student_naam }}
              </h1>
              <p class="text-secondary text-sm">
                {{ student.studentnummer }} · {{ student.opleiding }}
              </p>
            </div>
            <span class="badge badge-green" style="border-radius:9999px;font-size:12px;padding:5px 14px;">
              {{ student.status }}
            </span>
          </div>

          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
            <div>
              <div class="text-xs text-secondary" style="text-transform:uppercase;margin-bottom:4px;">Bedrijf</div>
              <div class="font-medium">{{ student.bedrijf }}</div>
              <div class="text-secondary text-sm">{{ student.bedrijf_adres }}</div>
            </div>
            <div>
              <div class="text-xs text-secondary" style="text-transform:uppercase;margin-bottom:4px;">Mentor (bedrijf)</div>
              <div class="font-medium">{{ student.mentor_voornaam }} {{ student.mentor_naam }}</div>
              <div class="text-secondary text-sm">{{ student.mentor_email }}</div>
              <div class="text-secondary text-sm">{{ student.mentor_functie }}</div>
            </div>
            <div>
              <div class="text-xs text-secondary" style="text-transform:uppercase;margin-bottom:4px;">Periode</div>
              <div class="font-medium">
                {{ formatDatum(student.startdatum) }} – {{ formatDatum(student.einddatum) }}
              </div>
            </div>
          </div>
        </div>

        <div class="card-grid-2 mt-24">
          <div class="card">
            <h2 class="card-title">Logboek</h2>
            <router-link
              :to="`/docent/logboek/${route.params.id}`"
              class="btn btn-primary"
              style="margin-top:16px;"
            >
              Logboek bekijken →
            </router-link>
          </div>

          <div class="card">
            <h2 class="card-title">Evaluaties</h2>
            <router-link
              :to="`/docent/studenten/${route.params.id}`"
              class="btn btn-primary"
              style="margin-top:16px;"
            >
              Evaluaties bekijken →
            </router-link>
          </div>
        </div>
      </div>

    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppTopbar from '@/components/AppTopbar.vue'

const route = useRoute()
const student = ref(null)
const laden = ref(true)
const fout = ref(null)
const API = 'http://localhost:3000/api'

onMounted(async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API}/stages/${route.params.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Laden mislukt')
    student.value = data
  } catch (e) {
    fout.value = e.message
  } finally {
    laden.value = false
  }
})

function formatDatum(datum) {
  if (!datum) return '—'
  return new Date(datum).toLocaleDateString('nl-BE', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}
</script>
