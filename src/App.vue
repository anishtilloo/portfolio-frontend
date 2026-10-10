<script setup lang="ts">
import { RouterView } from 'vue-router'

import SiteFooter from '@/components/SiteFooter.vue'
import SiteHeader from '@/components/SiteHeader.vue'
</script>

<template>
  <a class="skip button button--primary" href="#main">Skip to content</a>
  <SiteHeader />
  <main id="main" tabindex="-1">
    <RouterView />
  </main>
  <SiteFooter />
</template>

<style scoped>
.skip {
  position: absolute;
  left: 1rem;
  top: -5rem;
  z-index: 10;
}

.skip:focus {
  top: 1rem;
}

main:focus {
  outline: none;
}
</style>
