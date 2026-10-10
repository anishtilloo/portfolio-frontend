export type PostKind = 'article' | 'note'

export interface PostSummary {
  id: number
  kind: PostKind
  title: string
  slug: string
  summary: string
  tags: string[]
  reading_minutes: number
  published: boolean
  published_at: string | null
  updated_at: string
}

export interface PostDetail extends PostSummary {
  body_md: string
  created_at: string
}

export interface PostPage {
  items: PostSummary[]
  total: number
}

export interface PostInput {
  kind: PostKind
  title: string
  slug: string | null
  summary: string
  body_md: string
  tags: string[]
  published: boolean
}

export interface TagCount {
  tag: string
  count: number
}

export interface SavedLink {
  id: number
  url: string
  title: string
  source: string
  takeaway: string
  tags: string[]
  created_at: string
}

export interface LinkInput {
  url: string
  title: string
  source: string
  takeaway: string
  tags: string[]
}

export interface User {
  id: number
  email: string
}
