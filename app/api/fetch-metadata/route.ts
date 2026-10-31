import { NextRequest, NextResponse } from 'next/server'

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

function extractMeta(html: string, property: string, name?: string): string | null {
  const propRegex = new RegExp(`<meta[^>]+(?:property|name)=["'](?:${property}${name ? `|${name}` : ''})["'][^>]+content=["']([^"']*)["']`, 'i')
  const match = html.match(propRegex)
  if (match && match[1]) return decodeHtmlEntities(match[1].trim())

  const contentFirstRegex = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["'](?:${property}${name ? `|${name}` : ''})["']`, 'i')
  const match2 = html.match(contentFirstRegex)
  if (match2 && match2[1]) return decodeHtmlEntities(match2[1].trim())

  return null
}

interface ExtractedMetadata {
  title: string
  siteName: string
  author: string
  year: string
  description: string
}

function parseJsonLd(html: string): Partial<ExtractedMetadata> {
  const result: Partial<ExtractedMetadata> = {}
  const scriptRegex = /<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi

  let match: RegExpExecArray | null
  const candidates: any[] = []

  while ((match = scriptRegex.exec(html)) !== null) {
    const rawContent = match[1]?.trim()
    if (!rawContent) continue
    try {
      const parsed = JSON.parse(rawContent)
      if (Array.isArray(parsed)) {
        candidates.push(...parsed)
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed['@graph'])) {
          candidates.push(...parsed['@graph'])
        } else {
          candidates.push(parsed)
        }
      }
    } catch {
      // ignore malformed JSON-LD scripts
    }
  }

  for (const item of candidates) {
    if (!item || typeof item !== 'object') continue

    // Title / Headline
    if (!result.title) {
      if (typeof item.name === 'string' && item.name.trim() && item['@type'] !== 'Organization') {
        result.title = decodeHtmlEntities(item.name.trim())
      } else if (typeof item.headline === 'string' && item.headline.trim()) {
        result.title = decodeHtmlEntities(item.headline.trim())
      }
    }

    // Site Name / Publisher
    if (!result.siteName) {
      const pub = item.publisher || (item['@type'] === 'Organization' || item['@type'] === 'NewsMediaOrganization' ? item : null)
      if (typeof pub === 'string') {
        result.siteName = decodeHtmlEntities(pub.trim())
      } else if (pub && typeof pub.name === 'string') {
        result.siteName = decodeHtmlEntities(pub.name.trim())
      } else if (item.isPartOf && typeof item.isPartOf.name === 'string') {
        result.siteName = decodeHtmlEntities(item.isPartOf.name.trim())
      }
    }

    // Author
    if (!result.author) {
      const auth = item.author || item.creator
      if (typeof auth === 'string') {
        result.author = decodeHtmlEntities(auth.trim())
      } else if (Array.isArray(auth) && auth.length > 0) {
        const first = auth[0]
        if (typeof first === 'string') result.author = decodeHtmlEntities(first.trim())
        else if (first && typeof first.name === 'string') result.author = decodeHtmlEntities(first.name.trim())
      } else if (auth && typeof auth.name === 'string') {
        result.author = decodeHtmlEntities(auth.name.trim())
      }
    }

    // Description
    if (!result.description && typeof item.description === 'string' && item.description.trim()) {
      result.description = decodeHtmlEntities(item.description.trim())
    }

    // Published Date / Year
    if (!result.year) {
      const dateVal = item.datePublished || item.dateCreated || item.dateModified
      if (typeof dateVal === 'string') {
        const parsedYear = new Date(dateVal).getFullYear()
        if (!isNaN(parsedYear) && parsedYear > 1970 && parsedYear <= new Date().getFullYear() + 1) {
          result.year = parsedYear.toString()
        }
      }
    }
  }

  return result
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const rawUrl = body.url
    if (!rawUrl || typeof rawUrl !== 'string') {
      return NextResponse.json({ error: 'Valid URL is required' }, { status: 400 })
    }

    let urlObj: URL
    try {
      urlObj = new URL(rawUrl.startsWith('http://') || rawUrl.startsWith('https://') ? rawUrl : `https://${rawUrl}`)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    const targetUrl = urlObj.toString()

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 9000)

    let html = ''
    try {
      const res = await fetch(targetUrl, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
        },
      })
      clearTimeout(timeoutId)

      if (res.ok) {
        html = await res.text()
      }
    } catch {
      clearTimeout(timeoutId)
    }

    // Extract from structured JSON-LD first
    const jsonLdData = html ? parseJsonLd(html) : {}

    // 1. Title
    let title =
      jsonLdData.title ||
      extractMeta(html, 'og:title', 'twitter:title') ||
      extractMeta(html, 'title') ||
      ''

    if (!title && html) {
      const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      if (titleTagMatch && titleTagMatch[1]) {
        title = decodeHtmlEntities(titleTagMatch[1].trim())
      }
    }

    if (!title) {
      title = urlObj.hostname.replace(/^www\./, '')
    }

    // 2. Site Name
    let siteName =
      jsonLdData.siteName ||
      extractMeta(html, 'og:site_name', 'application-name') ||
      urlObj.hostname.replace(/^www\./, '')

    // 3. Author
    let author =
      jsonLdData.author ||
      extractMeta(html, 'author', 'article:author') ||
      extractMeta(html, 'twitter:creator') ||
      extractMeta(html, 'og:article:author') ||
      siteName ||
      ''

    // 4. Date / Year
    let year = jsonLdData.year || ''
    if (!year && html) {
      const dateStr =
        extractMeta(html, 'article:published_time', 'datePublished') ||
        extractMeta(html, 'og:published_time') ||
        extractMeta(html, 'date', 'pubdate')

      if (dateStr) {
        const parsedYear = new Date(dateStr).getFullYear()
        if (!isNaN(parsedYear) && parsedYear > 1970 && parsedYear <= new Date().getFullYear() + 1) {
          year = parsedYear.toString()
        }
      }
    }

    if (!year && html) {
      const copyrightMatch = html.match(/(?:©|&copy;|Copyright)\s*(?:20\d\d[-–])?(20\d\d)/i)
      if (copyrightMatch && copyrightMatch[1]) {
        year = copyrightMatch[1]
      } else {
        year = new Date().getFullYear().toString()
      }
    } else if (!year) {
      year = new Date().getFullYear().toString()
    }

    // 5. Description
    const description =
      jsonLdData.description ||
      extractMeta(html, 'og:description', 'twitter:description') ||
      extractMeta(html, 'description') ||
      ''

    return NextResponse.json({
      url: targetUrl,
      title,
      author,
      year,
      siteName,
      description,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch metadata' },
      { status: 500 }
    )
  }
}
