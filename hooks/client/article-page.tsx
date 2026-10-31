'use client'

import { useState, useEffect, useRef, useCallback, Children, isValidElement, ComponentPropsWithoutRef } from 'react'
import rehypeMermaid from 'rehype-mermaid'
import { toDigitalNumber } from '@/components/news-card'
import PinwheelLoader from '@/components/logo'
import Markdown, { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import 'katex/dist/katex.min.css'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { serifFont } from '@/lib/font'

import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { NewsCard } from '@/components/news-card'
import { NewsArticle } from '@/lib/db/articles'
import { createCustomBlockPlugin, DBBlockConfig } from '@/lib/mdx/block-registry'
import '@/lib/mdx/blocks'
import { customBlockComponents } from '@/components/mdx/CustomBlockRenderer'
import ReactionButtons from '@/components/article/ReactionButtons'
import CommentsSection from '@/components/article/CommentsSection'
import FramedQuote from '@/components/mdx/FramedCornersQuote'
import {
  Check, Copy, ArrowLeft, ChevronRight, Bookmark, BookmarkCheck,
  Printer, Share2, Link as LinkIcon, Clock, Eye,
} from 'lucide-react'
import { FaFacebook, FaTwitter, FaLinkedinIn } from 'react-icons/fa'

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getText(node: any): string {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(getText).join('')
  if (isValidElement(node)) return getText((node.props as any).children)
  return ''
}

function hasFirstImage(content: string): boolean {
  if (!content) return false
  const trimmed = content.trim()
  return trimmed.startsWith('![') || trimmed.startsWith('<img') || trimmed.startsWith('<figure')
}

function estimateReadTime(text: string): number {
  const words = (text ?? '').trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return 'Just now'
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function authorInitials(name?: string): string {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

/* ------------------------------------------------------------------ */
/* Code block                                                          */
/* ------------------------------------------------------------------ */

function CodeBlock({ children, className }: ComponentPropsWithoutRef<'code'>) {
  const [copied, setCopied] = useState(false)
  const lang = className?.replace('language-', '') ?? 'text'
  const code = typeof children === 'string' ? children : String(children ?? '')
  const isInline = !className

  if (isInline) {
    return (
      <code className="break-all rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-700">
        {children}
      </code>
    )
  }

  return (
    <div className="relative my-6 max-w-full overflow-hidden rounded-xl border border-slate-700 bg-[#1e1e1e] text-gray-100">
      <div className="flex items-center justify-between border-b border-[#3a3a3a] bg-[#2a2a2a] px-4 py-1.5">
        <span className="mr-2 truncate font-mono text-[11px] uppercase tracking-widest text-gray-400">{lang}</span>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code.trim())
              setCopied(true)
              setTimeout(() => setCopied(false), 1800)
            } catch {
              /* clipboard blocked: ignore */
            }
          }}
          className="flex min-h-[36px] shrink-0 items-center gap-1.5 text-xs text-gray-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-xs leading-relaxed sm:text-sm">
        <code>{code}</code>
      </pre>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Markdown component map: reading-first typography                    */
/* ------------------------------------------------------------------ */

const headingFont = { fontFamily: 'var(--font-serif), var(--font-bangla-logo)' }

const mdComponents: Components = {
  ...customBlockComponents,
  code: CodeBlock as Components['code'],
  h1: ({ children }) => (
    <h1 style={headingFont} className="mb-3 mt-10 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 style={headingFont} className="mb-3 mt-10 text-2xl font-bold leading-snug text-slate-900 sm:text-[28px]">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 style={headingFont} className="mb-2 mt-8 text-xl font-bold leading-snug text-slate-900 sm:text-2xl">{children}</h3>
  ),
  p: ({ children }) => <p className="my-5 text-[18px] leading-[1.9] text-slate-800">{children}</p>,
  ul: ({ children }) => (
    <ul className="my-5 flex list-disc flex-col gap-2 pl-6 text-[18px] leading-[1.8] text-slate-800 marker:text-red-600">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-5 flex list-decimal flex-col gap-2 pl-6 text-[18px] leading-[1.8] text-slate-800 marker:font-bold marker:text-red-600">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  blockquote: ({ children }) => {
    const items = Children.toArray(children).filter(isValidElement)
    const last = items[items.length - 1]
    const lastText = last ? getText(last).trim() : ''

    const hasAuthor = lastText.startsWith('—') || lastText.startsWith('-')
    const author = hasAuthor ? lastText.replace(/^[—-]\s*/, '') : undefined
    const quoteChildren = hasAuthor ? items.slice(0, -1) : items

    return <FramedQuote author={author}>{quoteChildren}</FramedQuote>
  },
  table: ({ children }) => (
    <div className="my-8 max-w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b-2 border-slate-900">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-slate-600">{children}</th>
  ),
  td: ({ children }) => <td className="px-4 py-3 tabular-nums text-slate-800">{children}</td>,
  hr: () => <hr className="my-10 border-slate-200" />,
  strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => {
    const isHash = href?.startsWith('#')
    return (
      <a
        href={href}
        target={isHash ? undefined : '_blank'}
        rel={isHash ? undefined : 'noopener noreferrer'}
        className="font-medium text-red-700 underline decoration-red-300 underline-offset-[3px] transition-colors hover:text-red-800 hover:decoration-red-700"
      >
        {children}
      </a>
    )
  },
  img: ({ node, className: imgClass = '', ...props }) => {
    const { alt, src } = props
    // Supports "alt text {caption:Your caption}" (also tolerates a literal "\s" before the brace).
    const match = alt?.match(/^(.+?)(?:\s|\\s)*\{caption:(.+?)\}$/)
    const imageAlt = match ? match[1].trim() : alt
    const caption = match ? match[2].trim() : null

    return (
      <figure className="my-8 flex flex-col" data-type="image-figure">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src as string} alt={imageAlt ?? ''} loading="lazy" className={`max-w-full ${imgClass}`} />
        {caption && (
          <figcaption className="mt-2 border-l-2 border-red-600 pl-3 text-sm leading-relaxed text-slate-600">
            {caption}
          </figcaption>
        )}
      </figure>
    )
  },
}

function ArticleMarkdown({ content, dbBlocks }: { content: string; dbBlocks: DBBlockConfig[] }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm, remarkMath, [createCustomBlockPlugin, dbBlocks] as any]}
      rehypePlugins={[rehypeRaw, rehypeKatex, [rehypeMermaid, { strategy: 'pre-mermaid' }]]}
      components={mdComponents}
    >
      {content}
    </Markdown>
  )
}

/* ------------------------------------------------------------------ */
/* Reading progress (measures the article body, not the whole page)    */
/* ------------------------------------------------------------------ */

function useReadingProgress(ref: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const el = ref.current
      if (!el) return
      const { top, height } = el.getBoundingClientRect()
      const total = height - window.innerHeight * 0.6
      const scrolled = Math.max(0, -top + window.innerHeight * 0.4)
      setProgress(total > 0 ? Math.min(100, (scrolled / total) * 100) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [ref])

  return progress
}

/* ------------------------------------------------------------------ */
/* Share menu                                                          */
/* ------------------------------------------------------------------ */

interface ShareMenuProps {
  copied: boolean
  onCopy: () => void
  onTwitter: () => void
  onFacebook: () => void
  onLinkedin: () => void
}

function ShareMenu({ copied, onCopy, onTwitter, onFacebook, onLinkedin }: ShareMenuProps) {
  const item =
    'flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-sm text-slate-700 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none'
  return (
    <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
      <button role="menuitem" onClick={onTwitter} className={item}>
        <FaTwitter className="h-4 w-4 shrink-0 text-sky-500" aria-hidden /> Share on X / Twitter
      </button>
      <button role="menuitem" onClick={onFacebook} className={item}>
        <FaFacebook className="h-4 w-4 shrink-0 text-blue-600" aria-hidden /> Share on Facebook
      </button>
      <button role="menuitem" onClick={onLinkedin} className={item}>
        <FaLinkedinIn className="h-4 w-4 shrink-0 text-blue-700" aria-hidden /> Share on LinkedIn
      </button>
      <hr className="my-1 border-slate-100" />
      <button role="menuitem" onClick={onCopy} className={item}>
        {copied ? <Check className="h-4 w-4 shrink-0 text-green-600" aria-hidden /> : <LinkIcon className="h-4 w-4 shrink-0" aria-hidden />}
        {copied ? 'Copied!' : 'Copy link'}
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Sidebar items                                                       */
/* ------------------------------------------------------------------ */

function RelatedItem({ article, locale = 'bn' }: { article: NewsArticle; locale?: string }) {
  return (
    <Link
      href={`/${locale}/article/${article.slug || article.id}`}
      className="group flex items-start gap-3 border-b border-slate-100 py-3 last:border-0"
    >
      <div className="relative h-[54px] w-[72px] shrink-0 overflow-hidden bg-slate-100">
        {article.image && <Image src={article.image} alt="" fill sizes="72px" className="object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-red-700">{article.category}</p>
        <h4 className={`${serifFont.className} line-clamp-3 text-sm font-semibold leading-snug text-slate-900 group-hover:underline`}>
          {article.title}
        </h4>
        <p className="mt-1 text-xs text-slate-500">{formatRelativeTime(article.date.toString())}</p>
      </div>
    </Link>
  )
}

function MostReadItem({ article, rank, locale = 'bn' }: { article: NewsArticle; rank: number; locale?: string }) {
  return (
    <Link
      href={`/${locale}/article/${article.slug || article.id}`}
      className="group flex gap-4 border-t border-slate-200 py-3.5 first:border-t-0"
    >
      <span className="min-w-[28px] text-3xl font-extrabold leading-none text-red-600" style={headingFont}>
        {toDigitalNumber(rank)}
      </span>
      <h4 className="text-[15px] font-semibold leading-snug text-slate-900 group-hover:underline">{article.title}</h4>
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ArticlePage({
  initialArticle,
  initialRelated,
  initialMostRead,
  initialDbBlocks,
  slug: propSlug,
}: {
  initialArticle?: NewsArticle
  initialRelated?: NewsArticle[]
  initialMostRead?: NewsArticle[]
  initialDbBlocks?: DBBlockConfig[]
  slug?: string
}) {
  const params = useParams()
  const locale = (params.locale as string) || 'bn'
  const slug = (params.slug as string) || propSlug

  const [article, setArticle] = useState<NewsArticle | null>(initialArticle || null)
  const [relatedArticles, setRelatedArticles] = useState<NewsArticle[]>(initialRelated || [])
  const [mostRead, setMostRead] = useState<NewsArticle[]>(initialMostRead || [])
  const [dbBlocks, setDbBlocks] = useState<DBBlockConfig[]>(initialDbBlocks || [])
  const [isLoading, setIsLoading] = useState(!initialArticle)
  const [copied, setCopied] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)

  const shareRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLElement>(null)
  const progress = useReadingProgress(bodyRef)

  // Mermaid diagrams (client side)
  useEffect(() => {
    if (typeof window !== 'undefined' && article?.content) {
      import('mermaid')
        .then((m) => {
          m.default.initialize({ startOnLoad: true, theme: 'default' })
          setTimeout(() => {
            m.default.run().catch((err) => console.error('Mermaid rendering error:', err))
          }, 100)
        })
        .catch((err) => console.error('Failed to dynamically load mermaid:', err))
    }
  }, [article?.content])

  // Sync props / fetch by slug
  useEffect(() => {
    if (initialArticle) {
      setArticle(initialArticle)
      setIsLoading(false)
    } else if (slug) {
      setIsLoading(true)
      fetch(`/api/articles/slug/${slug}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && !data.error) setArticle(data)
        })
        .catch((err) => console.error('Error fetching article:', err))
        .finally(() => setIsLoading(false))
    }
    if (initialRelated) setRelatedArticles(initialRelated)
    if (initialMostRead) setMostRead(initialMostRead)
    if (initialDbBlocks) setDbBlocks(initialDbBlocks)
  }, [initialArticle, initialRelated, initialMostRead, initialDbBlocks, slug])

  useEffect(() => {
    if (dbBlocks.length === 0 && !initialDbBlocks) {
      fetch('/api/blocks?user=1')
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => (Array.isArray(data) ? setDbBlocks(data) : null))
        .catch(() => null)
    }
  }, [dbBlocks.length, initialDbBlocks])

  // Bookmark persists per article in this browser
  useEffect(() => {
    if (!article) return
    try {
      const saved: string[] = JSON.parse(localStorage.getItem('saved-articles') || '[]')
      setBookmarked(saved.includes(String(article.id)))
    } catch {
      /* ignore */
    }
  }, [article])

  const toggleBookmark = useCallback(() => {
    if (!article) return
    setBookmarked((prev) => {
      const next = !prev
      try {
        const saved: string[] = JSON.parse(localStorage.getItem('saved-articles') || '[]')
        const id = String(article.id)
        const updated = next ? Array.from(new Set([...saved, id])) : saved.filter((s) => s !== id)
        localStorage.setItem('saved-articles', JSON.stringify(updated))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [article])

  // Close share menu on outside click or Escape
  useEffect(() => {
    if (!shareOpen) return
    const onDown = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShareOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShareOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [shareOpen])

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked: ignore */
    }
  }, [])

  const handleShareTwitter = useCallback(() => {
    const text = encodeURIComponent(article?.title ?? '')
    const url = encodeURIComponent(window.location.href)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener,noreferrer')
  }, [article])

  const handleShareFacebook = useCallback(() => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
      '_blank',
      'noopener,noreferrer'
    )
  }, [])

  const handleShareLinkedin = useCallback(() => {
    const url = encodeURIComponent(window.location.href)
    const title = encodeURIComponent(article?.title ?? '')
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}`, '_blank', 'noopener,noreferrer')
  }, [article])

  const handleNativeShare = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: article?.title, text: article?.description, url: window.location.href })
      } catch {
        /* user cancelled the share sheet */
      }
    } else {
      setShareOpen((prev) => !prev)
    }
  }, [article])

  /* ---------------- loading / not found ---------------- */

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <div className="flex h-full flex-1 items-center justify-center">
          <PinwheelLoader size={100} color="#A8A8A8" />
        </div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-16 sm:px-6 lg:px-8">
          <Link href={`/${locale}`} className="mb-8 inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-red-700 hover:text-red-800">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to News
          </Link>
          <div className="text-center">
            <h1 className="mb-3 text-3xl font-bold text-slate-900">Article Not Found</h1>
            <p className="text-slate-600">The article you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const readTime = estimateReadTime(article.content)
  const categoryHref = `/${locale}/category/${encodeURIComponent(article.category)}`
  const showHero = Boolean(article.image) && !hasFirstImage(article.content)
  const iconBtn =
    'inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-300 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900'

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-content { max-width: 100% !important; }
        }
      `}</style>

      <Header />

      {/* Reading progress, fixed to the viewport top */}
      <div className="no-print fixed left-0 right-0 top-0 z-[60] h-1 bg-transparent" role="progressbar" aria-label="Reading progress" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-red-600 transition-[width] duration-100 ease-linear" style={{ width: `${progress}%` }} />
      </div>

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <div className="flex items-start gap-10 xl:gap-14">
            {/* ═════════ Article column ═════════ */}
            <div className="print-content min-w-0 flex-1">
              {/* Breadcrumb */}
              <nav aria-label="Breadcrumb" className="no-print mb-5 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                <Link href={`/${locale}`} className="shrink-0 hover:text-slate-900">Home</Link>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <Link href={categoryHref} className="shrink-0 capitalize hover:text-slate-900">{article.category}</Link>
              </nav>

              {/* Kicker + badges */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Link
                  href={categoryHref}
                  className="border-l-4 border-red-600 pl-2 text-xs font-extrabold uppercase tracking-wider text-red-700 hover:underline"
                >
                  {article.category}
                </Link>
                {article.breaking && (
                  <span className="bg-red-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">Breaking</span>
                )}
                {article.trending && (
                  <span className="flex items-center gap-1.5 border border-orange-300 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-orange-700">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" aria-hidden />
                    Trending
                  </span>
                )}
              </div>

              {/* Headline */}
              <h1 className="text-[32px] font-extrabold leading-[1.25] text-slate-900 md:text-[44px]" style={headingFont}>
                {article.title}
              </h1>

              {/* Standfirst: shown in full */}
              {article.description && (
                <p className="mt-4 text-lg leading-relaxed text-slate-600 md:text-xl">{article.description}</p>
              )}

              {/* Byline */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-slate-200 py-4">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/${locale}/author/${article.author_id}`}
                    aria-label={article.author}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white"
                  >
                    {authorInitials(article.author)}
                  </Link>
                  <div className="leading-tight">
                    <Link
                      href={`/${locale}/author/${article.author_id}`}
                      className={`${serifFont.className} text-[15px] font-bold text-slate-900 hover:text-red-700`}
                    >
                      {article.author}
                    </Link>
                    <p className="mt-1 text-xs text-slate-500">
                      <time dateTime={new Date(article.date).toISOString()} title={formatFullDate(article.date.toString())}>
                        {formatRelativeTime(article.date.toString())}
                      </time>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" aria-hidden />{readTime} min read</span>
                  <span className="flex items-center gap-1.5"><Eye className="h-4 w-4" aria-hidden />{toDigitalNumber(article.views ?? 0)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="no-print mt-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={toggleBookmark}
                  aria-pressed={bookmarked}
                  className={`${iconBtn} ${bookmarked ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-50' : ''}`}
                >
                  {bookmarked ? <BookmarkCheck className="h-4 w-4" aria-hidden /> : <Bookmark className="h-4 w-4" aria-hidden />}
                  {bookmarked ? 'Saved' : 'Save'}
                </button>
                <button onClick={() => window.print()} className={`${iconBtn} hidden sm:inline-flex`}>
                  <Printer className="h-4 w-4" aria-hidden /> Print
                </button>
                <div className="relative" ref={shareRef}>
                  <button onClick={handleNativeShare} aria-haspopup="menu" aria-expanded={shareOpen} className={iconBtn}>
                    <Share2 className="h-4 w-4" aria-hidden /> Share
                  </button>
                  {shareOpen && (
                    <ShareMenu
                      copied={copied}
                      onCopy={handleCopyLink}
                      onTwitter={handleShareTwitter}
                      onFacebook={handleShareFacebook}
                      onLinkedin={handleShareLinkedin}
                    />
                  )}
                </div>
              </div>

              {/* Hero image */}
              {showHero && (
                <figure className="mt-6">
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                    <Image
                      src={article.image}
                      alt={article.title}
                      fill
                      priority
                      sizes="(min-width: 1024px) 720px, 100vw"
                      className="object-cover"
                    />
                  </div>
                  {article.imageCaption && (
                    <figcaption className="mt-2 border-l-2 border-red-600 pl-3 text-sm leading-relaxed text-slate-600">
                      {article.imageCaption}
                    </figcaption>
                  )}
                </figure>
              )}

              {/* Body: constrained to a comfortable reading width */}
              <article ref={bodyRef} className="mx-auto max-w-[44rem] break-words pb-6 pt-2 lg:mx-0">
                <ArticleMarkdown content={article.content} dbBlocks={dbBlocks} />
              </article>

              {/* Reactions */}
              <div className="no-print my-8 border-y border-slate-200 py-8">
                <p className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-600">What do you think?</p>
                <ReactionButtons articleId={article.id} />
              </div>

              {/* Bottom share bar */}
              <div className="no-print mb-12 flex flex-wrap items-center gap-3">
                <span className="text-sm font-bold uppercase tracking-widest text-slate-900">Share</span>
                <button onClick={handleShareTwitter} aria-label="Share on X / Twitter" className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"><FaTwitter className="h-4 w-4" aria-hidden /></button>
                <button onClick={handleShareFacebook} aria-label="Share on Facebook" className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"><FaFacebook className="h-4 w-4" aria-hidden /></button>
                <button onClick={handleShareLinkedin} aria-label="Share on LinkedIn" className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"><FaLinkedinIn className="h-4 w-4" aria-hidden /></button>
                <button onClick={handleCopyLink} aria-label="Copy link" className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900">
                  {copied ? <Check className="h-4 w-4 text-green-600" aria-hidden /> : <LinkIcon className="h-4 w-4" aria-hidden />}
                </button>
              </div>

              {/* Comments */}
              <div className="no-print mb-16" id="comments">
                <CommentsSection articleId={article.id} />
              </div>

              {/* More in category */}
              {relatedArticles.length > 0 && (
                <section className="no-print border-t-4 border-slate-900 pt-3" aria-labelledby="more-in">
                  <h2 id="more-in" className="mb-6 flex items-center gap-3 text-2xl font-extrabold text-slate-900">
                    <span aria-hidden className="inline-block h-6 w-2 bg-red-600" />
                    More in {article.category}
                  </h2>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {relatedArticles.slice(0, 3).map((a) => (
                      <NewsCard key={a.id} article={a} variant="default" locale={locale} />
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* ═════════ Sidebar ═════════ */}
            <aside className="no-print hidden w-72 shrink-0 flex-col gap-10 lg:flex xl:w-80">
              {mostRead.length > 0 && (
                <section aria-labelledby="most-read" className="bg-slate-50 p-5">
                  <h3 id="most-read" className="mb-2 flex items-center gap-2 text-lg font-extrabold text-slate-900">
                    <span aria-hidden className="inline-block h-5 w-1.5 bg-red-600" />
                    Most Read
                  </h3>
                  <div>
                    {mostRead.slice(0, 5).map((a, i) => (
                      <MostReadItem key={a.id} article={a} rank={i + 1} locale={locale} />
                    ))}
                  </div>
                </section>
              )}

              {/* Newsletter (form is a placeholder: wire to your subscribe endpoint) */}
              <section aria-labelledby="newsletter" className="bg-slate-900 p-6 text-white">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-red-400">Newsletter</p>
                <h3 id="newsletter" className="mb-2 text-lg font-bold leading-snug" style={headingFont}>Stay informed daily</h3>
                <p className="mb-4 text-sm leading-relaxed text-slate-300">Our best stories, delivered to your inbox every morning.</p>
                <form onSubmit={(e) => e.preventDefault()} className="space-y-2">
                  <label htmlFor="nl-email" className="sr-only">Email address</label>
                  <input
                    id="nl-email"
                    type="email"
                    required
                    placeholder="your@email.com"
                    className="min-h-[44px] w-full border border-slate-600 bg-slate-800 px-3 text-sm text-white placeholder-slate-400 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                  />
                  <button
                    type="submit"
                    className="min-h-[44px] w-full bg-red-600 text-sm font-bold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    Subscribe free
                  </button>
                </form>
              </section>

              {relatedArticles.length > 0 && (
                <section aria-labelledby="related">
                  <h3 id="related" className="mb-3 flex items-center gap-2 border-t-4 border-slate-900 pt-2 text-lg font-extrabold text-slate-900">
                    <span aria-hidden className="inline-block h-5 w-1.5 bg-red-600" />
                    Related
                  </h3>
                  <div className="mb-3">
                    {relatedArticles.slice(0, 3).map((a) => (
                      <RelatedItem key={a.id} article={a} locale={locale} />
                    ))}
                  </div>
                  <Link
                    href={categoryHref}
                    className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold text-red-700 hover:text-red-800"
                  >
                    See all {article.category} stories
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </Link>
                </section>
              )}
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}