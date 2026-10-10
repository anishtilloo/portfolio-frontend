<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="container missing">
    <h1>This page isn’t in the notebook.</h1>
    <p>The address may be mistyped, or the page may have moved.</p>
    <p class="missing__links">
      <RouterLink class="button button--primary" to="/">Go to the home page</RouterLink>
      <RouterLink class="button" to="/blog">Browse the blog</RouterLink>
    </p>
  </div>
</template>

<style scoped>
.missing {
  padding-top: clamp(3rem, 10vw, 7rem);
}

.missing h1 {
  font-size: var(--step-3);
  margin-bottom: 0.75rem;
}

.missing__links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 2rem;
}
</style>
