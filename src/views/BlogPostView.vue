<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'
import { RouterLink } from 'vue-router'

import { api, ApiError } from '@/api/client'
import type { PostDetail } from '@/api/types'
import { formatDate, readingTime } from '@/lib/format'
import { renderMarkdown } from '@/lib/markdown'
import { pageTitle } from '@/router'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ slug: string }>()
const auth = useAuthStore()

const post = ref<PostDetail | null>(null)
const state = ref<'loading' | 'ready' | 'missing' | 'error'>('loading')
const error = ref('')

watch(
  () => props.slug,
  async (slug, _before, onCleanup) => {
    // Moving between posts reuses this component. Cancel the old request so a
    // slow response can't overwrite the post that is now on screen.
    const controller = new AbortController()
    onCleanup(() => controller.abort())

    post.value = null
    state.value = 'loading'
    try {
      post.value = await api.getPost(slug, controller.signal)
      state.value = 'ready'
    } catch (err) {
      if (controller.signal.aborted) return
      if (err instanceof ApiError && err.status === 404) {
        state.value = 'missing'
      } else {
        error.value = err instanceof ApiError ? err.message : 'Something went wrong.'
        state.value = 'error'
      }
    }
  },
  { immediate: true },
)

// The tab title follows the state above, in one place.
watchEffect(() => {
  if (post.value) document.title = pageTitle(post.value.title)
  else if (state.value === 'missing') document.title = pageTitle('Post not found')
  else document.title = pageTitle('Blog')
})

const html = computed(() => (post.value ? renderMarkdown(post.value.body_md) : ''))
</script>

<template>
  <div class="container post">
    <p class="post__back">
      <RouterLink class="link" :to="{ name: 'blog' }">All posts</RouterLink>
    </p>

    <p v-if="state === 'loading'" class="muted" aria-live="polite">Loading post…</p>

    <div v-else-if="state === 'missing'" class="notice">
      <h1 class="post__missing">There’s no published post at this address.</h1>
      <p>It may have been renamed or taken down. The full list is on the blog page.</p>
    </div>

    <p v-else-if="state === 'error'" class="notice notice--error" role="alert">{{ error }}</p>

    <article v-else-if="post">
      <header class="post__header">
        <h1 class="post__title">{{ post.title }}</h1>
        <p v-if="post.summary" class="post__summary">{{ post.summary }}</p>
        <p class="post__meta muted">
          <span>{{ post.kind === 'note' ? 'Note' : 'Article' }}</span>
          <time :datetime="post.published_at ?? undefined">
            {{ formatDate(post.published_at) }}
          </time>
          <span>{{ readingTime(post.reading_minutes) }}</span>
          <RouterLink
            v-if="auth.isSignedIn"
            class="link"
            :to="{ name: 'post-edit', params: { id: post.id } }"
          >
            Edit this post
          </RouterLink>
        </p>
      </header>

      <!-- Sanitised in renderMarkdown before it reaches the page. -->
      <div class="prose" v-html="html"></div>

      <footer v-if="post.tags.length" class="post__footer">
        <span class="muted">Filed under</span>
        <RouterLink
          v-for="tag in post.tags"
          :key="tag"
          class="tag"
          :to="{ name: 'blog', query: { tag } }"
        >
          {{ tag }}
        </RouterLink>
      </footer>
    </article>
  </div>
</template>

<style scoped>
.post {
  padding-top: clamp(1.5rem, 4vw, 3rem);
}

.post__back {
  font-size: var(--step--1);
  margin-bottom: 2.5rem;
}

.post__header {
  max-width: 46rem;
  margin-bottom: 2.75rem;
}

.post__title {
  font-size: clamp(2.1rem, 1.3rem + 3.4vw, 3.4rem);
  line-height: 1.06;
  font-weight: 700;
  font-variation-settings:
    'INFM' 45,
    'BNCE' 0,
    'SPAC' 0;
}

.post__summary {
  margin-top: 1.1rem;
  font-size: var(--step-1);
  line-height: 1.45;
  max-width: 40rem;
}

.post__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem 1.25rem;
  margin-top: 1.25rem;
  font-size: var(--step--1);
}

.post__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  max-width: var(--measure);
  margin-top: 3rem;
  padding-top: 1.25rem;
  border-top: 1.5px dashed var(--rule);
  font-size: var(--step--1);
}

.post__missing {
  font-size: var(--step-2);
  margin-bottom: 0.5rem;
}
</style>
