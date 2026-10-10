<script setup lang="ts">
import { ref } from 'vue'

type Theme = 'light' | 'dark'

const theme = ref<Theme>(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')

function toggle() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.theme = theme.value
  try {
    localStorage.setItem('theme', theme.value)
  } catch {
    // The choice just won't be remembered.
  }
}
</script>

<template>
  <button
    type="button"
    class="toggle"
    @click="toggle"
  >
    <span class="toggle__swatch" aria-hidden="true"></span>
    <span class="visually-hidden">Switch to </span>{{ theme === 'dark' ? 'Paper' : 'Blueprint' }}
    <span class="visually-hidden"> theme</span>
  </button>
</template>

<style scoped>
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.3rem 0.75rem 0.3rem 0.4rem;
  border: 1.5px solid var(--rule);
  border-radius: 999px;
  background: transparent;
  font-size: var(--step--1);
  cursor: pointer;
}

.toggle:hover {
  border-color: var(--ink);
}

/* Shows the theme you would switch to. */
.toggle__swatch {
  width: 1.05rem;
  height: 1.05rem;
  border-radius: 50%;
  border: 1.5px solid var(--ink);
  background: #16245c;
}

:root[data-theme='dark'] .toggle__swatch {
  background: #f1f3f7;
}
</style>
