<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import { api, ApiError } from '@/api/client'
import type { PostDetail, PostInput, PostKind } from '@/api/types'
import { parseTags, slugify } from '@/lib/format'
import { renderMarkdown } from '@/lib/markdown'

const props = defineProps<{ id?: number }>()
const router = useRouter()

const blank = () => ({
  kind: 'article' as PostKind,
  title: '',
  slug: '',
  summary: '',
  tags: '',
  body: '',
})

const form = reactive(blank())
const saved = ref<PostDetail | null>(null) // the post as the server last returned it
const state = ref<'loading' | 'ready' | 'missing' | 'error'>(props.id ? 'loading' : 'ready')
const loadError = ref('')
const busy = ref(false)
const error = ref('')
const status = ref('')
const confirmingDelete = ref(false)
let snapshot = JSON.stringify(form)

const isPublished = computed(() => saved.value?.published ?? false)
const isDirty = ref(false)
watch(form, () => (isDirty.value = JSON.stringify(form) !== snapshot), { deep: true })

const preview = computed(() => renderMarkdown(form.body))
const wordCount = computed(() => form.body.match(/\w+/g)?.length ?? 0)
const address = computed(() => form.slug.trim() || slugify(form.title || 'post'))

function fill(post: PostDetail) {
  saved.value = post
  Object.assign(form, {
    kind: post.kind,
    title: post.title,
    slug: post.slug,
    summary: post.summary,
    tags: post.tags.join(', '),
    body: post.body_md,
  })
  snapshot = JSON.stringify(form)
  isDirty.value = false
}

watch(
  () => props.id,
  async (id) => {
    confirmingDelete.value = false
    if (!id) {
      saved.value = null
      Object.assign(form, blank())
      snapshot = JSON.stringify(form)
      isDirty.value = false
      state.value = 'ready'
      return
    }
    if (saved.value?.id === id) return // just created here; nothing to fetch
    state.value = 'loading'
    try {
      fill(await api.getAnyPost(id))
      state.value = 'ready'
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) state.value = 'missing'
      else if (!(err instanceof ApiError && err.status === 401)) {
        loadError.value = err instanceof ApiError ? err.message : 'Something went wrong.'
        state.value = 'error'
      }
    }
  },
  { immediate: true },
)

async function save(publish: boolean) {
  if (busy.value) return
  error.value = ''
  status.value = ''
  if (!form.title.trim()) {
    error.value = 'Give the post a title before saving.'
    return
  }

  const wasPublished = isPublished.value
  const input: PostInput = {
    kind: form.kind,
    title: form.title.trim(),
    slug: form.slug.trim() || null,
    summary: form.summary.trim(),
    body_md: form.body,
    tags: parseTags(form.tags),
    published: publish,
  }

  busy.value = true
  try {
    if (saved.value) {
      fill(await api.updatePost(saved.value.id, input))
    } else {
      const created = await api.createPost(input)
      fill(created)
      await router.replace({ name: 'post-edit', params: { id: created.id } })
    }
    if (publish && !wasPublished) status.value = 'Published'
    else if (!publish && wasPublished) status.value = 'Unpublished. It’s a draft again.'
    else status.value = publish ? 'Changes saved' : 'Draft saved'
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not save the post.'
  } finally {
    busy.value = false
  }
}

async function remove() {
  if (!saved.value) return
  busy.value = true
  try {
    await api.deletePost(saved.value.id)
    isDirty.value = false
    await router.replace({ name: 'desk' })
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Could not delete the post.'
    busy.value = false
  }
}

// Ctrl/Cmd+S saves without changing whether the post is published.
function onKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    if (state.value === 'ready') save(isPublished.value)
  }
}

function warnBeforeLeaving(event: BeforeUnloadEvent) {
  if (isDirty.value) event.preventDefault()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('beforeunload', warnBeforeLeaving)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('beforeunload', warnBeforeLeaving)
})
</script>

<template>
  <div class="container editor">
    <p class="editor__back">
      <RouterLink class="link" :to="{ name: 'desk' }">Writing desk</RouterLink>
    </p>

    <p v-if="state === 'loading'" class="muted">Loading the post…</p>
    <p v-else-if="state === 'missing'" class="notice">
      This post no longer exists. It may have been deleted in another tab.
    </p>
    <p v-else-if="state === 'error'" class="notice notice--error" role="alert">{{ loadError }}</p>

    <form v-else class="editor__form" novalidate @submit.prevent="save(isPublished)">
      <header class="editor__header">
        <h1>{{ saved ? 'Edit post' : 'New post' }}</h1>
        <p class="muted">
          {{ isPublished ? 'Published' : 'Draft' }}<template v-if="isDirty">, unsaved changes</template>
        </p>
      </header>

      <div class="field">
        <label for="title">Title</label>
        <input
          id="title"
          v-model="form.title"
          class="input editor__title"
          type="text"
          maxlength="200"
          required
        />
      </div>

      <div class="editor__meta">
        <fieldset class="field editor__kind">
          <legend class="label">Type</legend>
          <label><input v-model="form.kind" type="radio" value="article" /> Article</label>
          <label><input v-model="form.kind" type="radio" value="note" /> Note</label>
        </fieldset>

        <div class="field">
          <label for="tags">Tags</label>
          <input
            id="tags"
            v-model="form.tags"
            class="input"
            type="text"
            placeholder="vue, typescript"
          />
          <span class="hint">Separate tags with commas.</span>
        </div>

        <div class="field">
          <label for="slug">Address</label>
          <input
            id="slug"
            v-model="form.slug"
            class="input"
            type="text"
            :placeholder="slugify(form.title || 'post')"
            aria-describedby="slug-hint"
            autocapitalize="off"
            spellcheck="false"
          />
          <span id="slug-hint" class="hint">
            /blog/{{ address }}. Leave empty to build it from the title.
          </span>
        </div>
      </div>

      <div class="field">
        <label for="summary">Summary</label>
        <textarea
          id="summary"
          v-model="form.summary"
          class="input"
          rows="2"
          maxlength="500"
          aria-describedby="summary-hint"
        ></textarea>
        <span id="summary-hint" class="hint">
          One or two sentences. Shown in the post list and the RSS feed.
        </span>
      </div>

      <div class="editor__panes">
        <div class="field">
          <label for="body">Post, in Markdown</label>
          <textarea
            id="body"
            v-model="form.body"
            class="input editor__body"
            rows="22"
            spellcheck="true"
            placeholder="## What I learned&#10;&#10;Write here. Use ```ts fences for code."
          ></textarea>
          <span class="hint">{{ wordCount }} {{ wordCount === 1 ? 'word' : 'words' }}</span>
        </div>

        <section class="editor__preview" aria-labelledby="preview-heading">
          <h2 id="preview-heading" class="label">Preview</h2>
          <div v-if="form.body.trim()" class="prose" v-html="preview"></div>
          <p v-else class="muted">The formatted post appears here as you type.</p>
        </section>
      </div>

      <p v-if="error" class="notice notice--error" role="alert">{{ error }}</p>

      <footer class="editor__actions">
        <template v-if="isPublished">
          <button class="button button--primary" type="submit" :disabled="busy">Save changes</button>
          <button class="button" type="button" :disabled="busy" @click="save(false)">
            Unpublish
          </button>
        </template>
        <template v-else>
          <button class="button button--primary" type="button" :disabled="busy" @click="save(true)">
            Publish
          </button>
          <button class="button" type="submit" :disabled="busy">Save draft</button>
        </template>

        <p class="editor__status" role="status">
          <template v-if="status">
            {{ status }}
            <RouterLink
              v-if="saved?.published"
              class="link"
              :to="{ name: 'post', params: { slug: saved.slug } }"
            >
              View post
            </RouterLink>
          </template>
        </p>

        <div v-if="saved" class="editor__delete">
          <template v-if="confirmingDelete">
            <span>Delete this post for good?</span>
            <button
              class="button button--small button--danger"
              type="button"
              :disabled="busy"
              @click="remove"
            >
              Yes, delete it
            </button>
            <button
              class="button button--small button--quiet"
              type="button"
              @click="confirmingDelete = false"
            >
              Keep it
            </button>
          </template>
          <button
            v-else
            class="button button--small button--quiet"
            type="button"
            @click="confirmingDelete = true"
          >
            Delete post
          </button>
        </div>
      </footer>
    </form>
  </div>
</template>

<style scoped>
.editor {
  --page: 86rem;
  padding-top: clamp(1.5rem, 4vw, 2.5rem);
}

.editor__back {
  font-size: var(--step--1);
  margin-bottom: 1.5rem;
}

.editor__form {
  display: grid;
  gap: 1.35rem;
}

.editor__header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 1.25rem;
}

.editor__header h1 {
  font-size: var(--step-3);
}

.editor__title {
  font-family: var(--font-display);
  font-size: var(--step-2);
  font-weight: 650;
}

.editor__meta {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(0, 1.3fr);
  gap: 1.35rem 2rem;
  align-items: start;
}

.editor__kind {
  white-space: nowrap;
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}

.editor__kind legend {
  padding: 0;
  margin-bottom: 0.35rem;
}

.editor__kind label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-right: 1rem;
  padding-block: 0.55rem;
  cursor: pointer;
}

.editor__kind input {
  width: 1.1rem;
  height: 1.1rem;
  accent-color: var(--ink);
}

.editor__panes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2rem;
  align-items: start;
}

.editor__body {
  font-family: var(--font-code);
  font-size: 0.95rem;
  min-height: 24rem;
}

.editor__preview {
  min-width: 0;
  padding: 1.25rem 1.5rem 1.75rem;
  border: 1.5px dashed var(--rule);
  border-radius: 12px;
}

.editor__preview .label {
  margin-bottom: 1rem;
  font-family: var(--font-body);
  font-size: var(--step--1);
  font-weight: 600;
  letter-spacing: 0;
}

.editor__actions {
  position: sticky;
  bottom: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  padding-block: 0.9rem;
  border-top: 1.5px solid var(--rule);
  background: var(--paper);
}

.editor__status {
  display: flex;
  gap: 0.75rem;
  margin-left: 0.5rem;
  font-weight: 600;
}

.editor__delete {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
  font-size: var(--step--1);
}

@media (max-width: 60rem) {
  .editor__meta,
  .editor__panes {
    grid-template-columns: 1fr;
  }
}
</style>
