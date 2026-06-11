import { defineStore } from 'pinia'
import { ref } from 'vue'

const API = 'http://localhost:3000/api'

export const useStageStore = defineStore('stage', () => {
  const status = ref('geen')
  const aanvraag = ref(null)
  const fout = ref(null)

  // LATER: vervang door GET /api/stages voor de ingelogde student,
  // zodat de status uit de database komt i.p.v. enkel uit het geheugen.
  function laad() {
    // Bewust leeg: we lezen niet meer uit localStorage.
    // De status komt vers bij het indienen, of later uit de backend.
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

      aanvraag.value = gegevens
      status.value = 'in_behandeling'
      return true

    } catch (e) {
      fout.value = e.message || 'Geen verbinding met de server'
      return false
    }
  }

  return { status, aanvraag, fout, laad, dienIn }
})