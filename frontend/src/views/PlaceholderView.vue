<script setup>
import TopBar from '../components/TopBar.vue'

const props = defineProps({
  title: {
    type: String,
    default: 'Pagina',
  },
  subtitle: {
    type: String,
    default: 'Deze pagina is nog in ontwikkeling.',
  },
  links: {
    type: Array,
    default: () => [],
  },
})
</script>

<template>
  <div class="page">
    <TopBar :links="links" />

    <main class="content">
      <section class="card">
        <h1 class="page-title">{{ props.title }}</h1>
        <p class="page-subtitle" style="margin-bottom: 8px;">{{ props.subtitle }}</p>
        <p class="text-secondary text-sm">Deze route is toegevoegd zodat de navigatie en links in de app werken tijdens de overgang naar Vue.</p>
      </section>
    </main>
  </div>
</template>
