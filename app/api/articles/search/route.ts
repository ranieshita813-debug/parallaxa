import { NextRequest, NextResponse } from 'next/server'
import { searchArticlesByQuery } from '@/lib/db/articles'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q') || ''
    const category = searchParams.get('category') || ''

    if (!query.trim()) {
      return NextResponse.json({ articles: [] })
    }

    const articles = await searchArticlesByQuery(query.trim())

    const filtered = category && category !== 'All' && category !== 'সকল'
      ? articles.filter(a => a.category?.toLowerCase() === category.toLowerCase())
      : articles

    return NextResponse.json({ articles: filtered })
  } catch (err) {
    console.error('Search API error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
