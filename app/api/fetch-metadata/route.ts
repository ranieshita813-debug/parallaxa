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
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    let html = ''
    try {
      const res = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
        },
      })
      clearTimeout(timeoutId)

      if (!res.ok) {
        return NextResponse.json({
          url: targetUrl,
          title: urlObj.hostname.replace(/^www\./, ''),
          siteName: urlObj.hostname.replace(/^www\./, ''),
          author: '',
          year: new Date().getFullYear().toString(),
          description: '',
        })
      }

      html = await res.text()
    } catch {
      clearTimeout(timeoutId)
      // If fetch fails (CORS, network error, blocked), return fallback with host info
      return NextResponse.json({
        url: targetUrl,
        title: urlObj.hostname.replace(/^www\./, ''),
        siteName: urlObj.hostname.replace(/^www\./, ''),
        author: '',
        year: new Date().getFullYear().toString(),
        description: '',
      })
    }

    // 1. Title
    let title =
      extractMeta(html, 'og:title', 'twitter:title') ||
      extractMeta(html, 'title') ||
      ''

    if (!title) {
      const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      if (titleTagMatch && titleTagMatch[1]) {
        title = decodeHtmlEntities(titleTagMatch[1].trim())
      }
    }

    // If still no title, fallback to host
    if (!title) {
      title = urlObj.hostname.replace(/^www\./, '')
    }

    // 2. Site Name
    let siteName =
      extractMeta(html, 'og:site_name', 'application-name') ||
      urlObj.hostname.replace(/^www\./, '')

    // Clean title if it contains siteName e.g. "Article Title - BBC News"
    if (siteName && title.includes(` - ${siteName}`)) {
      // keep it readable
    }

    // 3. Author
    let author =
      extractMeta(html, 'author', 'article:author') ||
      extractMeta(html, 'twitter:creator') ||
      extractMeta(html, 'og:article:author') ||
      ''

    if (!author) {
      // Try schema.org json-ld author
      const jsonLdMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
      if (jsonLdMatch) {
        for (const scriptTag of jsonLdMatch) {
          const content = scriptTag.replace(/<script[^>]*>|<\/script>/gi, '').trim()
          try {
            const data = JSON.parse(content)
            const item = Array.isArray(data) ? data[0] : data
            if (item) {
              const authObj = item.author || item.creator
              if (typeof authObj === 'string') author = authObj
              else if (Array.isArray(authObj) && authObj[0]?.name) author = authObj[0].name
              else if (authObj?.name) author = authObj.name
            }
          } catch {
            // ignore JSON parse errors in script tags
          }
          if (author) break
        }
      }
    }

    if (!author) {
      author = siteName
    }

    // 4. Date / Year
    let year = ''
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

    if (!year) {
      // Try copyright or current year
      const copyrightMatch = html.match(/(?:©|&copy;|Copyright)\s*(?:20\d\d[-–])?(20\d\d)/i)
      if (copyrightMatch && copyrightMatch[1]) {
        year = copyrightMatch[1]
      } else {
        year = new Date().getFullYear().toString()
      }
    }

    // 5. Description
    const description =
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
