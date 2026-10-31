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
 * Extracts all [!reference(...)] occurrences from markdown content,
 * replacing them with inline links [1](#ref-1), [2](#ref-2), etc.,
 * and returning the cleaned content alongside the extracted reference array.
 */
export function processArticleReferences(
  rawContent: string
): {
  content: string
  references: ArticleReference[]
} {
  if (!rawContent || !rawContent.includes('[!reference')) {
    return {
      content: rawContent || '',
      references: [],
    }
  }

  const refRegex = /\[!reference\s*\(([\s\S]*?)\)\s*\]/g
  const references: ArticleReference[] = []
  let count = 0

  const content = rawContent.replace(refRegex, (_, paramsStr) => {
    count++
    const params = parseBlockParams(paramsStr || '')
    const title = params.text || params.title || 'তথ্যসূত্র'
    const author = params.author || ''
    const year = params.year || ''
    const site = params.site || params.siteName || ''
    const url = params.url || ''
    const description = params.description || ''

    references.push({
      index: count,
      title,
      author,
      year,
      site,
      url,
      description,
    })

    const hoverTitle = (title || 'তথ্যসূত্র').replace(/"/g, '&quot;')
    return ` [${count}](#ref-${count} "${hoverTitle}")`
  })

  return {
    content,
    references,
  }
}
