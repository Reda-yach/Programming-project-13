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
 
  // Status uit de DATABASE halen voor de ingelogde student.
  // Overleeft een refresh en toont de commissie-beslissing.
  async function laad() {
    fout.value = null
    const token = localStorage.getItem('token')
 
    // Geen token → niet ingelogd, geen crash.
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
 
      // Geen aanvraag ingediend.
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

  // Weg A (Model 1): uit de invoer worden echt een bedrijf en een mentor
  // aangemaakt, daarna de stage die eraan koppelt.
  async function dienIn(gegevens) {
    fout.value = null
    try {
      const token = localStorage.getItem('token')
      const gebruiker = JSON.parse(localStorage.getItem('gebruiker') || '{}')

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      }

      // 1) Bedrijf aanmaken
      const bedrijfRes = await fetch(`${API}/bedrijven`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          naam: gegevens.bedrijf.bedrijf,
          adres: gegevens.bedrijf.adres,
          sector: gegevens.bedrijf.sector,
          contact_email: gegevens.mentor.email,
          contact_telefoonnummer: gegevens.mentor.tel,
        }),
      })
      const bedrijfData = await bedrijfRes.json()
      if (!bedrijfRes.ok) throw new Error(bedrijfData.error || 'Bedrijf aanmaken mislukt')
      const bedrijf_id = bedrijfData.id

      // 2) Mentor aanmaken (maakt ook een gebruiker met rol 'mentor').
      // De mentornaam is één veld; we splitsen op de eerste spatie.
      const [voornaam, ...rest] = gegevens.mentor.naam.trim().split(' ')
      const naam = rest.join(' ') || voornaam

      const mentorRes = await fetch(`${API}/mentors`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          voornaam,
          naam,
          email: gegevens.mentor.email,
          telefoonnummer: gegevens.mentor.tel,
          functietitel: gegevens.mentor.functie,
          bedrijf_id,
        }),
      })
      const mentorData = await mentorRes.json()
      if (!mentorRes.ok) throw new Error(mentorData.error || 'Mentor aanmaken mislukt')
      const mentor_id = mentorData.mentor_id

      // 3) Stage aanmaken, gekoppeld aan het verse bedrijf en de verse mentor.
      // docent_id blijft NULL — de admin wijst later een docent toe.
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

  return { status, aanvraag, motivatie, meldingen, fout, laad, dienIn }
})