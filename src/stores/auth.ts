import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { api, tokenStore } from '@/api/client'
import type { User } from '@/api/types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(tokenStore.get())
  const user = ref<User | null>(null)
  const isSignedIn = computed(() => token.value !== null)

  async function signIn(email: string, password: string) {
    const { access_token } = await api.login(email, password)
    token.value = access_token
    tokenStore.set(access_token)
    user.value = await api.me()
  }

  function signOut() {
    token.value = null
    user.value = null
    tokenStore.set(null)
  }

  /** Confirm a stored token still works. Returns false (and signs out) if not. */
  async function restore(): Promise<boolean> {
    if (!token.value) return false
    if (user.value) return true
    try {
      user.value = await api.me()
      return true
    } catch {
      // A rejected token is cleared by the API client's signed-out handler.
      return token.value !== null
    }
  }

  return { token, user, isSignedIn, signIn, signOut, restore }
})
