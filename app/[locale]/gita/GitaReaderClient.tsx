'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { GitaVerse, ChapterSummary } from '@/lib/gita'
import {
  MagnifyingGlass,
  BookOpen,
  CaretLeft,
  CaretRight,
  Copy,
  Check,
  ShareNetwork,
  ListBullets,
  Sparkle,
  ArrowClockwise,
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface Props {
  locale: string
  chapters: ChapterSummary[]
  initialVerses: GitaVerse[]
  defaultChapter: number
  defaultVerse: number
  defaultQuery: string
}

function toBanglaNum(num: number | string): string {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']
  return String(num).replace(/\d/g, (d) => bnDigits[parseInt(d, 10)] ?? d)
}

function normalizeDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export default function GitaReaderClient({
  locale,
  chapters,
  initialVerses,
  defaultChapter,
  defaultVerse,
  defaultQuery,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isBn = locale === 'bn' || !locale

  const [selectedChapter, setSelectedChapter] = useState<number>(defaultChapter || 1)
  const [selectedVerseNum, setSelectedVerseNum] = useState<number>(defaultVerse || 1)
  const [searchQuery, setSearchQuery] = useState<string>(defaultQuery || '')
  const [copied, setCopied] = useState<boolean>(false)

  // Current active chapter summary
  const currentChapter = useMemo(() => {
    return chapters.find((c) => c.chapter === selectedChapter) || chapters[0]
  }, [chapters, selectedChapter])

  // Verses of the current chapter
  const currentChapterVerses = useMemo(() => {
    return initialVerses.filter((v) => v.chapter === selectedChapter)
  }, [initialVerses, selectedChapter])

  // Current verse
  const currentVerse = useMemo(() => {
    return (
      currentChapterVerses.find((v) => v.verse === selectedVerseNum) ||
      currentChapterVerses[0] ||
      null
    )
  }, [currentChapterVerses, selectedVerseNum])

  // Filtered search results
  const searchResults = useMemo(() => {
    const trimmed = searchQuery.trim()
    if (!trimmed) return null

    // Exact chapter:verse search pattern (e.g. 2:47 or 2.47)
    const match = trimmed.match(/^(\d+)[\s:.]+(\d+)$/)
    if (match) {
      const ch = parseInt(match[1], 10)
      const vr = parseInt(match[2], 10)
      const found = initialVerses.filter((v) => v.chapter === ch && v.verse === vr)
      if (found.length > 0) return found
    }

    const norm = normalizeDiacritics(trimmed)
    return initialVerses.filter((v) => {
      const sanskritNorm = normalizeDiacritics(v.sanskrit)
      const transliterationNorm = normalizeDiacritics(v.transliteration)
      const englishNorm = normalizeDiacritics(v.english)
      const hindiNorm = normalizeDiacritics(v.hindi)

      return (
        sanskritNorm.includes(norm) ||
        transliterationNorm.includes(norm) ||
        englishNorm.includes(norm) ||
        hindiNorm.includes(norm) ||
        String(v.verse) === trimmed ||
        `${v.chapter}.${v.verse}`.includes(trimmed) ||
        `${v.chapter}:${v.verse}`.includes(trimmed)
      )
    })
  }, [initialVerses, searchQuery])

  // Update URL state without page reload
  const updateUrl = (chapter: number, verse: number) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('chapter', String(chapter))
    params.set('verse', String(verse))
    if (searchQuery) {
      params.set('q', searchQuery)
    } else {
      params.delete('q')
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleSelectVerse = (verse: GitaVerse) => {
    setSelectedChapter(verse.chapter)
    setSelectedVerseNum(verse.verse)
    updateUrl(verse.chapter, verse.verse)
  }

  const handleChapterChange = (ch: number) => {
    setSelectedChapter(ch)
    setSelectedVerseNum(1)
    updateUrl(ch, 1)
  }

  // Navigation handlers
  const hasPrev = selectedVerseNum > 1 || selectedChapter > 1
  const hasNext =
    selectedVerseNum < (currentChapter?.verseCount || 0) || selectedChapter < 18

  const handlePrev = () => {
    if (selectedVerseNum > 1) {
      const nextV = selectedVerseNum - 1
      setSelectedVerseNum(nextV)
      updateUrl(selectedChapter, nextV)
    } else if (selectedChapter > 1) {
      const prevCh = selectedChapter - 1
      const prevChSummary = chapters.find((c) => c.chapter === prevCh)
      const lastVerse = prevChSummary?.verseCount || 1
      setSelectedChapter(prevCh)
      setSelectedVerseNum(lastVerse)
      updateUrl(prevCh, lastVerse)
    }
  }

  const handleNext = () => {
    if (selectedVerseNum < (currentChapter?.verseCount || 0)) {
      const nextV = selectedVerseNum + 1
      setSelectedVerseNum(nextV)
      updateUrl(selectedChapter, nextV)
    } else if (selectedChapter < 18) {
      const nextCh = selectedChapter + 1
      setSelectedChapter(nextCh)
      setSelectedVerseNum(1)
      updateUrl(nextCh, 1)
    }
  }

  const handleCopy = () => {
    if (!currentVerse) return
    const textToCopy = `শ্রীমদ্ভগবদ্গীতা | অধ্যায় ${toBanglaNum(currentVerse.chapter)}, শ্লোক ${toBanglaNum(currentVerse.verse)}\n\n${currentVerse.sanskrit}\n\n[উচ্চারণ]:\n${currentVerse.transliteration}\n\n[ভাবার্থ (English)]:\n${currentVerse.english}\n\n[ভাবার্থ (हिंदी)]:\n${currentVerse.hindi}`
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    toast.success(isBn ? 'শ্লোক কপি করা হয়েছে!' : 'Verse copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = () => {
    if (typeof window === 'undefined') return
    const url = window.location.href
    if (navigator.share) {
      navigator.share({
        title: isBn
          ? `শ্রীমদ্ভগবদ্গীতা - ${toBanglaNum(selectedChapter)}:${toBanglaNum(selectedVerseNum)}`
          : `Bhagavad Gita - ${selectedChapter}:${selectedVerseNum}`,
        url,
      }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url)
      toast.success(isBn ? 'লিঙ্ক কপি করা হয়েছে!' : 'Link copied to clipboard!')
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 rounded-lg">
                <BookOpen size={22} weight="duotone" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {isBn ? 'শ্রীমদ্ভগবদ্গীতা' : 'Srimad Bhagavad Gita'}
              </h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {isBn
                ? '১৮টি অধ্যায়, ৭০১টি শ্লোক — সংস্কৃত মূল, উচ্চারণ এবং প্রাঞ্জল অনুবাদ'
                : '18 Chapters, 701 Verses — Original Sanskrit, Transliteration, and Translations'}
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <MagnifyingGlass
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isBn
                  ? 'শ্লোক বা শব্দ খুঁজুন (উদা: 2:47)'
                  : 'Search verse or words (e.g. 2:47)'
              }
              className="w-full pl-10 pr-9 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-600 dark:focus:ring-red-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-900 dark:text-slate-100"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* If Search is Active */}
      {searchResults !== null ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400 px-1">
            <span>
              {isBn
                ? `অনুসন্ধান ফলাফল: ${toBanglaNum(searchResults.length)} টি শ্লোক পাওয়া গেছে`
                : `Search results: ${searchResults.length} verses found`}
            </span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 font-medium"
            >
              <ArrowClockwise size={14} />
              {isBn ? 'অনুসন্ধান মুছুন' : 'Clear search'}
            </button>
          </div>

          {searchResults.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-slate-500 space-y-2">
              <p className="text-base font-semibold">
                {isBn ? 'কোনো শ্লোক পাওয়া যায়নি' : 'No verses found'}
              </p>
              <p className="text-sm">
                {isBn
                  ? 'অনুগ্রহ করে ভিন্ন কোনো শব্দ বা শ্লোক নম্বর (যেমন: 2:47) দিয়ে অনুসন্ধান করুন।'
                  : 'Try searching with different keywords or verse numbers (e.g. 2:47).'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {searchResults.map((verse) => (
                <div
                  key={`${verse.chapter}-${verse.verse}`}
                  onClick={() => {
                    handleSelectVerse(verse)
                    setSearchQuery('')
                  }}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-red-500 dark:hover:border-red-500/80 cursor-pointer transition-all hover:shadow-md space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 rounded-full text-xs font-semibold">
                      <Sparkle size={14} />
                      {isBn
                        ? `অধ্যায় ${toBanglaNum(verse.chapter)}, শ্লোক ${toBanglaNum(verse.verse)}`
                        : `Chapter ${verse.chapter}, Verse ${verse.verse}`}
                    </span>
                    <span className="text-xs text-slate-400 hover:text-red-600 transition-colors">
                      {isBn ? 'পাঠ করুন →' : 'Read →'}
                    </span>
                  </div>

                  <p className="font-serif text-lg text-slate-900 dark:text-slate-100 leading-relaxed">
                    {verse.sanskrit}
                  </p>

                  <p className="text-xs text-slate-500 italic">
                    {verse.transliteration}
                  </p>

                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      EN:{' '}
                    </span>
                    {verse.english}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Normal Verse Reading Mode */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left/Sidebar: Chapter and Verse Selector */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Chapter Selection Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <ListBullets size={16} />
                  {isBn ? 'অধ্যায় নির্বাচন' : 'Select Chapter'}
                </h2>
                <span className="text-xs text-slate-400">
                  {isBn ? 'মোট ১৮টি' : '18 Chapters'}
                </span>
              </div>

              {/* Chapter Dropdown */}
              <select
                value={selectedChapter}
                onChange={(e) => handleChapterChange(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium focus:ring-2 focus:ring-red-600 focus:outline-none text-slate-900 dark:text-slate-100"
              >
                {chapters.map((ch) => (
                  <option key={ch.chapter} value={ch.chapter}>
                    {isBn
                      ? `অধ্যায় ${toBanglaNum(ch.chapter)}: ${ch.titleBn} (${toBanglaNum(ch.verseCount)} শ্লোক)`
                      : `Chapter ${ch.chapter}: ${ch.titleEn} (${ch.verseCount} verses)`}
                  </option>
                ))}
              </select>

              {/* Verses Number Grid */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {isBn ? 'শ্লোকসমূহ:' : 'Verses:'}
                </span>
                <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-6 gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {currentChapterVerses.map((v) => {
                    const isSelected = v.verse === selectedVerseNum
                    return (
                      <button
                        key={v.verse}
                        onClick={() => {
                          setSelectedVerseNum(v.verse)
                          updateUrl(selectedChapter, v.verse)
                        }}
                        className={`py-1.5 rounded text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-red-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {isBn ? toBanglaNum(v.verse) : v.verse}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Chapter Quick Information Card */}
            <div className="bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs space-y-2 text-slate-600 dark:text-slate-400">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {isBn ? currentChapter.titleBn : currentChapter.titleEn}
              </p>
              <p className="font-serif text-slate-700 dark:text-slate-300">
                {currentChapter.titleSa}
              </p>
              <p>
                {isBn
                  ? `এই অধ্যায়ে মোট ${toBanglaNum(currentChapter.verseCount)}টি শ্লোক রয়েছে।`
                  : `This chapter contains ${currentChapter.verseCount} verses.`}
              </p>
            </div>
          </aside>

          {/* Right/Main Area: Verse Display */}
          <main className="lg:col-span-8 space-y-6">
            {currentVerse ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
                {/* Verse Meta & Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-bold uppercase tracking-wider">
                      {isBn
                        ? `অধ্যায় ${toBanglaNum(currentVerse.chapter)} • শ্লোক ${toBanglaNum(currentVerse.verse)}`
                        : `Chapter ${currentVerse.chapter} • Verse ${currentVerse.verse}`}
                    </span>
                    <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                      {isBn ? currentChapter.titleBn : currentChapter.titleEn}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
                      title={isBn ? 'শ্লোক কপি করুন' : 'Copy verse'}
                    >
                      {copied ? (
                        <>
                          <Check size={14} className="text-green-600" />
                          <span>{isBn ? 'কপি হয়েছে' : 'Copied'}</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>{isBn ? 'কপি' : 'Copy'}</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleShare}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
                      title={isBn ? 'শেয়ার করুন' : 'Share'}
                    >
                      <ShareNetwork size={14} />
                      <span>{isBn ? 'শেয়ার' : 'Share'}</span>
                    </button>
                  </div>
                </div>

                {/* Sanskrit Shloka Box */}
                <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl p-6 sm:p-8 text-center space-y-4">
                  <h3 className="text-xs uppercase tracking-widest font-bold text-amber-800 dark:text-amber-400">
                    {isBn ? 'মূল সংস্কৃত শ্লোক' : 'Original Sanskrit Shloka'}
                  </h3>
                  <p className="font-serif text-xl sm:text-2xl text-slate-900 dark:text-amber-100 leading-relaxed font-semibold">
                    {currentVerse.sanskrit}
                  </p>
                </div>

                {/* Transliteration */}
                <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                    {isBn ? 'উচ্চারণ (Roman Transliteration)' : 'Roman Transliteration'}
                  </h4>
                  <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 italic font-mono leading-relaxed">
                    {currentVerse.transliteration}
                  </p>
                </div>

                {/* English Translation */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-red-600 dark:text-red-400">
                    {isBn ? 'ইংরেজি ভাবার্থ (English Translation)' : 'English Translation'}
                  </h4>
                  <p className="text-base text-slate-800 dark:text-slate-200 leading-relaxed">
                    {currentVerse.english}
                  </p>
                </div>

                {/* Hindi Translation */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                    {isBn ? 'হিন্দি অনুবাদ (हिंदी अनुवाद)' : 'Hindi Translation'}
                  </h4>
                  <p className="text-base text-slate-800 dark:text-slate-200 leading-relaxed">
                    {currentVerse.hindi}
                  </p>
                </div>

                {/* Navigation Controls: Prev / Next */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={handlePrev}
                    disabled={!hasPrev}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors"
                  >
                    <CaretLeft size={16} />
                    <span>{isBn ? 'পূর্ববর্তী শ্লোক' : 'Previous Verse'}</span>
                  </button>

                  <span className="text-xs text-slate-400 font-mono">
                    {isBn
                      ? `${toBanglaNum(currentVerse.verse)} / ${toBanglaNum(currentChapter.verseCount)}`
                      : `${currentVerse.verse} / ${currentChapter.verseCount}`}
                  </span>

                  <button
                    onClick={handleNext}
                    disabled={!hasNext}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    <span>{isBn ? 'পরবর্তী শ্লোক' : 'Next Verse'}</span>
                    <CaretRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                {isBn ? 'শ্লোকটি পাওয়া যায়নি' : 'Verse not found'}
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  )
}
