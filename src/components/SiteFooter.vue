<script setup lang="ts">
import { RouterLink } from 'vue-router'

import { profile } from '@/content/profile'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="footer">
    <div class="container footer__row">
      <p>© {{ year }} {{ profile.name }}</p>
      <ul class="footer__links">
        <li><a class="link" href="/api/feed.xml">RSS feed</a></li>
        <li>
          <RouterLink class="link" :to="auth.isSignedIn ? '/admin' : '/admin/login'">
            {{ auth.isSignedIn ? 'Writing desk' : 'Sign in' }}
          </RouterLink>
        </li>
      </ul>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  margin-top: var(--section);
  padding-block: 1.75rem 2.5rem;
  border-top: 1.5px dashed var(--rule);
  font-size: var(--step--1);
  color: var(--graphite);
}

.footer__row,
.footer__links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
}

.footer__row {
  justify-content: space-between;
}
</style>
