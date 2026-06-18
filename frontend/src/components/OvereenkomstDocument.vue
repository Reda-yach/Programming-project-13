<script setup>
// Toont de volledige stageovereenkomst als één pagina (geen PDF).
// Verwacht het contract-object zoals teruggegeven door GET /api/contracten/:stage_id,
// dat zowel de stagegegevens als de drie handtekeningen bevat.

defineProps({
  contract: { type: Object, required: true },
})

function formatDatum(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })
}

const partijen = [
  { rol: 'docent', label: 'Stagecommissie' },
  { rol: 'student', label: 'Student' },
  { rol: 'mentor', label: 'Stagementor' },
]
</script>

<template>
  <div class="overeenkomst card">
    <header class="overeenkomst-head">
      <h2 style="font-size:20px;font-weight:700;">Stageovereenkomst</h2>
      <p class="text-secondary text-sm">{{ contract.stagetitel }}</p>
    </header>

    <hr class="card-divider" />

    <section class="form-grid-2">
      <div>
        <p class="text-secondary text-xs">Student</p>
        <p class="font-semibold">{{ contract.voornaam }} {{ contract.student }}</p>
        <p class="text-secondary text-xs mt-4">{{ contract.studentnummer }} · {{ contract.opleiding }}</p>
      </div>
      <div>
        <p class="text-secondary text-xs">Stageperiode</p>
        <p class="font-semibold">{{ formatDatum(contract.startdatum) }} – {{ formatDatum(contract.einddatum) }}</p>
      </div>
      <div>
        <p class="text-secondary text-xs">Bedrijf</p>
        <p class="font-semibold">{{ contract.bedrijf }}</p>
        <p class="text-secondary text-xs mt-4">
          {{ contract.bedrijf_straatnaam }} {{ contract.bedrijf_huisnummer }},
          {{ contract.bedrijf_postcode }} {{ contract.bedrijf_gemeente }}
        </p>
      </div>
      <div>
        <p class="text-secondary text-xs">Stagementor</p>
        <p class="font-semibold">{{ contract.mentor_voornaam }} {{ contract.mentor_naam }}</p>
        <p class="text-secondary text-xs mt-4">
          <span v-if="contract.mentor_functie">{{ contract.mentor_functie }} · </span>{{ contract.mentor_email }}
        </p>
      </div>
    </section>

    <div v-if="contract.beschrijving" class="mt-16">
      <p class="text-secondary text-xs">Opdracht</p>
      <p class="text-sm mt-4">{{ contract.beschrijving }}</p>
    </div>

    <hr class="card-divider mt-16" />

    <section>
      <h3 class="form-section-title">Handtekeningen</h3>
      <div class="handtekening-grid mt-12">
        <div v-for="p in partijen" :key="p.rol" class="handtekening-blok">
          <p class="text-secondary text-xs font-semibold">{{ p.label }}</p>
          <div class="handtekening-vak">
            <img
              v-if="contract[`handtekening_${p.rol}`]"
              :src="contract[`handtekening_${p.rol}`]"
              alt="handtekening"
              class="handtekening-img"
            />
            <span v-else class="text-secondary text-xs">Wacht op handtekening</span>
          </div>
          <p class="text-secondary text-xs mt-4">
            <template v-if="contract[`getekend_${p.rol}`]">
              ✅ Getekend op {{ formatDatum(contract[`getekend_${p.rol}_op`]) }}
            </template>
            <template v-else>⏳ Nog niet getekend</template>
          </p>
        </div>
      </div>

      <div
        v-if="contract.getekend_student && contract.getekend_mentor && contract.getekend_docent"
        class="card mt-16"
        style="background:#f0fdf4;border:1px solid #bbf7d0;"
      >
        <p class="font-semibold" style="color:#15803d;">Overeenkomst volledig ondertekend</p>
        <p class="text-secondary text-sm mt-4">Afgerond op {{ formatDatum(contract.getekend_op) }}</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.handtekening-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}
.handtekening-vak {
  margin-top: 6px;
  height: 110px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  overflow: hidden;
}
.handtekening-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
