'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { NewsCard } from '@/components/news-card'
import { NewsArticle } from '@/lib/db/articles'
import { Sparkle, Pause, Play, CaretLeft, CaretRight, ArrowRight } from '@phosphor-icons/react'

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const SECTION_TITLE_TRANSLATIONS: Record<string, string> = {
  'Latest News': 'সর্বশেষ সংবাদ',
  'World News': 'বিশ্ব সংবাদ',
  'Technology': 'প্রযুক্তি',
  'Business': 'ব্যবসা ও বাণিজ্য',
  'Sports': 'খেলাধুলা',
  'Science': 'বিজ্ঞান',
  'Health': 'স্বাস্থ্য',
  'Opinion': 'মতামত',
  'Featured News': 'বিশেষ সংবাদ',
  'Trending News': 'ট্রেন্ডিং সংবাদ',
}

// Marker colour per section (falls back to red). Keys are the English titles.
const SECTION_ACCENT: Record<string, string> = {
  'World News': 'bg-red-600',
  'Technology': 'bg-violet-600',
  'Business': 'bg-amber-600',
  'Sports': 'bg-emerald-600',
  'Science': 'bg-sky-700',
  'Health': 'bg-emerald-700',
  'Opinion': 'bg-pink-700',
}

const POSITIONS = [
  { x: 0, scale: 1, opacity: 1, z: 30, shadow: '0 20px 40px -12px rgba(15,23,42,0.35)' },
  { x: 175, scale: 0.88, opacity: 0.65, z: 20, shadow: '0 10px 24px -10px rgba(15,23,42,0.25)' },
  { x: -175, scale: 0.88, opacity: 0.65, z: 20, shadow: '0 10px 24px -10px rgba(15,23,42,0.25)' },
  { x: 0, scale: 0.65, opacity: 0, z: 10, shadow: 'none' },
]
const HIDDEN_POSITION = { x: 0, scale: 0.5, opacity: 0, z: 0, shadow: 'none' }
const SWIPE_FRACTION = 0.18
const DRAG_CLICK_GUARD = 6
const AUTOPLAY_MS = 5000

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

/* ------------------------------------------------------------------ */
/* Section header                                                      */
/* ------------------------------------------------------------------ */

function SectionHeader({
  id,
  title,
  accent = 'bg-red-600',
  href,
  moreLabel,
  dark = false,
}: {
  id?: string
  title: string
  accent?: string
  href?: string
  moreLabel?: string
  dark?: boolean
}) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <h2
        id={id}
        className={`flex items-center gap-3 text-2xl font-extrabold tracking-tight ${
          dark ? 'text-white' : 'text-slate-900'
        }`}
      >
        <span aria-hidden className={`inline-block h-7 w-2 ${accent}`} />
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="group inline-flex min-h-[44px] items-center gap-1 text-sm font-bold text-red-600 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
        >
          {moreLabel}
          <ArrowRight size={14} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Cover-flow carousel (mobile + slider layout)                        */
/* ------------------------------------------------------------------ */

function CoverFlowSlider({
  articles,
  locale = 'bn',
  className = '',
}: {
  articles: NewsArticle[]
  locale?: string
  className?: string
}) {
  const displayArticles = articles.slice(0, 6)
  const total = displayArticles.length
  const isBn = locale === 'bn'

  const [current, setCurrent] = useState(0)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const [tabHidden, setTabHidden] = useState(false)
  const [hovering, setHovering] = useState(false)

  const stageRef = useRef<HTMLDivElement>(null)
  const pointerIdRef = useRef<number | null>(null)
  const startXRef = useRef(0)
  const movedRef = useRef(false)
  const reducedMotion = usePrefersReducedMotion()

  const autoplayAllowed =
    total > 1 && !reducedMotion && !userPaused && !tabHidden && !hovering && !isDragging

  const getPos = useCallback(
    (cardIdx: number) => {
      const offset = (cardIdx - current + total) % total
      if (offset >= POSITIONS.length) return HIDDEN_POSITION
      return POSITIONS[offset]
    },
    [current, total]
  )

  const goTo = useCallback((i: number) => setCurrent((i + total) % total), [total])

  useEffect(() => {
    if (!autoplayAllowed) return
    const t = setInterval(() => setCurrent((c) => (c + 1) % total), AUTOPLAY_MS)
    return () => clearInterval(t)
  }, [autoplayAllowed, total, current])

  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerIdRef.current = e.pointerId
    stageRef.current?.setPointerCapture(e.pointerId)
    startXRef.current = e.clientX
    movedRef.current = false
    setIsDragging(true)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || pointerIdRef.current !== e.pointerId) return
    const dx = e.clientX - startXRef.current
    if (Math.abs(dx) > DRAG_CLICK_GUARD) movedRef.current = true
    setDragX(dx)
  }

  const endDrag = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return
    const threshold = (stageRef.current?.offsetWidth || 320) * SWIPE_FRACTION
    if (dragX < -threshold) goTo(current + 1)
    else if (dragX > threshold) goTo(current - 1)
    if (stageRef.current?.hasPointerCapture(e.pointerId)) stageRef.current.releasePointerCapture(e.pointerId)
    setIsDragging(false)
    setDragX(0)
    pointerIdRef.current = null
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goTo(current - 1)
    else if (e.key === 'ArrowRight') goTo(current + 1)
  }

  if (total === 0) return null

  const activeTitle = displayArticles[current]?.title ?? ''
  const btn =
    'flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 text-slate-800 transition hover:bg-slate-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900'

  return (
    <div className={className} onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
      <span className="sr-only" role="status" aria-live="polite">
        {isBn
          ? `স্লাইড ${current + 1} এর ${total}: ${activeTitle}`
          : `Slide ${current + 1} of ${total}: ${activeTitle}`}
      </span>

      <div
        ref={stageRef}
        role="group"
        aria-roledescription="carousel"
        aria-label={isBn ? 'প্রধান খবর' : 'Top stories'}
        tabIndex={total > 1 ? 0 : -1}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(e) => {
          if (movedRef.current) {
            e.preventDefault()
            e.stopPropagation()
            movedRef.current = false
          }
        }}
        className="relative flex h-[240px] sm:h-[270px] md:h-[300px] touch-pan-y select-none items-center justify-center overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
      >
        {displayArticles.map((article, i) => {
          const p = getPos(i)
          const isFocused = p.z === 30
          const liveX = isDragging ? p.x + dragX : p.x
          return (
            <div
              key={article.id}
              onClick={() => {
                if (!isFocused && !movedRef.current) goTo(i)
              }}
              style={{
                transform: `translateX(${liveX}px) scale(${p.scale})`,
                opacity: p.opacity,
                zIndex: p.z,
                boxShadow: p.shadow,
                transition: isDragging
                  ? 'none'
                  : 'transform 0.45s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.45s ease, box-shadow 0.45s ease',
                pointerEvents: p.opacity === 0 ? 'none' : 'auto',
              }}
              className="absolute h-full w-[90%] sm:w-[86%] max-w-[420px] cursor-pointer overflow-hidden bg-white"
              aria-hidden={!isFocused}
              {...(!isFocused ? ({ inert: '' } as Record<string, string>) : {})}
            >
              <div className={isFocused ? 'h-full' : 'pointer-events-none h-full'}>
                <NewsCard article={article} variant="featured" className="h-full" locale={locale} />
              </div>
            </div>
          )
        })}
      </div>

      {total > 1 && (
        <div className="mt-3 flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5" role="tablist" aria-label={isBn ? 'স্লাইড' : 'Slides'}>
            {displayArticles.map((article, i) => (
              <button
                key={article.id}
                role="tab"
                aria-selected={i === current}
                onClick={() => goTo(i)}
                aria-label={isBn ? `স্লাইড ${i + 1}` : `Go to slide ${i + 1}`}
                className="flex h-6 items-center focus-visible:outline-none"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all duration-300 ${
                    i === current ? 'w-6 bg-red-600' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                  }`}
                />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!reducedMotion && (
              <button
                onClick={() => setUserPaused((v) => !v)}
                aria-label={
                  userPaused
                    ? isBn ? 'অটোপ্লে চালু করুন' : 'Start autoplay'
                    : isBn ? 'অটোপ্লে বন্ধ করুন' : 'Pause autoplay'
                }
                className={btn}
              >
                {userPaused ? <Play size={14} weight="fill" /> : <Pause size={14} weight="fill" />}
              </button>
            )}
            <button onClick={() => goTo(current - 1)} aria-label={isBn ? 'আগের স্লাইড' : 'Previous slide'} className={btn}>
              <CaretLeft size={14} weight="bold" />
            </button>
            <button onClick={() => goTo(current + 1)} aria-label={isBn ? 'পরের স্লাইড' : 'Next slide'} className={btn}>
              <CaretRight size={14} weight="bold" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Hero: dark band, big lead + "latest" list (first grid section)      */
/* ------------------------------------------------------------------ */

function HeroSection({
  section,
  title,
  locale,
  moreLabel,
}: {
  section: DynamicSection
  title: string
  locale: string
  moreLabel: string
}) {
  const [lead, ...rest] = section.articles
  const side = rest.slice(0, 4)

  return (
    <section aria-labelledby={`sec-${section.id}`} className="bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
        {/* Mobile: slider. Desktop: lead + list */}
        <SectionHeader id={`sec-${section.id}`} title={title} dark />
        <CoverFlowSlider articles={section.articles} locale={locale} className="md:hidden [&_button]:border-slate-600 [&_button]:text-white [&_button:hover]:bg-slate-800" />

        <div className="hidden gap-7 md:grid lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
          <NewsCard
            article={lead}
            variant="featured"
            className="h-full min-h-[380px] lg:min-h-[520px]"
            locale={locale}
          />
          {side.length > 0 && (
            <div className="flex flex-col bg-white p-5">
              <div className="mb-1 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-red-600" />
                  {locale === 'bn' ? 'সর্বশেষ' : 'Latest'}
                </h3>
                <Link
                  href={`/${locale}`}
                  className="inline-flex min-h-[44px] items-center text-sm font-bold text-red-600 hover:underline"
                >
                  {moreLabel}
                </Link>
              </div>
              <div className="divide-y divide-slate-200">
                {side.map((a) => (
                  <NewsCard key={a.id} article={a} variant="horizontal" className="py-3" locale={locale} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Image-card grid (later grid sections)                               */
/* ------------------------------------------------------------------ */

function CardsGrid({ articles, locale }: { articles: NewsArticle[]; locale: string }) {
  const [first, second, third, ...rest] = articles

  if (articles.length < 3) {
    return (
      <div className="hidden gap-6 md:grid md:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <NewsCard key={a.id} article={a} variant="featured" className="min-h-[300px]" locale={locale} />
        ))}
      </div>
    )
  }

  return (
    <div className="hidden md:block">
      {/* One large card + two stacked, newsroom-style */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <NewsCard article={first} variant="featured" className="h-full min-h-[340px] lg:min-h-[380px]" locale={locale} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-2">
          <NewsCard article={second} variant="featured" className="h-full min-h-[180px]" locale={locale} />
          <NewsCard article={third} variant="featured" className="h-full min-h-[180px]" locale={locale} />
        </div>
      </div>

      {rest.length > 0 && (
        <div className="mt-6 grid gap-6 border-t border-slate-200 pt-6 md:grid-cols-2 lg:grid-cols-4">
          {rest.slice(0, 4).map((a) => (
            <NewsCard key={a.id} article={a} variant="default" locale={locale} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

interface DynamicSection {
  id: number
  title: string
  type: string
  layout: string
  articles: NewsArticle[]
}

interface HomeClientProps {
  sections: DynamicSection[]
}

export default function HomeClient({ sections = [] }: HomeClientProps) {
  const pathname = usePathname()
  const locale = pathname.split('/')[1] || 'bn'
  const isBn = locale === 'bn'
  const hasArticles = sections.some((s) => s.articles && s.articles.length > 0)
  const moreLabel = isBn ? 'আরও দেখুন →' : 'See more →'

  const translateTitle = (title: string) => (isBn ? SECTION_TITLE_TRANSLATIONS[title] || title : title)

  // The first non-empty grid section becomes the dark hero band.
  const heroId = sections.find((s) => s.layout === 'grid' && s.articles?.length > 0)?.id

  const wrapper = 'mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12'

  return (
    <div className="w-full bg-white">
      <main className="w-full">
        {!hasArticles && (
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-4 px-4 py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Sparkle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">
              {isBn ? 'কোনো প্রকাশিত নিবন্ধ পাওয়া যায়নি' : 'No articles published yet'}
            </h2>
            <p className="max-w-md text-slate-500">
              {isBn
                ? 'নিবন্ধ দেখতে অনুগ্রহ করে ড্যাশবোর্ড বা "লিখুন" পেজে গিয়ে নতুন নিবন্ধ তৈরি করে পাবলিশ করুন।'
                : 'Please create and publish a new article from the Dashboard or Write page.'}
            </p>
            <Link
              href={`/${locale}/write`}
              className="mt-2 inline-flex min-h-[44px] items-center rounded-md bg-slate-900 px-6 font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              {isBn ? 'নতুন নিবন্ধ লিখুন' : 'Write new article'}
            </Link>
          </div>
        )}

        {sections.map((section) => {
          if (!section.articles || section.articles.length === 0) return null
          const title = translateTitle(section.title)
          const accent = SECTION_ACCENT[section.title] ?? 'bg-red-600'

          if (section.layout === 'grid') {
            if (section.id === heroId) {
              return <HeroSection key={section.id} section={section} title={title} locale={locale} moreLabel={moreLabel} />
            }
            return (
              <section key={section.id} aria-labelledby={`sec-${section.id}`}>
                <div className={wrapper}>
                  <SectionHeader id={`sec-${section.id}`} title={title} accent={accent} href={`/${locale}`} moreLabel={moreLabel} />
                  <CoverFlowSlider articles={section.articles} locale={locale} className="md:hidden" />
                  <CardsGrid articles={section.articles} locale={locale} />
                </div>
              </section>
            )
          }

          if (section.layout === 'list') {
            return (
              <section key={section.id} aria-labelledby={`sec-${section.id}`} className="bg-slate-50">
                <div className={wrapper}>
                  <SectionHeader id={`sec-${section.id}`} title={title} accent={accent} href={`/${locale}`} moreLabel={moreLabel} />
                  <div className="grid gap-x-10 lg:grid-cols-2">
                    {section.articles.map((article) => (
                      <NewsCard
                        key={article.id ?? 'null'}
                        article={article}
                        variant="horizontal"
                        className="border-b border-slate-200 py-4"
                        locale={locale}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )
          }

          if (section.layout === 'slider') {
            return (
              <section key={section.id} aria-labelledby={`sec-${section.id}`}>
                <div className={wrapper}>
                  <SectionHeader id={`sec-${section.id}`} title={title} accent={accent} />
                  <CoverFlowSlider articles={section.articles} locale={locale} className="mx-auto w-full max-w-3xl" />
                </div>
              </section>
            )
          }

          return null
        })}
      </main>
    </div>
  )
}