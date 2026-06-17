<script setup>
import { RouterLink } from 'vue-router'
import TopBar from '../../components/TopBar.vue'

const navLinks = [
  { label: 'Studenten', to: '/docent/studenten' },
  { label: 'Logboek', to: '/docent/logboek' },
  { label: 'Evaluatie', to: '/docent/evaluatie' },
]

const studenten = [
  {
    id: 'emma-de-smedt',
    naam: 'Emma De Smedt',
    opleiding: 'Toegepaste Informatica',
    bedrijf: 'Cronos Group NV',
    status: 'Stage actief',
    periode: '01/02/2025 – 31/05/2025',
  },
  {
    id: 'noah-van-damme',
    naam: 'Noah Van Damme',
    opleiding: 'Toegepaste Informatica',
    bedrijf: 'Axxes',
    status: 'Tussentijdse evaluatie',
    periode: '15/01/2025 – 15/04/2025',
  },
]
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />

    <main class="content">
      <section>
        <h1 class="page-title">Mijn studenten</h1>
        <p class="page-subtitle">Bekijk de voortgang van iedere student en open het detailoverzicht.</p>
      </section>

      <section class="card">
        <div class="card-header">
          <span class="card-title">Actieve stageplaatsen</span>
          <span class="badge badge-blue">2 studenten</span>
        </div>
        <hr class="card-divider" />

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Opleiding</th>
                <th>Bedrijf</th>
                <th>Status</th>
                <th>Periode</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="student in studenten" :key="student.id">
                <td>
                  <div class="td-name">{{ student.naam }}</div>
                  <div class="td-sub">{{ student.id }}</div>
                </td>
                <td>{{ student.opleiding }}</td>
                <td>{{ student.bedrijf }}</td>
                <td>
                  <span class="badge badge-green" style="border-radius:4px;">{{ student.status }}</span>
                </td>
                <td>{{ student.periode }}</td>
                <td>
                  <RouterLink
                    :to="{ name: 'docent-student-detail', params: { id: student.id } }"
                    class="btn btn-secondary btn-sm"
                  >
                    Openen
                  </RouterLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  </div>
</template>
