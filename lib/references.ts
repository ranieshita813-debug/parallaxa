import { parseBlockParams } from './mdx/block-registry'

export interface ArticleReference {
  index: number
  title: string
  author: string
  year: string
  site: string
  url: string
  description: string
}

/**
 * Normalizes legacy [!reference(...)] occurrences to standard markdown footnote references [^n]
 * and appends footnote definitions [^n]: ... at the bottom.
 */
export function normalizeLegacyReferences(rawContent: string): string {
  if (!rawContent || !rawContent.includes('[!reference')) {
    return rawContent || ''
  }

  const existingFootnotes = Array.from(rawContent.matchAll(/\[\^(\d+)\]/g)).map(m => parseInt(m[1], 10))
  let count = existingFootnotes.length > 0 ? Math.max(...existingFootnotes) : 0

  const definitions: string[] = []
  const refRegex = /\[!reference\s*\(([\s\S]*?)\)\s*\]/g

  const content = rawContent.replace(refRegex, (_, paramsStr) => {
    count++
    const params = parseBlockParams(paramsStr || '')
    const title = params.text || params.title || 'তথ্যসূত্র'
    const author = params.author || ''
    const year = params.year || ''
    const site = params.site || params.siteName || ''
    const url = params.url || ''

    let defText = ''
    if (url) {
      defText = `[${title}](${url})`
    } else {
      defText = title
    }

    const metaParts: string[] = []
    if (author) metaParts.push(author)
    if (year) metaParts.push(`(${year})`)
    if (site) metaParts.push(site)

    if (metaParts.length > 0) {
      defText += ` - ${metaParts.join(', ')}`
    }

    definitions.push(`[^${count}]: ${defText}`)
    return `[^${count}]`
  })

  if (definitions.length > 0) {
    return `${content.trimEnd()}\n\n${definitions.join('\n')}`
  }

  return content
}

/**
 * Helper to get the next footnote index from markdown content
 */
export function getNextFootnoteIndex(content: string): number {
  if (!content) return 1
  const matches = Array.from(content.matchAll(/\[\^(\d+)\]/g)).map(m => parseInt(m[1], 10))
  if (matches.length === 0) return 1
  return Math.max(...matches) + 1
}
