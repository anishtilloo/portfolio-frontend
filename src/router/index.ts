import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import HomeView from '@/views/HomeView.vue'

const SITE = 'Anish Tilloo'

declare module 'vue-router' {
  interface RouteMeta {
    /** Tab title. Pages that load their own title (a blog post) set it themselves. */
    title?: string
    requiresAuth?: boolean
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    {
      path: '/blog',
      name: 'blog',
      component: () => import('@/views/BlogListView.vue'),
      meta: { title: 'Blog' },
    },
    {
      path: '/blog/:slug',
      name: 'post',
      component: () => import('@/views/BlogPostView.vue'),
      props: true,
    },
    {
      path: '/reading',
      name: 'reading',
      component: () => import('@/views/ReadingView.vue'),
      meta: { title: 'Reading list' },
    },
    {
      path: '/admin/login',
      name: 'login',
      component: () => import('@/views/admin/LoginView.vue'),
      meta: { title: 'Sign in' },
    },
    {
      path: '/admin',
      name: 'desk',
      component: () => import('@/views/admin/DeskView.vue'),
      meta: { title: 'Writing desk', requiresAuth: true },
    },
    {
      path: '/admin/posts/new',
      name: 'post-new',
      component: () => import('@/views/admin/PostEditorView.vue'),
      meta: { title: 'New post', requiresAuth: true },
    },
    {
      path: '/admin/posts/:id(\\d+)',
      name: 'post-edit',
      component: () => import('@/views/admin/PostEditorView.vue'),
      props: (route) => ({ id: Number(route.params.id) }),
      meta: { title: 'Edit post', requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: 'Page not found' },
    },
  ],
  scrollBehavior(to, from, saved) {
    if (saved) return saved
    if (to.hash) return { el: to.hash }
    // Changing a filter on the blog list should not jump the page.
    if (to.path === from.path) return false
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true
  const auth = useAuthStore()
  if (auth.isSignedIn && (await auth.restore())) return true
  return { name: 'login', query: { next: to.fullPath } }
})

router.afterEach((to) => {
  if (to.name === 'post') return // BlogPostView sets its own title once the post loads
  document.title = to.meta.title ? `${to.meta.title} | ${SITE}` : SITE
})

export function pageTitle(title: string): string {
  return `${title} | ${SITE}`
}
