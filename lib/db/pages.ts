import { sql } from './index'

export interface Page {
  id: string
  title: string
  slug: string
  content: string
  description?: string | null
  status: 'published' | 'draft'
  seoTitle?: string | null
  metaDescription?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreatePageInput {
  title: string
  slug: string
  content: string
  description?: string
  status?: 'published' | 'draft'
  seoTitle?: string
  metaDescription?: string
}

export interface UpdatePageInput {
  title?: string
  slug?: string
  content?: string
  description?: string
  status?: 'published' | 'draft'
  seoTitle?: string
  metaDescription?: string
}

export const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'article',
  'articles',
  'auth',
  'author',
  'category',
  'dashboard',
  'gita',
  'search',
  'write',
  'ai',
  'sitemap',
  'sitemap.xml',
  'robots.txt',
  'favicon.ico',
])

export function normalizeSlug(slug: string): string {
  return slug
    .trim()
    .replace(/^\/+|\/+$/g, '') // strip leading and trailing slashes
    .toLowerCase()
}

export function isReservedSlug(slug: string): boolean {
  const normalized = normalizeSlug(slug)
  const firstSegment = normalized.split('/')[0]
  return RESERVED_SLUGS.has(firstSegment)
}

function mapRow(row: Record<string, unknown>): Page {
  return {
    id: row.id as string,
    title: row.title as string,
    slug: row.slug as string,
    content: (row.content as string) ?? '',
    description: (row.description as string) ?? null,
    status: (row.status as 'published' | 'draft') ?? 'published',
    seoTitle: (row.seo_title as string) ?? null,
    metaDescription: (row.meta_description as string) ?? null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export async function getAllPages(): Promise<Page[]> {
  try {
    const rows = await sql`
      SELECT * FROM pages ORDER BY created_at DESC
    `
    return rows.map(mapRow)
  } catch (e) {
    console.error('getAllPages:', e)
    return []
  }
}

export async function getPublishedPages(): Promise<Page[]> {
  try {
    const rows = await sql`
      SELECT * FROM pages WHERE status = 'published' ORDER BY created_at DESC
    `
    return rows.map(mapRow)
  } catch (e) {
    console.error('getPublishedPages:', e)
    return []
  }
}

export async function getPageById(id: string): Promise<Page | null> {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) return null

    const rows = await sql`
      SELECT * FROM pages WHERE id = ${id} LIMIT 1
    `
    return rows[0] ? mapRow(rows[0]) : null
  } catch (e) {
    console.error('getPageById:', e)
    return null
  }
}

export async function getPageBySlug(rawSlug: string): Promise<Page | null> {
  try {
    const slug = normalizeSlug(rawSlug)
    if (!slug) return null

    const rows = await sql`
      SELECT * FROM pages WHERE slug = ${slug} LIMIT 1
    `
    return rows[0] ? mapRow(rows[0]) : null
  } catch (e) {
    console.error('getPageBySlug:', e)
    return null
  }
}

export async function createPage(input: CreatePageInput): Promise<Page> {
  const slug = normalizeSlug(input.slug)
  if (!slug) {
    throw new Error('Valid route/slug is required')
  }
  if (isReservedSlug(slug)) {
    throw new Error(`The route "${slug}" is reserved for system functions. Please choose another route.`)
  }

  const existing = await getPageBySlug(slug)
  if (existing) {
    throw new Error(`A page with route "${slug}" already exists.`)
  }

  const rows = await sql`
    INSERT INTO pages (
      title,
      slug,
      content,
      description,
      status,
      seo_title,
      meta_description
    ) VALUES (
      ${input.title},
      ${slug},
      ${input.content ?? ''},
      ${input.description ?? null},
      ${input.status ?? 'published'},
      ${input.seoTitle ?? null},
      ${input.metaDescription ?? null}
    )
    RETURNING *
  `
  return mapRow(rows[0])
}

export async function updatePage(id: string, input: UpdatePageInput): Promise<Page> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    throw new Error('Invalid page ID')
  }

  let slugToUpdate = input.slug !== undefined ? normalizeSlug(input.slug) : undefined
  if (slugToUpdate !== undefined) {
    if (!slugToUpdate) throw new Error('Valid route/slug is required')
    if (isReservedSlug(slugToUpdate)) {
      throw new Error(`The route "${slugToUpdate}" is reserved for system functions. Please choose another route.`)
    }
    const existing = await getPageBySlug(slugToUpdate)
    if (existing && existing.id !== id) {
      throw new Error(`A page with route "${slugToUpdate}" already exists.`)
    }
  }

  const rows = await sql`
    UPDATE pages
    SET
      title = COALESCE(${input.title ?? null}, title),
      slug = COALESCE(${slugToUpdate ?? null}, slug),
      content = COALESCE(${input.content ?? null}, content),
      description = COALESCE(${input.description ?? null}, description),
      status = COALESCE(${input.status ?? null}, status),
      seo_title = COALESCE(${input.seoTitle ?? null}, seo_title),
      meta_description = COALESCE(${input.metaDescription ?? null}, meta_description),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `

  if (!rows[0]) throw new Error('Page not found')
  return mapRow(rows[0])
}

export async function deletePage(id: string): Promise<void> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    throw new Error('Invalid page ID')
  }

  const rows = await sql`
    DELETE FROM pages WHERE id = ${id} RETURNING id
  `
  if (!rows[0]) throw new Error('Page not found')
}
