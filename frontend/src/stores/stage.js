import { defineStore } from 'pinia'
import { ref } from 'vue'

const OPSLAG_SLEUTEL = 'stage-aanvraag'

export const useStageStore = defineStore('stage', () => {
  // 'geen' | 'in_behandeling' | 'actief'
  const status = ref('geen')
  const aanvraag = ref(null)

  // Bij het opstarten de bewaarde status inladen.
  // LATER: vervang dit door een API-call die de status van de
  // ingelogde student ophaalt (bv. GET /api/stage).
  function laad() {
    const opgeslagen = localStorage.getItem(OPSLAG_SLEUTEL)
    if (opgeslagen) {
      const data = JSON.parse(opgeslagen)
      status.value = data.status
      aanvraag.value = data.aanvraag
    }
  }

  // Een aanvraag indienen.
  // LATER: vervang de localStorage-regel door een POST naar de backend
  // (bv. await api.post('/api/stage/aanvraag', gegevens)).
  function dienIn(gegevens) {
    aanvraag.value = gegevens
    status.value = 'in_behandeling'
    localStorage.setItem(
      OPSLAG_SLEUTEL,
      JSON.stringify({ status: status.value, aanvraag: aanvraag.value })
    )
  }

  return { status, aanvraag, laad, dienIn }
})