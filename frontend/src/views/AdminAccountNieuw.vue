<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '../components/TopBar.vue'
import { navLinks } from './adminNav'

const router = useRouter()

const ROLLEN = [
  { waarde: 'student',   label: 'Student' },
  { waarde: 'docent',    label: 'Docent' },
  { waarde: 'commissie', label: 'Commissielid (docent)' },
  { waarde: 'mentor',    label: 'Mentor' },
  { waarde: 'admin',     label: 'Admin' },
]

const ACADEMIEJAAR_OPTIES = (() => {
  const jaar = new Date().getFullYear()
  return [-1, 0, 1, 2].map(d => `${jaar + d}-${jaar + d + 1}`)
})()

const STANDAARD_WACHTWOORD = {
  student:   'student123',
  docent:    'docent123',
  commissie: 'docent123',
  mentor:    'mentor123',
  admin:     'admin123',
}

// ─── Form state ───────────────────────────────────────────────────────────────
const form = ref({
  voornaam:      '',
  naam:          '',
  email:         '',
  telefoonnummer: '',
  rol:           'student',
  // student
  studentnummer: '',
  opleiding_id:  null,
  opleiding:     '',
  academiejaar:  '',
  // docent / commissie
  titel:         '',
  specialisatie: '',
  max_studenten: 5,
  // mentor
  bedrijf_id:    null,
  functietitel:  '',
})

const bezig    = ref(false)
const fout     = ref('')
const succes   = ref('')
const nieuwWachtwoord = ref('')

// ─── Validatie (zelfde regels als de backend) ─────────────────────────────────
const fouten = reactive({})

// Telefoon is optioneel; indien ingevuld: enkel cijfers/spaties/+/-/() en min. 8 cijfers.
function geldigTelefoon(tel) {
  if (!tel || !tel.trim()) return true
  const w = tel.trim()
  if (!/^[0-9\s+\-()]+$/.test(w)) return false
  return (w.match(/[0-9]/g) || []).length >= 8
}

// Studentnummer: letters en cijfers, 6–20 tekens, geen spaties of speciale tekens.
function geldigStudentnummer(nr) {
  return /^[A-Za-z0-9]{6,20}$/.test((nr || '').trim())
}

function valideer() {
  Object.keys(fouten).forEach((k) => delete fouten[k])

  if (!geldigTelefoon(form.value.telefoonnummer)) {
    fouten.telefoonnummer = 'Enkel cijfers, spaties, +, - en () — minstens 8 cijfers.'
  }
  if (form.value.rol === 'student' && !geldigStudentnummer(form.value.studentnummer)) {
    fouten.studentnummer = 'Enkel letters en cijfers, 6–20 tekens, geen spaties.'
  }

  return Object.keys(fouten).length === 0
}

// ─── Dropdown data ────────────────────────────────────────────────────────────
const opleidingen = ref([])
const bedrijven   = ref([])

function token() { return localStorage.getItem('token') }

onMounted(async () => {
  await Promise.all([laadOpleidingen(), laadBedrijven()])
})

async function laadOpleidingen() {
  try {
    const res = await fetch('http://localhost:3000/api/opleidingen', {
      headers: { Authorization: `Bearer ${token()}` },
    })
    opleidingen.value = await res.json()
  } catch {
    // niet fataal — dropdown blijft leeg
  }
}

async function laadBedrijven() {
  try {
    const res = await fetch('http://localhost:3000/api/bedrijven', {
      headers: { Authorization: `Bearer ${token()}` },
    })
    bedrijven.value = await res.json()
  } catch {
    // niet fataal
  }
}

// Zet opleiding-naam mee als tekst zodat het backend-veld klopt
watch(() => form.value.opleiding_id, (id) => {
  const gevonden = opleidingen.value.find(o => o.opleiding_id === Number(id))
  form.value.opleiding = gevonden?.naam ?? ''
})

// ─── Submit ───────────────────────────────────────────────────────────────────
const ENDPOINT = {
  student:   'http://localhost:3000/api/students',
  docent:    'http://localhost:3000/api/docenten',
  commissie: 'http://localhost:3000/api/docenten',
  mentor:    'http://localhost:3000/api/mentors',
  admin:     'http://localhost:3000/api/gebruikers',
}

function bouwBody() {
  const { rol, voornaam, naam, email, telefoonnummer,
          studentnummer, opleiding_id, opleiding, academiejaar,
          titel, specialisatie, max_studenten,
          bedrijf_id, functietitel } = form.value

  const basis = { voornaam, naam, email, telefoonnummer: telefoonnummer || undefined }

  if (rol === 'student')   return { ...basis, studentnummer, opleiding_id: opleiding_id || undefined, opleiding, academiejaar }
  if (rol === 'mentor')    return { ...basis, bedrijf_id, functietitel }
  if (rol === 'admin')     return basis
  // docent / commissie
  return { ...basis, titel: titel || undefined, specialisatie: specialisatie || undefined, max_studenten: Number(max_studenten) || 5, rol }
}

async function opslaan() {
  fout.value   = ''
  succes.value = ''
  nieuwWachtwoord.value = ''

  if (!valideer()) return

  bezig.value  = true

  try {
    const res = await fetch(ENDPOINT[form.value.rol], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(bouwBody()),
    })
    const data = await res.json()

    if (!res.ok) {
      fout.value = data.error || 'Aanmaken mislukt.'
      return
    }

    nieuwWachtwoord.value = data.standaardwachtwoord || STANDAARD_WACHTWOORD[form.value.rol]
    succes.value = `Account aangemaakt voor ${form.value.voornaam} ${form.value.naam}.`
    resetForm()
  } catch {
    fout.value = 'Kan niet verbinden met de backend.'
  } finally {
    bezig.value = false
  }
}

function resetForm() {
  const rol = form.value.rol
  form.value = {
    voornaam: '', naam: '', email: '', telefoonnummer: '',
    rol,
    studentnummer: '', opleiding_id: null, opleiding: '', academiejaar: '',
    titel: '', specialisatie: '', max_studenten: 5,
    bedrijf_id: null, functietitel: '',
  }
}

const isStudent   = computed(() => form.value.rol === 'student')
const isDocent    = computed(() => form.value.rol === 'docent' || form.value.rol === 'commissie')
const isMentor    = computed(() => form.value.rol === 'mentor')
</script>

<template>
  <div class="page">
    <TopBar :links="navLinks" />

    <main class="content">
      <button class="terug-link" @click="router.push('/admin/accounts')">← Terug naar accounts</button>

      <div class="pagina-hoofd">
        <div>
          <h1 class="page-title">Nieuw account aanmaken</h1>
          <p class="page-subtitle">Kies een rol en vul de gegevens in. Het account is direct actief met een standaardwachtwoord.</p>
        </div>
      </div>

      <!-- Succes / wachtwoord tonen -->
      <div v-if="succes" class="succes-vak">
        <p class="succes-tekst">{{ succes }}</p>
        <p class="ww-tekst">
          Standaardwachtwoord: <strong class="ww-waarde">{{ nieuwWachtwoord }}</strong>
        </p>
        <p class="ww-info">Geef dit wachtwoord aan de gebruiker. Ze kunnen het daarna resetten via "Wachtwoord vergeten".</p>
      </div>

      <!-- Foutmelding -->
      <div v-if="fout" class="fout-vak">{{ fout }}</div>

      <!-- Formulier -->
      <div class="form-kaart">

        <!-- Basisgegevens -->
        <div class="form-sectie">
          <h2 class="sectie-titel">Basisgegevens</h2>
          <div class="form-rij">
            <div class="form-group">
              <label class="form-label">Voornaam <span class="verplicht">*</span></label>
              <input v-model="form.voornaam" class="form-input" placeholder="bijv. Jana" required />
            </div>
            <div class="form-group">
              <label class="form-label">Naam <span class="verplicht">*</span></label>
              <input v-model="form.naam" class="form-input" placeholder="bijv. Peeters" required />
            </div>
          </div>
          <div class="form-rij">
            <div class="form-group">
              <label class="form-label">E-mailadres <span class="verplicht">*</span></label>
              <input v-model="form.email" type="email" class="form-input" placeholder="jana.peeters@school.be" required />
            </div>
            <div class="form-group">
              <label class="form-label">Telefoonnummer</label>
              <input v-model="form.telefoonnummer" class="form-input" placeholder="+32 4xx xx xx xx" />
              <span v-if="fouten.telefoonnummer" class="veld-fout">{{ fouten.telefoonnummer }}</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Rol <span class="verplicht">*</span></label>
            <select v-model="form.rol" class="form-input form-select">
              <option v-for="r in ROLLEN" :key="r.waarde" :value="r.waarde">{{ r.label }}</option>
            </select>
          </div>
        </div>

        <!-- Extra velden: student -->
        <div v-if="isStudent" class="form-sectie">
          <h2 class="sectie-titel">Studentgegevens</h2>
          <div class="form-rij">
            <div class="form-group">
              <label class="form-label">Studentnummer <span class="verplicht">*</span></label>
              <input v-model="form.studentnummer" class="form-input" placeholder="bijv. r0123456" required />
              <span v-if="fouten.studentnummer" class="veld-fout">{{ fouten.studentnummer }}</span>
            </div>
            <div class="form-group">
              <label class="form-label">Academiejaar <span class="verplicht">*</span></label>
              <select v-model="form.academiejaar" class="form-input form-select">
                <option value="" disabled>Kies een academiejaar</option>
                <option v-for="jaar in ACADEMIEJAAR_OPTIES" :key="jaar" :value="jaar">{{ jaar }}</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Opleiding <span class="verplicht">*</span></label>
            <select v-model="form.opleiding_id" class="form-input form-select">
              <option :value="null" disabled>Kies een opleiding</option>
              <option v-for="o in opleidingen" :key="o.opleiding_id" :value="o.opleiding_id">{{ o.naam }}</option>
            </select>
            <p v-if="opleidingen.length === 0" class="form-hint">Geen opleidingen gevonden. Controleer de database.</p>
          </div>
        </div>

        <!-- Extra velden: docent / commissie -->
        <div v-if="isDocent" class="form-sectie">
          <h2 class="sectie-titel">Docentgegevens</h2>
          <div class="form-rij">
            <div class="form-group">
              <label class="form-label">Titel</label>
              <input v-model="form.titel" class="form-input" placeholder="bijv. dhr., mevr., dr." />
            </div>
            <div class="form-group">
              <label class="form-label">Max. studenten</label>
              <input v-model.number="form.max_studenten" type="number" min="1" max="50" class="form-input" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Specialisatie</label>
            <input v-model="form.specialisatie" class="form-input" placeholder="bijv. Webontwikkeling" />
          </div>
          <p v-if="form.rol === 'commissie'" class="form-hint">
            Een commissielid krijgt ook een docent-profiel en kan studenten + evaluaties zien.
          </p>
        </div>

        <!-- Extra velden: mentor -->
        <div v-if="isMentor" class="form-sectie">
          <h2 class="sectie-titel">Mentorgegevens</h2>
          <div class="form-group">
            <label class="form-label">Bedrijf <span class="verplicht">*</span></label>
            <select v-model="form.bedrijf_id" class="form-input form-select">
              <option :value="null" disabled>Kies een bedrijf</option>
              <option v-for="b in bedrijven" :key="b.bedrijf_id" :value="b.bedrijf_id">{{ b.naam }}</option>
            </select>
            <p v-if="bedrijven.length === 0" class="form-hint">Geen bedrijven gevonden. Maak eerst een bedrijf aan via een stagedossier.</p>
          </div>
          <div class="form-group">
            <label class="form-label">Functietitel</label>
            <input v-model="form.functietitel" class="form-input" placeholder="bijv. Software Engineer" />
          </div>
        </div>

        <!-- Acties -->
        <div class="form-acties">
          <button class="btn btn-secondary" type="button" @click="router.push('/admin/accounts')">Annuleren</button>
          <button class="btn btn-primary" type="button" :disabled="bezig" @click="opslaan">
            {{ bezig ? 'Bezig…' : 'Account aanmaken' }}
          </button>
        </div>

      </div>
    </main>
  </div>
</template>

<style scoped>
/* ── Terug link ──────────────────────────────────────────────────────────── */
.terug-link {
  background: none; border: none; padding: 0;
  font-size: 13px; color: var(--text-secondary); cursor: pointer;
  font-family: inherit; margin-bottom: 4px; display: inline-block;
}
.terug-link:hover { color: var(--text-primary); text-decoration: underline; }

/* ── Pagina hoofd ────────────────────────────────────────────────────────── */
.pagina-hoofd {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

/* ── Succes / fout banners ───────────────────────────────────────────────── */
.succes-vak {
  padding: 16px 20px;
  background: #f0fdf4;
  border: 1px solid #dcfce7;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.succes-tekst { font-size: 14px; font-weight: 600; color: var(--green); margin: 0; }
.ww-tekst  { font-size: 13px; color: var(--text-primary); margin: 0; }
.ww-waarde { font-family: monospace; font-size: 15px; background: #dcfce7; padding: 2px 8px; border-radius: 4px; }
.ww-info   { font-size: 12px; color: var(--text-secondary); margin: 0; }

.fout-vak {
  padding: 12px 16px;
  background: var(--red-bg);
  border: 1px solid #fca5a5;
  border-radius: 8px;
  font-size: 13px;
  color: var(--red);
  font-weight: 500;
}

/* ── Formulier kaart ─────────────────────────────────────────────────────── */
.form-kaart {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}

.form-sectie {
  padding: 24px 28px;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.form-sectie:last-of-type { border-bottom: none; }

.sectie-titel {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  margin: 0;
}

.form-rij {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 5px;
}
.verplicht { color: var(--red); }

.form-select { appearance: none; cursor: pointer; }

.form-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 4px 0 0 0;
  line-height: 1.4;
}

.veld-fout {
  display: block;
  font-size: 12px;
  color: var(--red);
  margin-top: 4px;
}

/* ── Acties ──────────────────────────────────────────────────────────────── */
.form-acties {
  padding: 20px 28px;
  border-top: 1px solid var(--border);
  background: var(--gray50);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn[disabled] { opacity: 0.4; cursor: not-allowed; }
</style>
