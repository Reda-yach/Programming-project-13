<script setup>
defineProps({
  links: {
    type: Array,
    default: () => []
  }
})
</script>

<template>
  <nav class="topbar">
    <div class="topbar-left">
      <span class="topbar-logo">■ Stage Monitor</span>
    </div>

    <div class="topbar-center">
      <router-link
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="topbar-link"
        active-class="topbar-link-active"
      >
        {{ link.label }}
      </router-link>
    </div>

    <div class="topbar-right">
      <span class="topbar-user">Student ▾</span>
      <button class="btn btn-secondary" @click="$router.push('/login')">
        Uitloggen
      </button>
    </div>
  </nav>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 56px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
}

.topbar-logo {
  font-weight: 600;
  font-size: 16px;
}

.topbar-center {
  display: flex;
  gap: 24px;
}

.topbar-link {
  font-size: 14px;
  color: #6b7280;
  text-decoration: none;
  padding-bottom: 4px;
}

.topbar-link-active {
  color: #111827;
  font-weight: 600;
  border-bottom: 2px solid #111827;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.topbar-user {
  font-size: 14px;
  color: #111827;
}
</style>
