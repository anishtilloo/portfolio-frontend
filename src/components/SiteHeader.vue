<script setup lang="ts">
import { RouterLink } from 'vue-router'

import { profile } from '@/content/profile'
import { useAuthStore } from '@/stores/auth'

import ThemeToggle from './ThemeToggle.vue'

const auth = useAuthStore()
</script>

<template>
  <header class="header">
    <div class="container header__row">
      <RouterLink to="/" class="header__name">{{ profile.name }}</RouterLink>

      <nav class="header__nav" aria-label="Main">
        <RouterLink :to="{ path: '/', hash: '#work' }">Work</RouterLink>
        <RouterLink :to="{ path: '/', hash: '#projects' }">Projects</RouterLink>
        <RouterLink to="/blog" active-class="is-current">Blog</RouterLink>
        <RouterLink to="/reading" active-class="is-current">Reading</RouterLink>
        <RouterLink v-if="auth.isSignedIn" to="/admin" active-class="is-current">
          Writing desk
        </RouterLink>
      </nav>

      <ThemeToggle class="header__theme" />
    </div>
  </header>
</template>

<style scoped>
.header {
  padding-block: 1.1rem;
}

.header__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem 1.5rem;
}

.header__name {
  margin-right: auto;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--step-1);
  font-variation-settings:
    'INFM' 40,
    'BNCE' 0,
    'SPAC' 0;
  text-decoration: none;
}

.header__nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem 1.35rem;
}

.header__nav a {
  padding-block: 0.25rem;
  text-decoration: none;
  border-bottom: 3px solid transparent;
}

.header__nav a:hover,
.header__nav a.is-current {
  border-bottom-color: var(--marker);
}

@media (max-width: 34rem) {
  .header__nav {
    order: 3;
    width: 100%;
  }
}
</style>
