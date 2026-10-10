<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ApiError } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  busy.value = true
  try {
    await auth.signIn(email.value.trim(), password.value)
    // Only follow `next` if it points inside this site.
    const next = typeof route.query.next === 'string' ? route.query.next : ''
    await router.replace(next.startsWith('/') && !next.startsWith('//') ? next : { name: 'desk' })
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Sign-in failed. Try again.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="container login">
    <h1>Sign in to write</h1>
    <p class="muted">This is the door to the writing desk. Readers don’t need an account.</p>

    <form class="login__form" novalidate @submit.prevent="submit">
      <div class="field">
        <label for="email">Email</label>
        <input
          id="email"
          v-model="email"
          class="input"
          type="email"
          autocomplete="username"
          required
          autofocus
        />
      </div>
      <div class="field">
        <label for="password">Password</label>
        <input
          id="password"
          v-model="password"
          class="input"
          type="password"
          autocomplete="current-password"
          required
        />
      </div>

      <p v-if="error" class="notice notice--error" role="alert">{{ error }}</p>

      <button class="button button--primary" type="submit" :disabled="busy || !email || !password">
        {{ busy ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login {
  max-width: 28rem;
  margin-inline: auto;
  padding-top: clamp(3rem, 9vw, 6rem);
}

.login h1 {
  font-size: var(--step-3);
  margin-bottom: 0.5rem;
}

.login__form {
  display: grid;
  gap: 1.1rem;
  margin-top: 2rem;
  justify-items: start;
}

.login__form .field,
.login__form .notice {
  width: 100%;
}
</style>
