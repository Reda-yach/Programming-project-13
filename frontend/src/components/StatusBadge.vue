<script setup>
defineProps({
  status: {
    type: String,
    required: true
  }
})

const classMap = {
  'In behandeling':     'badge-yellow',
  'Goedgekeurd':        'badge-green',
  'Afgewezen':          'badge-red',
  'Aanpassing vereist': 'badge-orange',
  'Actief':             'badge-green',
  'Afgerond':           'badge-green',
}
</script>

<template>
  <span class="badge" :class="classMap[status] ?? 'badge-gray'" style="border-radius:4px;">
    {{ status }}
  </span>
</template>
