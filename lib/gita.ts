import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

export interface GitaVerse {
  chapter: number
  verse: number
  sanskrit: string
  hindi: string
  english: string
  transliteration: string
}

export interface ChapterSummary {
  chapter: number
  titleBn: string
  titleEn: string
  titleSa: string
  verseCount: number
}

export const GITA_CHAPTERS: ChapterSummary[] = [
  { chapter: 1, titleBn: 'অর্জুন বিষাদ যোগ', titleEn: 'Arjuna Vishada Yoga', titleSa: 'अर्जुनविषादयोग', verseCount: 47 },
  { chapter: 2, titleBn: 'সাংখ্য যোগ', titleEn: 'Sankhya Yoga', titleSa: 'साङ्ख्ययोग', verseCount: 72 },
  { chapter: 3, titleBn: 'কর্ম যোগ', titleEn: 'Karma Yoga', titleSa: 'कर्मयोग', verseCount: 43 },
  { chapter: 4, titleBn: 'জ্ঞান কর্ম সন্ন্যাস যোগ', titleEn: 'Jnana Karma Sanyasa Yoga', titleSa: 'ज्ञानकर्मसंन्यासयोग', verseCount: 42 },
  { chapter: 5, titleBn: 'কর্ম সন্ন্যাস যোগ', titleEn: 'Karma Sanyasa Yoga', titleSa: 'कर्मसंन्यासयोग', verseCount: 29 },
  { chapter: 6, titleBn: 'ধ্যান যোগ (আত্মসংযম)', titleEn: 'Dhyana Yoga', titleSa: 'आत्मसंयमयोग', verseCount: 47 },
  { chapter: 7, titleBn: 'জ্ঞান বিজ্ঞান যোগ', titleEn: 'Jnana Vijnana Yoga', titleSa: 'ज्ञानविज्ञानयोग', verseCount: 30 },
  { chapter: 8, titleBn: 'অক্ষর ব্রহ্ম যোগ', titleEn: 'Akshara Brahma Yoga', titleSa: 'अक्षरब्रह्मयोग', verseCount: 28 },
  { chapter: 9, titleBn: 'রাজবিদ্যা রাজগুহ্য যোগ', titleEn: 'Raja Vidya Raja Guhya Yoga', titleSa: 'राजविद्याराजगुह्ययोग', verseCount: 34 },
  { chapter: 10, titleBn: 'বিভূতি যোগ', titleEn: 'Vibhuti Yoga', titleSa: 'विभूतियोग', verseCount: 42 },
  { chapter: 11, titleBn: 'বিশ্বরূপ দর্শন যোগ', titleEn: 'Vishwaroopa Darshana Yoga', titleSa: 'विश्वरूपदर्शनयोग', verseCount: 55 },
  { chapter: 12, titleBn: 'ভক্তি যোগ', titleEn: 'Bhakti Yoga', titleSa: 'ভক্তियोग', verseCount: 20 },
  { chapter: 13, titleBn: 'ক্ষেত্র ক্ষেত্রজ্ঞ বিভাগ যোগ', titleEn: 'Kshetra Kshetrajna Vibhaga Yoga', titleSa: 'क्षेत्रक्षेत्रज्ञविभागयोग', verseCount: 35 },
  { chapter: 14, titleBn: 'গুণত্রয় বিভাগ যোগ', titleEn: 'Gunatraya Vibhaga Yoga', titleSa: 'गुणत्रयविभागयोग', verseCount: 27 },
  { chapter: 15, titleBn: 'পুরুষোত্তম যোগ', titleEn: 'Purushottama Yoga', titleSa: 'पुरुषोत्तमयोग', verseCount: 20 },
  { chapter: 16, titleBn: 'দৈবাসুর সম্পদ বিভাগ যোগ', titleEn: 'Daivasura Sampad Vibhaga Yoga', titleSa: 'दैवासुरसम्पद्विभागयोग', verseCount: 24 },
  { chapter: 17, titleBn: 'শ্রদ্ধাত্রয় বিভাগ যোগ', titleEn: 'Shraddhatraya Vibhaga Yoga', titleSa: 'श्रद्धात्रयविभागयोग', verseCount: 28 },
  { chapter: 18, titleBn: 'মোক্ষ সন্ন্যাস যোগ', titleEn: 'Moksha Sanyasa Yoga', titleSa: 'मोक्षसंन्यासयोग', verseCount: 78 },
]

// In-memory cache for parsed verses
let cachedVerses: GitaVerse[] | null = null

function normalizeDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function getGitaVerses(): GitaVerse[] {
  if (cachedVerses) {
    return cachedVerses
  }

  const csvPath = path.join(process.cwd(), 'public', 'local', 'geeta_dataset.csv')
  const fileContent = fs.readFileSync(csvPath, 'utf8')

  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as Record<string, string>[]

  cachedVerses = records.map((r) => ({
    chapter: parseInt(r.chapter, 10),
    verse: parseInt(r.verse, 10),
    sanskrit: r.sanskrit || '',
    hindi: r.hindi || '',
    english: r.english || '',
    transliteration: r.transliteration || '',
  }))

  return cachedVerses
}

export function getVerse(chapter: number, verse: number): GitaVerse | null {
  const verses = getGitaVerses()
  return (
    verses.find((v) => v.chapter === chapter && v.verse === verse) || null
  )
}

export function getVersesByChapter(chapter: number): GitaVerse[] {
  const verses = getGitaVerses()
  return verses.filter((v) => v.chapter === chapter)
}

export function searchGitaVerses(options: {
  query?: string
  chapter?: number
  limit?: number
  page?: number
}): {
  results: GitaVerse[]
  total: number
  page: number
  limit: number
  totalPages: number
} {
  const { query = '', chapter, limit = 20, page = 1 } = options
  let verses = getGitaVerses()

  if (chapter && !isNaN(chapter)) {
    verses = verses.filter((v) => v.chapter === chapter)
  }

  const trimmedQuery = query.trim()

  if (trimmedQuery) {
    const chVerseMatch = trimmedQuery.match(/^(\d+)[\s:.]+(\d+)$/)
    if (chVerseMatch) {
      const ch = parseInt(chVerseMatch[1], 10)
      const vr = parseInt(chVerseMatch[2], 10)
      const exact = verses.filter((v) => v.chapter === ch && v.verse === vr)
      if (exact.length > 0) {
        return {
          results: exact,
          total: exact.length,
          page: 1,
          limit,
          totalPages: 1,
        }
      }
    }

    const normQuery = normalizeDiacritics(trimmedQuery)

    verses = verses.filter((v) => {
      const sanskritNorm = normalizeDiacritics(v.sanskrit)
      const transliterationNorm = normalizeDiacritics(v.transliteration)
      const englishNorm = normalizeDiacritics(v.english)
      const hindiNorm = normalizeDiacritics(v.hindi)

      return (
        sanskritNorm.includes(normQuery) ||
        transliterationNorm.includes(normQuery) ||
        englishNorm.includes(normQuery) ||
        hindiNorm.includes(normQuery) ||
        String(v.verse) === trimmedQuery ||
        `${v.chapter}.${v.verse}`.includes(trimmedQuery) ||
        `${v.chapter}:${v.verse}`.includes(trimmedQuery)
      )
    })
  }

  const total = verses.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const validPage = Math.max(1, Math.min(page, totalPages))
  const startIndex = (validPage - 1) * limit
  const results = verses.slice(startIndex, startIndex + limit)

  return {
    results,
    total,
    page: validPage,
    limit,
    totalPages,
  }
}
