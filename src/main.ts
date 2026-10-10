import '@fontsource-variable/shantell-sans/full.css'
import '@fontsource-variable/schibsted-grotesk/wght.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import './styles/tokens.css'
import './styles/base.css'
import './styles/prose.css'

import { createPinia } from 'pinia'
import { createApp } from 'vue'

import { setSignedOutHandler } from './api/client'
import App from './App.vue'
import { router } from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// If the server says our token is no longer valid, go back to the sign-in page.
setSignedOutHandler(() => {
  useAuthStore().signOut()
  const current = router.currentRoute.value
  if (current.meta.requiresAuth) {
    router.replace({ name: 'login', query: { next: current.fullPath } })
  }
})

app.mount('#app')
