<script setup>
// Herbruikbaar berichtenpaneel tussen de docent en de mentor van één stage.
// De backend bepaalt afzender/ontvanger op basis van de ingelogde gebruiker.
import { ref, onMounted } from 'vue'

const props = defineProps({
  stageId: { type: [Number, String], required: true },
})

const API = 'http://localhost:3000/api'
const berichten = ref([])
const nieuw = ref('')
const bezig = ref(false)
const fout = ref('')
const laden = ref(true)

const gebruiker = JSON.parse(localStorage.getItem('gebruiker') || '{}')

function token() { return localStorage.getItem('token') }

function formatDatum(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('nl-BE', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

async function laad() {
  laden.value = true
  fout.value = ''
  try {
    const res = await fetch(`${API}/stages/${props.stageId}/contact`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Laden mislukt')
    berichten.value = data
    markeerGelezen()
  } catch (e) {
    fout.value = e.message
  } finally {
    laden.value = false
  }
}

// Berichten die aan mij gericht en nog ongelezen zijn, als gelezen markeren.
async function markeerGelezen() {
  const teLezen = berichten.value.filter((b) => !b.gelezen && b.ontvanger_id === gebruiker.id)
  for (const b of teLezen) {
    try {
      await fetch(`${API}/contactberichten/${b.bericht_id}/gelezen`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}` },
      })
    } catch { /* niet kritiek */ }
  }
}

async function verstuur() {
  if (!nieuw.value.trim()) return
  bezig.value = true
  fout.value = ''
  try {
    const res = await fetch(`${API}/stages/${props.stageId}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ bericht: nieuw.value }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Versturen mislukt')
    nieuw.value = ''
    await laad()
  } catch (e) {
    fout.value = e.message
  } finally {
    bezig.value = false
  }
}

onMounted(laad)
</script>

<template>
  <div class="contact-paneel">
    <div v-if="laden" class="text-secondary text-sm">Laden…</div>
    <template v-else>
      <div v-if="berichten.length === 0" class="text-secondary text-sm mb-12">
        Nog geen berichten.
      </div>
      <ul v-else class="bericht-lijst">
        <li
          v-for="b in berichten"
          :key="b.bericht_id"
          class="bericht"
          :class="{ 'bericht-eigen': b.afzender_id === gebruiker.id }"
        >
          <div class="bericht-kop">
            <strong>{{ b.afzender_voornaam }} {{ b.afzender_naam }}</strong>
            <span class="text-secondary text-xs">{{ formatDatum(b.aangemaakt_op) }}</span>
          </div>
          <div class="bericht-tekst">{{ b.bericht }}</div>
        </li>
      </ul>

      <textarea
        v-model="nieuw"
        rows="3"
        class="form-input mt-12"
        placeholder="Typ een bericht…"
      ></textarea>
      <div class="flex items-center gap-12 mt-8">
        <button class="btn btn-primary" :disabled="bezig || !nieuw.trim()" @click="verstuur">
          {{ bezig ? 'Bezig…' : 'Versturen' }}
        </button>
        <span v-if="fout" class="text-sm" style="color:#dc2626;">{{ fout }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.bericht-lijst {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 320px;
  overflow-y: auto;
}
.bericht {
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--gray50);
  border: 1px solid var(--border);
}
.bericht-eigen {
  background: #eff6ff;
  border-color: #bfdbfe;
}
.bericht-kop {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 4px;
}
.bericht-tekst {
  font-size: 14px;
  white-space: pre-wrap;
}
</style>
