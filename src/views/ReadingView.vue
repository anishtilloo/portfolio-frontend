<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { api, ApiError } from '@/api/client'
import type { SavedLink } from '@/api/types'
import { formatDate } from '@/lib/format'

const route = useRoute()
const tag = computed(() => (typeof route.query.tag === 'string' ? route.query.tag : ''))

const links = ref<SavedLink[]>([])
const state = ref<'loading' | 'ready' | 'error'>('loading')
const error = ref('')

watch(
  tag,
  async (value, _before, onCleanup) => {
    const controller = new AbortController()
    onCleanup(() => controller.abort())
    state.value = 'loading'
    try {
      links.value = await api.listLinks(value || undefined, controller.signal)
      state.value = 'ready'
    } catch (err) {
      if (controller.signal.aborted) return
      error.value = err instanceof ApiError ? err.message : 'Something went wrong.'
      state.value = 'error'
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="container reading">
    <header>
      <h1>Reading list</h1>
      <p class="reading__lead">
        Articles and docs by other people that taught me something, with what I took from each.
      </p>
    </header>

    <p v-if="tag" class="reading__filter">
      Showing articles tagged <span class="tag" aria-current="true">{{ tag }}</span>
      <RouterLink class="link" :to="{ name: 'reading' }">Show all</RouterLink>
    </p>

    <p v-if="state === 'loading' && !links.length" class="muted">Loading the list…</p>
    <p v-else-if="state === 'error'" class="notice notice--error" role="alert">{{ error }}</p>
    <p v-else-if="!links.length" class="notice">
      {{ tag ? 'Nothing saved under this tag yet.' : 'Nothing saved yet.' }}
    </p>

    <ul v-else class="reading__list">
      <li v-for="link in links" :key="link.id" class="item">
        <p class="item__meta muted">
          <span v-if="link.source">{{ link.source }}</span>
          <time :datetime="link.created_at">Saved {{ formatDate(link.created_at) }}</time>
        </p>
        <h2 class="item__title">
          <a class="link" :href="link.url" target="_blank" rel="noopener noreferrer">
            {{ link.title }}
          </a>
        </h2>
        <p v-if="link.takeaway" class="item__takeaway">{{ link.takeaway }}</p>
        <p v-if="link.tags.length" class="item__tags">
          <RouterLink
            v-for="name in link.tags"
            :key="name"
            class="tag"
            :to="{ name: 'reading', query: { tag: name } }"
          >
            {{ name }}
          </RouterLink>
        </p>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.reading {
  padding-top: clamp(2rem, 6vw, 4rem);
}

.reading h1 {
  font-size: var(--step-4);
  font-variation-settings:
    'INFM' 55,
    'BNCE' 0,
    'SPAC' 0;
}

.reading__lead {
  margin-top: 1rem;
  max-width: 36rem;
  font-size: var(--step-1);
  line-height: 1.5;
}

.reading__filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  margin-top: 2rem;
}

.reading__list,
.reading > .notice,
.reading > .muted {
  margin-top: 2.5rem;
}

.item {
  max-width: 44rem;
  padding-block: 1.5rem;
  border-top: 1.5px dashed var(--rule);
}

.item:last-child {
  border-bottom: 1.5px dashed var(--rule);
}

.item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem 1.1rem;
  font-size: var(--step--1);
}

.item__title {
  margin-top: 0.3rem;
  font-size: var(--step-1);
  line-height: 1.3;
}

.item__takeaway {
  margin-top: 0.55rem;
  white-space: pre-line;
}

.item__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.75rem;
}
</style>
