<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { api, ApiError } from '@/api/client'
import type { PostKind, PostSummary, TagCount } from '@/api/types'
import PostRow from '@/components/PostRow.vue'

const PAGE_SIZE = 20

const route = useRoute()
const router = useRouter()

// The filters live in the address bar, so a filtered view can be shared or bookmarked.
const kind = computed<PostKind | ''>(() =>
  route.query.kind === 'article' || route.query.kind === 'note' ? route.query.kind : '',
)
const tag = computed(() => (typeof route.query.tag === 'string' ? route.query.tag : ''))
const query = computed(() => (typeof route.query.q === 'string' ? route.query.q : ''))

const posts = ref<PostSummary[]>([])
const total = ref(0)
const tags = ref<TagCount[]>([])
const state = ref<'loading' | 'ready' | 'error'>('loading')
const error = ref('')
const loadingMore = ref(false)

const searchText = ref(query.value)
let searchTimer: ReturnType<typeof setTimeout> | undefined

const isFiltered = computed(() => Boolean(kind.value || tag.value || query.value))

const kinds: { value: PostKind | ''; label: string }[] = [
  { value: '', label: 'Everything' },
  { value: 'article', label: 'Articles' },
  { value: 'note', label: 'Notes' },
]

function filterLink(changes: Record<string, string>) {
  const next: Record<string, string> = { kind: kind.value, tag: tag.value, q: query.value, ...changes }
  for (const key of Object.keys(next)) if (!next[key]) delete next[key]
  return { name: 'blog', query: next }
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    router.replace(filterLink({ q: searchText.value.trim() }))
  }, 250)
}

watch(query, (value) => {
  if (value !== searchText.value.trim()) searchText.value = value
})

watch(
  [kind, tag, query],
  async (_now, _before, onCleanup) => {
    // If the filters change again before this request returns, drop its result.
    const controller = new AbortController()
    onCleanup(() => controller.abort())

    state.value = 'loading'
    try {
      const page = await api.listPosts(
        { kind: kind.value, tag: tag.value, q: query.value, limit: PAGE_SIZE },
        controller.signal,
      )
      posts.value = page.items
      total.value = page.total
      state.value = 'ready'
    } catch (err) {
      if (controller.signal.aborted) return
      error.value = err instanceof ApiError ? err.message : 'Something went wrong loading posts.'
      state.value = 'error'
    }
  },
  { immediate: true },
)

async function loadMore() {
  loadingMore.value = true
  try {
    const page = await api.listPosts({
      kind: kind.value,
      tag: tag.value,
      q: query.value,
      limit: PAGE_SIZE,
      offset: posts.value.length,
    })
    posts.value.push(...page.items)
    total.value = page.total
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Something went wrong loading posts.'
    state.value = 'error'
  } finally {
    loadingMore.value = false
  }
}

onMounted(async () => {
  try {
    tags.value = await api.listTags()
  } catch {
    // The list still works without the tag filter.
  }
})
</script>

<template>
  <div class="container blog">
    <header class="blog__header">
      <h1>Blog</h1>
      <p class="blog__lead">
        What I’ve been learning, written down. Articles are the longer pieces; notes are short
        things I didn’t want to forget.
      </p>
    </header>

    <div class="filters">
      <nav class="filters__kinds" aria-label="Type of post">
        <RouterLink
          v-for="option in kinds"
          :key="option.value"
          class="tag"
          :to="filterLink({ kind: option.value })"
          :aria-current="kind === option.value ? 'true' : undefined"
        >
          {{ option.label }}
        </RouterLink>
      </nav>

      <div class="filters__search">
        <label class="visually-hidden" for="search">Search posts</label>
        <input
          id="search"
          v-model="searchText"
          class="input"
          type="search"
          placeholder="Search posts"
          autocomplete="off"
          @input="onSearchInput"
        />
      </div>
    </div>

    <nav v-if="tags.length" class="filters__tags" aria-label="Topics">
      <RouterLink
        v-for="item in tags"
        :key="item.tag"
        class="tag"
        :to="filterLink({ tag: tag === item.tag ? '' : item.tag })"
        :aria-current="tag === item.tag ? 'true' : undefined"
      >
        {{ item.tag }} <span class="visually-hidden">,</span> {{ item.count }}
      </RouterLink>
    </nav>

    <p v-if="state === 'error'" class="notice notice--error" role="alert">{{ error }}</p>

    <div v-else class="blog__results" :aria-busy="state === 'loading'">
      <p v-if="state === 'loading' && !posts.length" class="muted">Loading posts…</p>

      <div v-else-if="!posts.length" class="notice">
        <template v-if="isFiltered">
          No posts match these filters.
          <RouterLink class="link" :to="{ name: 'blog' }">Show all posts</RouterLink>
        </template>
        <template v-else>Nothing published yet. The first post is on its way.</template>
      </div>

      <template v-else>
        <p class="blog__count muted" aria-live="polite">
          {{ total }} {{ total === 1 ? 'post' : 'posts' }}
          <template v-if="tag"> tagged {{ tag }}</template>
          <template v-if="query"> matching “{{ query }}”</template>
        </p>
        <PostRow v-for="post in posts" :key="post.id" :post="post" />
        <p v-if="posts.length < total" class="blog__more">
          <button class="button" type="button" :disabled="loadingMore" @click="loadMore">
            {{ loadingMore ? 'Loading…' : 'Show more posts' }}
          </button>
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.blog {
  padding-top: clamp(2rem, 6vw, 4rem);
}

.blog__header h1 {
  font-size: var(--step-4);
  font-variation-settings:
    'INFM' 55,
    'BNCE' 0,
    'SPAC' 0;
}

.blog__lead {
  margin-top: 1rem;
  max-width: 36rem;
  font-size: var(--step-1);
  line-height: 1.5;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem 2rem;
  margin-top: 2.5rem;
}

.filters__kinds,
.filters__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.filters__kinds .tag {
  padding: 0.25rem 0.9rem;
  font-size: var(--step-0);
  color: var(--ink);
}

.filters__search {
  flex: 0 1 18rem;
}

.filters__tags {
  margin-top: 1rem;
}

.blog__results {
  margin-top: 2rem;
}

.blog__count {
  font-size: var(--step--1);
  margin-bottom: 0.75rem;
}

.blog__results > :last-child.row,
.blog__results > .row:last-of-type {
  border-bottom: 1.5px dashed var(--rule);
}

.blog__more {
  margin-top: 2rem;
}

@media (max-width: 38rem) {
  .filters__search {
    flex-basis: 100%;
  }
}
</style>
