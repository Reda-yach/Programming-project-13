<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'

const router = useRouter()

const navLinks = ref([
  { label: 'Studenten', to: '/mentor' },
  { label: 'Logboeken', to: '/mentor/logboeken' },
  { label: 'Evaluatie', to: '/mentor/evaluatie' },
])

const stagiairs = ref([])
const gebruiker = JSON.parse(localStorage.getItem('gebruiker'))

onMounted(async () => {
  const token = localStorage.getItem('token')
  const res = await fetch(`http://localhost:3000/api/mentors/${gebruiker.id}/stagiairs`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  stagiairs.value = await res.json()
})
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />
    <main class="content">
      <h1 class="page-title">Mijn stagiairs</h1>
      <p class="text-secondary text-sm mt-8">
        Welkom terug, {{ gebruiker?.voornaam }}. Bekijk hier een overzicht van alle stagiairs die je begeleidt.
      </p>

      <div v-if="stagiairs.length === 0" class="card mt-24">
        <p class="text-secondary">Geen stagiairs gevonden.</p>
      </div>

      <table v-else class="mt-24" style="width:100%; border-collapse:collapse;">
        <thead>
          <tr style="border-bottom: 2px solid #e5e7eb; text-align:left;">
            <th style="padding: 12px 16px;">Student</th>
            <th style="padding: 12px 16px;">Bedrijf & Mentor</th>
            <th style="padding: 12px 16px;">Periode & Voortgang</th>
            <th style="padding: 12px 16px;">Logboek</th>
            <th style="padding: 12px 16px;">Evaluaties</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="stagiair in stagiairs"
            :key="stagiair.stage_id"
            style="border-bottom: 1px solid #e5e7eb; cursor:pointer;"
            @click="router.push(`/mentor/student/${stagiair.stage_id}`)"
          >
            <td style="padding: 12px 16px;">
              <strong>{{ stagiair.voornaam }} {{ stagiair.student_naam }}</strong>
              <br>
              <span class="text-secondary text-sm">{{ stagiair.studentnummer }}</span>
            </td>
            <td style="padding: 12px 16px;">
              {{ stagiair.bedrijf }}
            </td>
            <td style="padding: 12px 16px;">
              <span class="text-secondary text-sm">
                {{ stagiair.startdatum }} — {{ stagiair.einddatum }}
              </span>
            </td>
            <td style="padding: 12px 16px;">
              <span
                class="badge"
                :class="{
                  'badge-green': stagiair.logboek_status === 'goedgekeurd',
                  'badge-yellow': stagiair.logboek_status === 'ingediend',
                  'badge-red': !stagiair.logboek_status || stagiair.logboek_status === 'draft'
                }"
              >
                Week {{ stagiair.laatste_week || '—' }} —
                {{ stagiair.logboek_status || 'Niet ingediend' }}
              </span>
            </td>
            <td style="padding: 12px 16px;">
              <span
                class="badge"
                :class="stagiair.status === 'actief' ? 'badge-green' : 'badge-yellow'"
              >
                {{ stagiair.status }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

    </main>
  </div>
</template>

<style scoped></style>
