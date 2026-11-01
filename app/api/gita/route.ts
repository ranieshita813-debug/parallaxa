import { NextRequest, NextResponse } from 'next/server'
import {
  getVerse,
  getVersesByChapter,
  searchGitaVerses,
  GITA_CHAPTERS,
} from '@/lib/gita'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const chapterParam = searchParams.get('chapter')
    const verseParam = searchParams.get('verse')
    const queryParam = searchParams.get('search') || searchParams.get('q') || ''
    const pageParam = parseInt(searchParams.get('page') || '1', 10)
    const limitParam = parseInt(searchParams.get('limit') || '20', 10)

    // Request chapter list
    if (searchParams.get('meta') === 'chapters') {
      return NextResponse.json({
        chapters: GITA_CHAPTERS,
      })
    }

    // Specific chapter and verse
    if (chapterParam && verseParam) {
      const chapter = parseInt(chapterParam, 10)
      const verse = parseInt(verseParam, 10)
      if (isNaN(chapter) || isNaN(verse)) {
        return NextResponse.json(
          { error: 'Invalid chapter or verse number' },
          { status: 400 }
        )
      }
      const data = getVerse(chapter, verse)
      if (!data) {
        return NextResponse.json(
          { error: 'Verse not found' },
          { status: 404 }
        )
      }
      return NextResponse.json({ verse: data })
    }

    // Filter by chapter without search
    if (chapterParam && !queryParam) {
      const chapter = parseInt(chapterParam, 10)
      if (isNaN(chapter)) {
        return NextResponse.json(
          { error: 'Invalid chapter number' },
          { status: 400 }
        )
      }
      const verses = getVersesByChapter(chapter)
      const chapterInfo = GITA_CHAPTERS.find((c) => c.chapter === chapter)
      return NextResponse.json({
        chapter: chapterInfo || { chapter, verseCount: verses.length },
        verses,
        total: verses.length,
      })
    }

    // Search or all verses
    const chapter = chapterParam ? parseInt(chapterParam, 10) : undefined
    const searchData = searchGitaVerses({
      query: queryParam,
      chapter: isNaN(chapter as number) ? undefined : chapter,
      page: pageParam,
      limit: limitParam,
    })

    return NextResponse.json({
      ...searchData,
      query: queryParam,
      chapter,
      chapters: GITA_CHAPTERS,
    })
  } catch (error) {
    console.error('Error fetching Gita data:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
