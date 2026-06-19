import { defineStore } from 'pinia'
import { ref } from 'vue'

const API = 'http://localhost:3000/api'

function mapStatus(dbStatus) {
  switch (dbStatus) {
    case 'ingediend':
    case 'in_behandeling':
      return 'in_behandeling'
    case 'aanpassing_gevraagd':
      return 'aanpassing_gevraagd'
    case 'afgewezen':
      return 'afgewezen'
    case 'goedgekeurd':
    case 'bezig':
      return 'goedgekeurd'
    default:
      return 'geen'
  }
}

export const useStageStore = defineStore('stage', () => {
  const status = ref('geen')
  const aanvraag = ref(null)
  const motivatie = ref(null)
  const meldingen = ref([])
  const fout = ref(null)

  async function laad() {
    fout.value = null
    const token = localStorage.getItem('token')
    if (!token) {
      status.value = 'geen'
      aanvraag.value = null
      motivatie.value = null
      meldingen.value = []
      return
    }
    try {
      const res = await fetch(`${API}/mijn-stage`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Laden mislukt')
      if (!data.stage) {
        status.value = 'geen'
        aanvraag.value = null
        motivatie.value = null
        meldingen.value = []
        return
      }
      aanvraag.value = data.stage
      status.value = mapStatus(data.stage.status)
      motivatie.value = data.stage.commissie_motivatie || null
      meldingen.value = data.meldingen || []
    } catch (e) {
      fout.value = e.message || 'Geen verbinding met de server'
      status.value = 'geen'
      meldingen.value = []
    }
  }

  async function dienIn(gegevens) {
    fout.value = null
    try {
      const token = localStorage.getItem('token')
      const gebruiker = JSON.parse(localStorage.getItem('gebruiker') || '{}')
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      }

      const bedrijfRes = await fetch(`${API}/bedrijven`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          naam: gegevens.bedrijf.bedrijf,
          straatnaam: gegevens.bedrijf.straatnaam,
          huisnummer: gegevens.bedrijf.huisnummer,
          postcode: gegevens.bedrijf.postcode,
          gemeente: gegevens.bedrijf.gemeente,
          provincie: gegevens.bedrijf.provincie,
          sector: gegevens.bedrijf.sector,
          contact_email: gegevens.mentor.email,
          contact_telefoonnummer: gegevens.mentor.tel,
        }),
      })
      const bedrijfData = await bedrijfRes.json()
      if (!bedrijfRes.ok) throw new Error(bedrijfData.error || 'Bedrijf aanmaken mislukt')
      const bedrijf_id = bedrijfData.id

      const mentorRes = await fetch(`${API}/mentors`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          voornaam: gegevens.mentor.voornaam,
          naam: gegevens.mentor.achternaam,
          email: gegevens.mentor.email,
          telefoonnummer: gegevens.mentor.tel,
          functietitel: gegevens.mentor.functie,
          bedrijf_id,
        }),
      })
      const mentorData = await mentorRes.json()
      if (!mentorRes.ok) throw new Error(mentorData.error || 'Mentor aanmaken mislukt')
      const mentor_id = mentorData.mentor_id

      const stageRes = await fetch(`${API}/stages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          student_id: gebruiker.student_id,
          bedrijf_id,
          mentor_id,
          docent_id: null,
          stagetitel: gegevens.bedrijf.opdracht,
          beschrijving: gegevens.bedrijf.opdracht,
          startdatum: gegevens.bedrijf.datumVan,
          einddatum: gegevens.bedrijf.datumTot,
        }),
      })
      const stageData = await stageRes.json()
      if (!stageRes.ok) throw new Error(stageData.error || 'Stage aanmaken mislukt')

      await laad()
      return true
    } catch (e) {
      fout.value = e.message || 'Geen verbinding met de server'
      return false
    }
  }

  // Aanpassing: bestaande bedrijf + mentor + stage updaten.
  // De status gaat terug naar in_behandeling via de PUT /api/stages/:id (status meegestuurd).
  async function pasAan(gegevens) {
    fout.value = null
    try {
      const token = localStorage.getItem('token')
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      }
      const s = aanvraag.value // bevat bedrijf_id, mentor_id, mentor_gebruiker_id, stage_id

      const bedrijfRes = await fetch(`${API}/bedrijven/${s.bedrijf_id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          naam: gegevens.bedrijf.bedrijf,
          straatnaam: gegevens.bedrijf.straatnaam,
          huisnummer: gegevens.bedrijf.huisnummer,
          postcode: gegevens.bedrijf.postcode,
          gemeente: gegevens.bedrijf.gemeente,
          provincie: gegevens.bedrijf.provincie,
          sector: gegevens.bedrijf.sector,
          contact_email: gegevens.mentor.email,
          contact_telefoonnummer: gegevens.mentor.tel,
        }),
      })
      if (!bedrijfRes.ok) {
        const d = await bedrijfRes.json()
        throw new Error(d.error || 'Bedrijf bijwerken mislukt')
      }

      const mentorRes = await fetch(`${API}/mentors/${s.mentor_id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          voornaam: gegevens.mentor.voornaam,
          naam: gegevens.mentor.achternaam,
          email: gegevens.mentor.email,
          telefoonnummer: gegevens.mentor.tel,
          functietitel: gegevens.mentor.functie,
          gebruiker_id: s.mentor_gebruiker_id,
        }),
      })
      if (!mentorRes.ok) {
        const d = await mentorRes.json()
        throw new Error(d.error || 'Mentor bijwerken mislukt')
      }

      const stageRes = await fetch(`${API}/stages/${s.stage_id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          stagetitel: gegevens.bedrijf.opdracht,
          beschrijving: gegevens.bedrijf.opdracht,
          startdatum: gegevens.bedrijf.datumVan,
          einddatum: gegevens.bedrijf.datumTot,
          bedrijf_id: s.bedrijf_id,
          mentor_id: s.mentor_id,
          docent_id: null,
          status: 'in_behandeling',
        }),
      })
      if (!stageRes.ok) {
        const d = await stageRes.json()
        throw new Error(d.error || 'Stage bijwerken mislukt')
      }

      await laad()
      return true
    } catch (e) {
      fout.value = e.message || 'Geen verbinding met de server'
      return false
    }
  }

  return { status, aanvraag, motivatie, meldingen, fout, laad, dienIn, pasAan }
})