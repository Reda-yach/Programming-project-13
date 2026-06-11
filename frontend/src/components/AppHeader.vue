<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <header class="topbar">
    <div class="topbar-logo">
      <div class="logo-icon"></div>
      <span class="logo-text">Stage Monitor</span>
    </div>
    <nav class="topbar-nav">
      <RouterLink to="/competenties" class="nav-item">Competenties</RouterLink>
      <RouterLink to="/stages" class="nav-item">Stages</RouterLink>
      <RouterLink to="/accounts" class="nav-item">Accounts</RouterLink>
      <RouterLink to="/aanvragen" class="nav-item">Aanvragen</RouterLink>
    </nav>
    <div class="topbar-right">
      <span class="role-btn">Commissie</span>
      <RouterLink to="/login" class="uitloggen">Uitloggen</RouterLink>
    </div>
  </header>
</template>
