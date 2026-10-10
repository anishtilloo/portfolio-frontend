<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import { api, ApiError } from '@/api/client'
import type { PostSummary, SavedLink } from '@/api/types'
import { formatDate, parseTags } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const posts = ref<PostSummary[]>([])
const links = ref<SavedLink[]>([])
const state = ref<'loading' | 'ready' | 'error'>('loading')
const error = ref('')

// Reading-list form: used both to save a new article and to edit a saved one.
const emptyForm = () => ({ url: '', title: '', source: '', takeaway: '', tags: '' })
const form = reactive(emptyForm())
const formOpen = ref(false)
const editingId = ref<number | null>(null)
const formError = ref('')
const formBusy = ref(false)
const status = ref('')
const confirmingId = ref<number | null>(null)
const urlField = ref<HTMLInputElement | null>(null)

async function load() {
  try {
    const [postPage, savedLinks] = await Promise.all([api.listAllPosts(), api.listLinks()])
    posts.value = postPage.items
    links.value = savedLinks
    state.value = 'ready'
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return
    error.value = err instanceof ApiError ? err.message : 'Something went wrong.'
    state.value = 'error'
  }
}

onMounted(load)

function signOut() {
  auth.signOut()
  router.push({ name: 'home' })
}

async function openForm(link?: SavedLink) {
  Object.assign(
    form,
    link
      ? {
          url: link.url,
          title: link.title,
          source: link.source,
          takeaway: link.takeaway,
          tags: link.tags.join(', '),
        }
      : emptyForm(),
  )
  editingId.value = link?.id ?? null
  formError.value = ''
  formOpen.value = true
  await nextTick()
  urlField.value?.focus()
}

function closeForm() {
  formOpen.value = false
  editingId.value = null
}

async function saveLink() {
  formError.value = ''
  if (!/^https?:\/\/\S+\.\S+/i.test(form.url.trim())) {
    formError.value = 'Enter the full web address, starting with https://'
    urlField.value?.focus()
    return
  }
  formBusy.value = true
  const input = {
    url: form.url.trim(),
    title: form.title.trim(),
    source: form.source.trim(),
    takeaway: form.takeaway.trim(),
    tags: parseTags(form.tags),
  }
  try {
    if (editingId.value === null) {
      links.value.unshift(await api.createLink(input))
      status.value = 'Article saved'
    } else {
      const updated = await api.updateLink(editingId.value, input)
      links.value = links.value.map((link) => (link.id === updated.id ? updated : link))
      status.value = 'Changes saved'
    }
    closeForm()
  } catch (err) {
    formError.value = err instanceof ApiError ? err.message : 'Could not save the article.'
  } finally {
    formBusy.value = false
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

async function removeLink(id: number) {
  try {
    await api.deleteLink(id)
    links.value = links.value.filter((link) => link.id !== id)
    status.value = 'Article removed'
  } catch (err) {
    status.value = err instanceof ApiError ? err.message : 'Could not remove the article.'
  } finally {
    confirmingId.value = null
  }
}
</script>

<template>
  <div class="container desk">
    <header class="desk__header">
      <div>
        <h1>Writing desk</h1>
        <p v-if="auth.user" class="muted">Signed in as {{ auth.user.email }}</p>
      </div>
      <div class="desk__actions">
        <RouterLink class="button button--primary" :to="{ name: 'post-new' }">
          Write a post
        </RouterLink>
        <button class="button button--quiet" type="button" @click="signOut">Sign out</button>
      </div>
    </header>

    <p v-if="state === 'loading'" class="muted">Loading your posts…</p>
    <p v-else-if="state === 'error'" class="notice notice--error" role="alert">{{ error }}</p>

    <template v-else>
      <section class="desk__section" aria-labelledby="posts-heading">
        <h2 id="posts-heading">Posts</h2>

        <p v-if="!posts.length" class="notice">
          No posts yet.
          <RouterLink class="link" :to="{ name: 'post-new' }">Write the first one</RouterLink>
        </p>

        <div v-else class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Type</th>
                <th scope="col">Status</th>
                <th scope="col">Last edited</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="post in posts" :key="post.id">
                <th scope="row">
                  <RouterLink class="link" :to="{ name: 'post-edit', params: { id: post.id } }">
                    {{ post.title }}
                  </RouterLink>
                </th>
                <td>{{ post.kind === 'note' ? 'Note' : 'Article' }}</td>
                <td>
                  <span :class="['state', { 'state--live': post.published }]">
                    {{ post.published ? 'Published' : 'Draft' }}
                  </span>
                </td>
                <td class="muted">{{ formatDate(post.updated_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="desk__section" aria-labelledby="links-heading">
        <div class="desk__section-head">
          <h2 id="links-heading">Reading list</h2>
          <button v-if="!formOpen" class="button button--small" type="button" @click="openForm()">
            Save an article
          </button>
        </div>

        <form v-if="formOpen" class="link-form" novalidate @submit.prevent="saveLink">
          <h3>{{ editingId === null ? 'Save an article' : 'Edit saved article' }}</h3>
          <div class="field">
            <label for="link-url">Web address</label>
            <input
              id="link-url"
              ref="urlField"
              v-model="form.url"
              class="input"
              type="url"
              placeholder="https://"
              required
            />
          </div>
          <div class="link-form__pair">
            <div class="field">
              <label for="link-title">Title</label>
              <input id="link-title" v-model="form.title" class="input" type="text" required />
            </div>
            <div class="field">
              <label for="link-source">Where it’s from</label>
              <input
                id="link-source"
                v-model="form.source"
                class="input"
                type="text"
                placeholder="PostgreSQL docs"
              />
            </div>
          </div>
          <div class="field">
            <label for="link-takeaway">What you took from it</label>
            <textarea id="link-takeaway" v-model="form.takeaway" class="input" rows="3"></textarea>
          </div>
          <div class="field">
            <label for="link-tags">Tags</label>
            <input
              id="link-tags"
              v-model="form.tags"
              class="input"
              type="text"
              placeholder="postgresql, sql"
            />
            <span class="hint">Separate tags with commas.</span>
          </div>

          <p v-if="formError" class="notice notice--error" role="alert">{{ formError }}</p>

          <div class="link-form__actions">
            <button
              class="button button--primary"
              type="submit"
              :disabled="formBusy || !form.url.trim() || !form.title.trim()"
            >
              {{ formBusy ? 'Saving…' : editingId === null ? 'Save article' : 'Save changes' }}
            </button>
            <button class="button button--quiet" type="button" @click="closeForm">Cancel</button>
          </div>
        </form>

        <p class="visually-hidden" role="status">{{ status }}</p>

        <p v-if="!links.length && !formOpen" class="notice">
          Nothing saved yet. Add an article that taught you something.
        </p>

        <ul v-else class="saved">
          <li v-for="link in links" :key="link.id" class="saved__item">
            <div class="saved__text">
              <a class="link" :href="link.url" target="_blank" rel="noopener noreferrer">
                {{ link.title }}
              </a>
              <span class="muted">
                {{ link.source || hostOf(link.url) }}, saved
                {{ formatDate(link.created_at) }}
              </span>
            </div>
            <div class="saved__actions">
              <template v-if="confirmingId === link.id">
                <button
                  class="button button--small button--danger"
                  type="button"
                  @click="removeLink(link.id)"
                >
                  Yes, remove it
                </button>
                <button
                  class="button button--small button--quiet"
                  type="button"
                  @click="confirmingId = null"
                >
                  Keep it
                </button>
              </template>
              <template v-else>
                <button class="button button--small" type="button" @click="openForm(link)">
                  Edit
                </button>
                <button
                  class="button button--small button--quiet"
                  type="button"
                  @click="confirmingId = link.id"
                >
                  Remove
                </button>
              </template>
            </div>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<style scoped>
.desk {
  padding-top: clamp(2rem, 5vw, 3.5rem);
}

.desk__header,
.desk__section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.desk__header h1 {
  font-size: var(--step-3);
}

.desk__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.desk__section {
  margin-top: 3.5rem;
}

.desk__section h2 {
  font-size: var(--step-2);
}

.desk__section > h2,
.desk__section-head {
  margin-bottom: 1.1rem;
}

.table-wrap {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.table th,
.table td {
  padding: 0.75rem 1rem 0.75rem 0;
  border-top: 1.5px dashed var(--rule);
  vertical-align: baseline;
}

.table thead th {
  border-top: 0;
  font-size: var(--step--1);
  font-weight: 600;
  color: var(--graphite);
}

.table tbody th {
  font-weight: 600;
  min-width: 14rem;
}

.table td {
  white-space: nowrap;
}

.state {
  color: var(--graphite);
}

.state--live {
  color: var(--ink);
  font-weight: 600;
}

.state--live::before {
  content: '';
  display: inline-block;
  width: 0.6em;
  height: 0.6em;
  margin-right: 0.4em;
  border-radius: 50%;
  background: var(--marker);
  border: 1.5px solid var(--ink);
}

.link-form {
  display: grid;
  gap: 1rem;
  max-width: 44rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  border: 1.5px solid var(--rule);
  border-radius: 12px;
  background: var(--sheet);
}

.link-form h3 {
  font-size: var(--step-1);
}

.link-form__pair {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1rem;
}

.link-form__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.saved__item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem 1.5rem;
  padding-block: 0.85rem;
  border-top: 1.5px dashed var(--rule);
}

.saved__text {
  display: grid;
  gap: 0.15rem;
  justify-items: start;
  min-width: 0;
}

.saved__text .muted {
  font-size: var(--step--1);
}

.saved__actions {
  display: flex;
  gap: 0.4rem;
}
</style>
