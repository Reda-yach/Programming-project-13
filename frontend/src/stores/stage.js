import { defineStore } from 'pinia'
import { ref } from 'vue'

const OPSLAG_SLEUTEL = 'stage-aanvraag'

export const useStageStore = defineStore('stage', () => {
  const status = ref('geen')
  const aanvraag = ref(null)
  const fout = ref(null)

  function laad() {
    const opgeslagen = localStorage.getItem(OPSLAG_SLEUTEL)
    if (opgeslagen) {
      const data = JSON.parse(opgeslagen)
      status.value = data.status
      aanvraag.value = data.aanvraag
    }
  }

  async function dienIn(gegevens) {
    fout.value = null
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:3000/api/stages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          student_id: gegevens.student.student_id,
          bedrijf_id: gegevens.bedrijf.bedrijf_id,
          mentor_id: gegevens.mentor.mentor_id,
          docent_id: gegevens.student.docent_id,
          stagetitel: gegevens.bedrijf.opdracht,
          beschrijving: gegevens.bedrijf.opdracht,
          startdatum: gegevens.bedrijf.datumVan,
          einddatum: gegevens.bedrijf.datumTot
        })
      })

      if (!response.ok) {
        const data = await response.json()
        fout.value = data.error || 'Er is iets misgegaan'
        return false
      }

      aanvraag.value = gegevens
      status.value = 'in_behandeling'
      localStorage.setItem(
        OPSLAG_SLEUTEL,