import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useStageStore = defineStore('stage', () => {
  const status = ref('geen')
  const aanvraag = ref(null)

  async function laad() {
    const token = localStorage.getItem('token')
    if (!token) return
    const res = await fetch('http://localhost:3000/api/stage', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    status.value = data.status || 'geen'
    aanvraag.value = data.stage || null
  }

  async function dienIn(gegevens) {
    const token = localStorage.getItem('token')
    await fetch('http://localhost:3000/api/stages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        stagetitel: gegevens.bedrijf.opdracht,
        beschrijving: gegevens.bedrijf.opdracht,
        startdatum: gegevens.bedrijf.datumVan,
        einddatum: gegevens.bedrijf.datumTot
      })
    })
    aanvraag.value = gegevens
    status.value = 'in_behandeling'
  }

  return { status, aanvraag, laad, dienIn }
})
