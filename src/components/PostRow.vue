<script setup lang="ts">
import { RouterLink } from 'vue-router'

import type { PostSummary } from '@/api/types'
import { formatDate, readingTime } from '@/lib/format'

defineProps<{ post: PostSummary }>()
</script>

<template>
  <article class="row">
    <time class="row__date muted" :datetime="post.published_at ?? undefined">
      {{ formatDate(post.published_at) }}
    </time>

    <div class="row__body">
      <h3 class="row__title">
        <RouterLink :to="{ name: 'post', params: { slug: post.slug } }">{{ post.title }}</RouterLink>
      </h3>
      <p v-if="post.summary" class="row__summary">{{ post.summary }}</p>
      <p class="row__meta muted">
        <span>{{ post.kind === 'note' ? 'Note' : 'Article' }}</span>
        <span>{{ readingTime(post.reading_minutes) }}</span>
        <RouterLink
          v-for="tag in post.tags"
          :key="tag"
          class="tag"
          :to="{ name: 'blog', query: { tag } }"
        >
          {{ tag }}
        </RouterLink>
      </p>
    </div>
  </article>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: 7.5rem minmax(0, 1fr);
  gap: 0.25rem 1.5rem;
  padding-block: 1.5rem;
  border-top: 1.5px dashed var(--rule);
}

.row__date {
  padding-top: 0.3rem;
  font-size: var(--step--1);
  font-variant-numeric: tabular-nums;
}

.row__title {
  font-size: var(--step-1);
  line-height: 1.25;
}

.row__title a {
  text-decoration: none;
  background: linear-gradient(var(--marker), var(--marker)) no-repeat 0 100% / 0 100%;
  transition: background-size 0.18s ease-out;
}

.row__title a:hover {
  background-size: 100% 100%;
  color: var(--on-marker);
}

.row__summary {
  margin-top: 0.4rem;
  max-width: 38rem;
}

.row__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.9rem;
  margin-top: 0.65rem;
  font-size: var(--step--1);
}

@media (max-width: 38rem) {
  .row {
    grid-template-columns: 1fr;
  }
}
</style>
