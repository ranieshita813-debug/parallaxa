/**
 * lib/inngest/functions.ts
 * Yahoo News → FireScrape → Gemini → Neon multi-step pipeline.
 *
 * Duplicate detection — 3 layers (fastest → most thorough):
 *   Layer 1 — source_url exact match   (before scrape — cheapest)
 *   Layer 2 — title exact match        (after generate)
 *   Layer 3 — pgvector cosine distance (after embed)
 *
 * Inngest step rules (enforced throughout):
 *   step.fetch / step.sleep  → top-level handler only  (retryable HTTP / delays)
 *   step.run                 → DB, AI, CPU-bound work   (plain fetch() inside)
 *   step.sendEvent           → top-level handler only
 */

import { inngest } from './client'
import { OpenAI } from 'openai'
import {
  createArticle,
  getArticleBySourceUrl,
  getArticleByTitle,
  searchArticlesByVector,
} from '@/lib/db/articles'
import { getSettings, SystemSettings } from '@/lib/db/settings'
import type { GetFunctionInput } from 'inngest'
import { auth } from '@/auth'

// ─── Config ───────────────────────────────────────────────────────────────────

const FS_BASE = process.env.FIRESCRAPE_BASE_URL ?? 'https://exposer-py-1.onrender.com'
const HF_EMBED_MODEL = process.env.HF_EMBEDDING_MODEL ?? 'models/gemini-embedding-2-preview'

const YAHOO_SOURCES = ['https://www.yahoo.com/news/']
const FALLBACK_URL = 'https://www.yahoo.com/news/articles/law-bondi-says-dems-storm-061908312.html'

/**
 * Cosine-distance threshold for vector duplicate detection.
 * 0.15 = very similar  |  0.20 = similar  |  0.25 = same topic different angle
 */
const VECTOR_DUPLICATE_THRESHOLD = 0.15

function getHfClient(apiKey: string) {
  return new OpenAI({
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: apiKey || 'placeholder',
  })
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ArticleLink { url: string; title: string | null }
export interface ArticleEmbeddingPayload {
  articleId: string
  text: string
  vector: number[] | undefined
  model: string
  dim: number | undefined
}

interface ScrapedPage { url: string; title: string | null; markdown: string; image: string | null }

interface GeneratedArticle {
  title: string
  description: string
  content: string
  category: string
  embedding?: number[]
}

interface FsMeta {
  title?: string
  og_image?: string
  [k: string]: unknown
}
interface FsScrape {
  markdown?: string
  text?: string
  links?: string[]
  metadata?: FsMeta
}
interface FsJob { job_id: string }
interface FsMapStatus { status: string; urls?: string[] }

type PipelineResult =
  | { ok: true; sourceUrl: string; title: string; articleId: string; embeddingPayload: ArticleEmbeddingPayload }
  | { ok: false; sourceUrl: string; stage: string; error: string }

type Step = GetFunctionInput<typeof inngest>['step']

// ─── Utilities ────────────────────────────────────────────────────────────────

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))

function isArticleUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    
    const isYahoo =
      u.hostname === 'www.yahoo.com' &&
      /^\/news\/articles\/[^/]+\.html$/.test(u.pathname)
    
    const isBBC =
      u.hostname === 'www.bbc.com' &&
      /^\/[^/]+\/articles\/[^/]+(?:\.lite)?$/.test(u.pathname)
    
    const isDailyStar =
      u.hostname === 'www.thedailystar.net' &&
      /^\/(?:[^/]+\/)+news\/[^/]+-\d+$/.test(u.pathname)
    
    const isIndianExpress =
      u.hostname === 'indianexpress.com' &&
      /^\/article\/(?:[^/]+\/)+[^/]+-\d+\/?$/.test(u.pathname)
    
    const isScroll =
      u.hostname === 'scroll.in' &&
      /^\/article\/\d+\/[^/]+$/.test(u.pathname)
    
    return isYahoo || isBBC || isDailyStar || isIndianExpress || isScroll
  } catch { return false }
}

async function fsWakeUp(step: Step): Promise<void> {
  try {
    const r = await step.fetch('wake-firescrape', `${FS_BASE}/health`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
  } catch (e) { console.warn(`[wake] non-fatal: ${errMsg(e)}`) }
}

// ─── Plain-fetch helpers (safe inside step.run) ───────────────────────────────

async function discoverLinksPlain(limit: number): Promise<ArticleLink[]> {
  const seen = new Set<string>()
  const out: ArticleLink[] = []

  const add = (url: string, title: string | null = null) => {
    const clean = url.split('?')[0].split('#')[0]
    if (!seen.has(clean) && isArticleUrl(clean)) {
      seen.add(clean)
      out.push({ url: clean, title })
    }
  }

  for (let i = 0; i < YAHOO_SOURCES.length && out.length < limit; i++) {
    try {
      const r = await fetch(`${FS_BASE}/v1/map`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: YAHOO_SOURCES[i],
          include_sitemap: false,
          max_pages: 30,
          same_domain: true,
        }),
        signal: AbortSignal.timeout(65_000),
      })
      if (!r.ok) throw new Error(`/v1/map HTTP ${r.status}`)
      const data = (await r.json()) as FsJob | FsMapStatus
      if ('urls' in data && Array.isArray(data.urls))
        data.urls.filter((u): u is string => typeof u === 'string').forEach(u => add(u))
    } catch (e) { console.warn(`[discover] map[${i}]: ${errMsg(e)}`) }
  }

  return out.slice(0, limit)
}

async function scrape(link: ArticleLink): Promise<ScrapedPage> {
  try {
    const r = await fetch(`${FS_BASE}/v1/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: link.url,
        formats: ['markdown', 'metadata'],
        only_main_content: true,
        timeout: 30_000,
      }),
      signal: AbortSignal.timeout(45_000),
    })
    if (r.ok) {
      const res = (await r.json()) as FsScrape
      const md = (res.markdown ?? res.text ?? '').trim()
      if (md.length >= 100) {
        const meta = res.metadata ?? {}
        return {
          url: link.url,
          title: (meta.title as string) ?? link.title ?? null,
          markdown: md.slice(0, 5_000),
          image: typeof meta.og_image === 'string' ? meta.og_image : null,
        }
      }
    }
  } catch (e) {
    console.warn(`[scrape] FireScrape endpoint unavailable: ${errMsg(e)}, attempting direct fetch fallback.`)
  }

  // Fallback: Direct HTML fetch + Turndown conversion
  const response = await fetch(link.url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NewsCrawler/1.0' },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`Direct fetch HTTP ${response.status}`)
  const html = await response.text()

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const rawTitle = titleMatch ? titleMatch[1].replace(/\s*-\s*Yahoo.*$/i, '').trim() : link.title ?? 'News Article'

  const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                       html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
  const ogImage = ogImageMatch ? ogImageMatch[1] : null

  const TurndownService = (await import('turndown')).default
  const td = new TurndownService({ headingStyle: 'atx' })
  const cleanHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')

  const md = td.turndown(cleanHtml).slice(0, 8_000)
  if (md.length < 50) throw new Error(`Insufficient content from fetch (${md.length} chars)`)

  return {
    url: link.url,
    title: rawTitle,
    markdown: md,
    image: ogImage,
  }
}

async function generate(page: ScrapedPage, settings: SystemSettings): Promise<GeneratedArticle> {
  const apiKey = settings.ai_api_key || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.HF_API_KEY
  if (apiKey) {
    try {
      const hf = getHfClient(apiKey)
      const res = await hf.chat.completions.create({
        model: settings.ai_model || 'gemini-1.5-flash',
        stream: false,
        max_tokens: settings.ai_max_tokens || 2500,
        temperature: settings.ai_temperature || 0.6,
        messages: [
          { role: 'system', content: settings.ai_system_prompt },
          { role: 'user', content: `Source: ${page.url}\n\n${page.markdown}` },
        ],
      })
      const raw = res.choices[0]?.message?.content ?? ''
      if (raw.trim()) {
        const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
        const p = JSON.parse(clean)
        const title = String(p.title ?? page.title ?? 'Untitled').trim()
        const content = String(p.content ?? '').trim()
        if (title && content) {
          return {
            title,
            description: String(p.description ?? '').trim(),
            content,
            category: String(p.category ?? 'World').trim(),
          }
        }
      }
    } catch (e) {
      console.warn(`[generate] AI model generation failed: ${errMsg(e)}, using structured summary fallback.`)
    }
  }

  // Fallback: build structured news article directly from page
  const title = page.title || 'Breaking News Story'
  const paragraphs = page.markdown
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 30 && !p.startsWith('#') && !p.startsWith('[') && !p.startsWith('!'))
  const description = paragraphs[0]?.slice(0, 200) || title
  const content = paragraphs.slice(0, 6).join('\n\n') || page.markdown.slice(0, 1000)

  return {
    title,
    description,
    content,
    category: 'World',
  }
}

async function embed(text: string, settings: SystemSettings): Promise<number[] | undefined> {
  try {
    const apiKey = settings.ai_api_key || process.env.HF_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY
    if (!apiKey) return undefined
    const hf = getHfClient(apiKey)
    const r = await hf.embeddings.create({
      model: process.env.HF_EMBEDDING_MODEL ?? 'text-embedding-004',
      input: text
    })
    const v = r.data[0]?.embedding
    if (!Array.isArray(v) || !v.length) throw new Error('No vector data')
    return v as number[]
  } catch (e) { console.warn(`[embed] non-fatal: ${errMsg(e)}`); return undefined }
}

function buildEmbedText(gen: GeneratedArticle, page: ScrapedPage): string {
  return [
    'Represent this document for retrieval:',
    `Title: ${gen.title}`,
    `Category: ${gen.category}`,
    `Summary: ${gen.description}`,
    `Body: ${gen.content.slice(0, 1_200).trimEnd()}`,
    `Source: ${page.url}`,
  ].join('\n')
}

async function saveArticle(
  gen: GeneratedArticle,
  page: ScrapedPage,
  authorName: string,
  userId?: string,
): Promise<string> {
  const readTime = Math.max(1, Math.ceil(gen.content.split(/\s+/).length / 200))
  const saved = await createArticle({
    title: gen.title,
    description: gen.description,
    content: gen.content,
    category: gen.category,
    author: authorName,
    date: new Date(),
    image: page.image ?? '',
    readTime,
    featured: false,
    breaking: false,
    trending: false,
    ogImage: page.image ?? undefined,
    twitterCard: 'summary_large_image',
    visibility: 'public',
    status: 'published',
    noIndex: false,
    allowComments: true,
    showInRss: true,
    ampEnabled: false,
    sourceUrl: page.url,
    embedding: gen.embedding,
    userId,
  })

  if (!saved?.id) throw new Error('DB insert returned no id')
  return saved.id
}

// ─── Inngest function ─────────────────────────────────────────────────────────

export const newsPipelineFunction = inngest.createFunction(
  {
    id: 'news-pipeline-o00r0',
    name: 'Yahoo News Pipeline',
    retries: 3,
    concurrency: { limit: 1 },
    triggers: [{ event: 'news/pipeline.requested' }],
  },

  async ({ event, step, logger }) => {
    const turl = event.data.tUrl
    const session = await auth()
    const userId = session?.user?.id ?? '51b08c19-b0fe-4674-b750-7cacb3a21b0f'
    const authorName = session?.user?.name ?? 'Admin'

    // ── Step 1: Load Settings ──────────────────────────────────────────────
    const settings = await step.run('load-settings', async () => {
      return await getSettings()
    })

    // ── Step 2: Wake FireScrape Server ──────────────────────────────────────
    await fsWakeUp(step)

    // ── Step 3: Discover Links ──────────────────────────────────────────────
    const links = await step.run('discover-links', async () => {
      if (turl && turl !== false) {
        return [{ url: turl, title: null }]
      }
      const found = await discoverLinksPlain(30)
      return found.length > 0 ? found : [{ url: FALLBACK_URL, title: null }]
    })

    // ── Step 4: Summarize Discovery ────────────────────────────────────────
    await step.run('discovery-summary', async () => ({
      total: links.length,
      usedFallback: links.length === 1 && links[0].url === FALLBACK_URL,
      sources: YAHOO_SOURCES,
      links: links.map(l => ({ url: l.url, title: l.title })),
    }))

    // ── Steps 5–N: Multi-Step Per-Article Ingestion Progression ───────────
    const results: PipelineResult[] = []

    for (let i = 0; i < links.length; i++) {
      const link = links[i]
      const tag = `[${i + 1}/${links.length}]`

      // Step 5a: URL Duplicate Check
      const isUrlDuplicate = await step.run(`check-url-dup-${i}`, async () => {
        const byUrl = await getArticleBySourceUrl(link.url)
        return byUrl ? { isDup: true, title: byUrl.title, id: byUrl.id } : { isDup: false }
      })

      if (isUrlDuplicate.isDup) {
        logger.info(`[pipeline] ${tag} ⏭ duplicate (url) id:${isUrlDuplicate.id} | ${link.url}`)
        results.push({ ok: false, sourceUrl: link.url, stage: 'duplicate', error: `URL exists: "${isUrlDuplicate.title}"` })
        continue
      }

      // Step 5b: Scrape Article Content
      let page: ScrapedPage
      try {
        page = await step.run(`scrape-article-${i}`, async () => {
          return await scrape(link)
        })
      } catch (e) {
        logger.error(`[pipeline] ${tag} ✗ stage=scrape | ${link.url} | ${errMsg(e)}`)
        results.push({ ok: false, sourceUrl: link.url, stage: 'scrape', error: errMsg(e) })
        continue
      }

      // Step 5c: AI Generate Article Content
      let gen: GeneratedArticle
      try {
        gen = await step.run(`generate-article-${i}`, async () => {
          return await generate(page, settings)
        })
      } catch (e) {
        logger.error(`[pipeline] ${tag} ✗ stage=generate | ${link.url} | ${errMsg(e)}`)
        results.push({ ok: false, sourceUrl: link.url, stage: 'generate', error: errMsg(e) })
        continue
      }

      // Step 5d: Title Duplicate Check
      const isTitleDuplicate = await step.run(`check-title-dup-${i}`, async () => {
        const byTitle = await getArticleByTitle(gen.title)
        return byTitle ? { isDup: true, title: byTitle.title, id: byTitle.id } : { isDup: false }
      })

      if (isTitleDuplicate.isDup) {
        logger.info(`[pipeline] ${tag} ⏭ duplicate (title) id:${isTitleDuplicate.id} | "${gen.title}"`)
        results.push({ ok: false, sourceUrl: link.url, stage: 'duplicate', error: `Title exists: "${isTitleDuplicate.title}"` })
        continue
      }

      // Step 5e: Vector Embedding Generation
      const embedText = buildEmbedText(gen, page)
      const embedVector = await step.run(`embed-article-${i}`, async () => {
        return await embed(embedText, settings)
      })

      // Step 5f: Vector Similarity Duplicate Check
      if (embedVector && embedVector.length > 0) {
        const vecDupResult = await step.run(`check-vector-dup-${i}`, async () => {
          const similar = await searchArticlesByVector(embedVector, 1, VECTOR_DUPLICATE_THRESHOLD)
          return similar.length > 0 ? { isDup: true, title: similar[0].title, id: similar[0].id } : { isDup: false }
        })
        if (vecDupResult.isDup) {
          logger.info(`[pipeline] ${tag} ⏭ duplicate (vector) id:${vecDupResult.id} | "${vecDupResult.title}"`)
          results.push({ ok: false, sourceUrl: link.url, stage: 'duplicate', error: `Too similar to: "${vecDupResult.title}"` })
          continue
        }
      }

      // Step 5g: Save Article to Neon Database
      gen.embedding = embedVector
      let articleId: string
      try {
        articleId = await step.run(`save-article-${i}`, async () => {
          return await saveArticle(gen, page, authorName, userId)
        })
      } catch (e) {
        logger.error(`[pipeline] ${tag} ✗ stage=db | ${link.url} | ${errMsg(e)}`)
        results.push({ ok: false, sourceUrl: link.url, stage: 'db', error: errMsg(e) })
        continue
      }

      const embeddingPayload: ArticleEmbeddingPayload = {
        articleId,
        text: embedText,
        vector: embedVector,
        model: HF_EMBED_MODEL,
        dim: embedVector?.length,
      }

      const articleResult: PipelineResult = { ok: true, sourceUrl: link.url, title: gen.title, articleId, embeddingPayload }
      results.push(articleResult)

      // Step 5h: Dispatch Completion Events
      await step.sendEvent(`article-saved-${i}`, {
        name: 'news/article.processed',
        data: {
          articleId,
          title: gen.title,
          sourceUrl: link.url,
          embeddingPayload,
        },
      })

      await step.sendEvent(`ptp-requested-${i}`, {
        name: 'news/ptp.requested',
        data: {
          articleId,
          userId,
          ptpConfig: event.data.ptp_config,
        },
      })
    }

    // ── Final Summary ───────────────────────────────────────────────────────
    const ok = results.filter((r): r is Extract<PipelineResult, { ok: true }> => r.ok)
    const failed = results.filter((r): r is Extract<PipelineResult, { ok: false }> => !r.ok)
    const duplicates = failed.filter(r => r.stage === 'duplicate')
    const errors = failed.filter(r => r.stage !== 'duplicate')

    const byStage = failed.reduce<Record<string, number>>((acc, r) => {
      acc[r.stage] = (acc[r.stage] ?? 0) + 1
      return acc
    }, {})

    logger.info(
      `[pipeline] done — saved:${ok.length} skipped(dup):${duplicates.length} failed:${errors.length} | byStage:${JSON.stringify(byStage)}`
    )

    return {
      total: links.length,
      saved: ok.length,
      skipped: duplicates.length,
      failed: errors.length,
      failuresByStage: byStage,
      articles: results,
    }
  },
)
