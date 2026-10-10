import type {
  LinkInput,
  PostDetail,
  PostInput,
  PostKind,
  PostPage,
  SavedLink,
  TagCount,
  User,
} from './types'

const TOKEN_KEY = 'portfolio.token'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** The sign-in token lives in localStorage so a refresh keeps you signed in. */
export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token: string | null) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      // Storage can be unavailable (private windows); the session then lasts until reload.
    }
  },
}

let onSignedOut: () => void = () => {}

/** Called when the server rejects our token, so the app can show the sign-in page. */
export function setSignedOutHandler(handler: () => void) {
  onSignedOut = handler
}

interface FieldError {
  msg: string
  loc: (string | number)[]
}

/** Turn FastAPI's error body into one readable sentence. */
function describeError(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length) {
    return (detail as FieldError[])
      .map((error) => {
        const field = String(error.loc?.[error.loc.length - 1] ?? '').replace(/_/g, ' ')
        const message = error.msg.replace(/^Value error, /, '')
        return field && field !== 'body' ? `${field}: ${message}` : message
      })
      .join('. ')
  }
  if (status >= 500) return 'The server hit an error. Check the API logs and try again.'
  return `The request failed (${status}).`
}

interface RequestOptions {
  method?: string
  body?: unknown
  query?: Record<string, string | number | undefined | null>
  auth?: boolean
  signal?: AbortSignal
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = false, signal } = options

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const url = params.size ? `${path}?${params}` : path

  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = tokenStore.get()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error
    throw new ApiError("Can't reach the API. Is the Python server running on port 8000?", 0)
  }

  if (response.status === 204) return undefined as T

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload: unknown = isJson ? await response.json().catch(() => null) : null

  if (!response.ok) {
    if (response.status === 401 && auth) onSignedOut()
    // The dev proxy answers 500/502 with no JSON when the Python server is down.
    if (!isJson && response.status >= 500) {
      throw new ApiError("Can't reach the API. Is the Python server running on port 8000?", 0)
    }
    throw new ApiError(describeError(payload, response.status), response.status)
  }
  return payload as T
}

export interface PostFilters {
  kind?: PostKind | ''
  tag?: string
  q?: string
  limit?: number
  offset?: number
}

export const api = {
  // Public
  listPosts: (filters: PostFilters = {}, signal?: AbortSignal) =>
    request<PostPage>('/api/posts', { query: { ...filters }, signal }),
  getPost: (slug: string, signal?: AbortSignal) =>
    request<PostDetail>(`/api/posts/${encodeURIComponent(slug)}`, { signal }),
  listTags: () => request<TagCount[]>('/api/tags'),
  listLinks: (tag?: string, signal?: AbortSignal) =>
    request<SavedLink[]>('/api/links', { query: { tag }, signal }),

  // Sign-in
  login: (email: string, password: string) =>
    request<{ access_token: string }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  me: () => request<User>('/api/auth/me', { auth: true }),

  // Writing desk
  listAllPosts: () => request<PostPage>('/api/admin/posts', { auth: true, query: { limit: 200 } }),
  getAnyPost: (id: number) => request<PostDetail>(`/api/admin/posts/${id}`, { auth: true }),
  createPost: (post: PostInput) =>
    request<PostDetail>('/api/admin/posts', { method: 'POST', body: post, auth: true }),
  updatePost: (id: number, changes: Partial<PostInput>) =>
    request<PostDetail>(`/api/admin/posts/${id}`, { method: 'PATCH', body: changes, auth: true }),
  deletePost: (id: number) =>
    request<void>(`/api/admin/posts/${id}`, { method: 'DELETE', auth: true }),

  createLink: (link: LinkInput) =>
    request<SavedLink>('/api/admin/links', { method: 'POST', body: link, auth: true }),
  updateLink: (id: number, changes: Partial<LinkInput>) =>
    request<SavedLink>(`/api/admin/links/${id}`, { method: 'PATCH', body: changes, auth: true }),
  deleteLink: (id: number) =>
    request<void>(`/api/admin/links/${id}`, { method: 'DELETE', auth: true }),
}
