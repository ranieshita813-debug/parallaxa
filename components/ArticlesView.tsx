'use client'

import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  AlertCircle,
  CalendarDays,
  ExternalLink,
  Eye,
  FileText,
  ImageOff,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Trash2,
  Search,
  Plus,
  X
} from 'lucide-react'

interface MyArticle {
  id: string | number
  title: string
  slug: string
  image?: string | null
  date: string
  views?: number | null
}

const LIMIT = 12

const bnDigits: { [key: string]: string } = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
}

function toBanglaNumber(n: number | string): string {
  const s = n.toLocaleString('en-US')
  return s.replace(/\d/g, (d) => bnDigits[d] || d)
}

function Thumbnail({ src }: { src?: string | null }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className="flex h-16 w-16 sm:h-20 sm:w-28 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 border border-slate-200/60">
        <ImageOff className="h-5 w-5" aria-hidden />
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-16 w-16 sm:h-20 sm:w-28 shrink-0 rounded-2xl bg-slate-100 object-cover border border-slate-200/60"
    />
  )
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4" aria-hidden>
      <div className="h-16 w-16 sm:h-20 sm:w-28 shrink-0 animate-pulse rounded-2xl bg-slate-100" />
      <div className="flex-1 space-y-2.5">
        <div className="h-4 w-3/4 animate-pulse rounded-md bg-slate-100" />
        <div className="h-3 w-1/3 animate-pulse rounded-md bg-slate-100" />
      </div>
      <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-100" />
    </div>
  )
}

const ArticlesView = () => {
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) || 'bn'
  const isBn = locale === 'bn'

  const [articles, setArticles] = useState<MyArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchArticles = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setLoading(true)
        setError(false)
        const response = await fetch(`/api/articles/mine?page=${page}&limit=${LIMIT}`, { signal })
        if (!response.ok) throw new Error(`Request failed: ${response.status}`)
        const data = await response.json()
        setArticles(Array.isArray(data) ? data : data.articles || [])
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
        console.error('Fetch error:', e)
        setError(true)
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [page]
  )

  useEffect(() => {
    const controller = new AbortController()
    fetchArticles(controller.signal)
    return () => controller.abort()
  }, [fetchArticles])

  const filteredArticles = articles.filter((a) =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const hasNext = articles.length === LIMIT
  const hasPrev = page > 1

  return (
    <div className="w-full space-y-6">
      {/* Top Header & Search bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            {isBn ? 'আমার নিবন্ধসমূহ' : 'My Published Articles'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isBn
              ? 'আপনার অ্যাকাউন্টের মাধ্যমে তৈরিকৃত এবং প্রকাশিত লেখার ব্যবস্থাপনা।'
              : 'Browse, manage, edit, or remove your published articles.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/write`}
            className="inline-flex items-center gap-2 bg-slate-950 text-white hover:bg-slate-800 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-95"
          >
            <Plus size={16} />
            <span>{isBn ? 'নতুন নিবন্ধ লিখুন' : 'New Article'}</span>
          </Link>
        </div>
      </div>

      {/* Filter and live search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
        <div className="flex items-center gap-2.5 px-3 flex-1">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder={isBn ? 'শিরোনাম দিয়ে নিবন্ধ খুঁজুন...' : 'Search articles by title...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-xs sm:text-sm outline-none text-slate-800 placeholder:text-slate-400"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 px-2 self-end sm:self-auto">
          <span className="text-xs text-slate-500 font-medium">
            {isBn
              ? `মোট ${toBanglaNumber(filteredArticles.length)} টি নিবন্ধ দৃশ্যমান`
              : `${filteredArticles.length} articles displayed`}
          </span>
          <button
            onClick={() => fetchArticles()}
            disabled={loading}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors"
            title={isBn ? 'রিফ্রেশ' : 'Refresh'}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Article List / Empty State */}
      <div className="space-y-3" aria-busy={loading}>
        {loading && Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)}

        {!loading && error && (
          <div
            role="alert"
            className="flex flex-col items-center gap-3 rounded-3xl border border-red-200 bg-red-50/60 px-6 py-14 text-center"
          >
            <AlertCircle className="h-8 w-8 text-red-600" aria-hidden />
            <div>
              <p className="font-extrabold text-slate-900 text-sm">
                {isBn ? 'নিবন্ধ তালিকা লোড করা যায়নি' : "Couldn't load your articles"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {isBn ? 'ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।' : 'Check your connection and try again.'}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => fetchArticles()}
              className="rounded-xl border-slate-300 text-xs font-bold"
            >
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
              {isBn ? 'পুনরায় চেষ্টা করুন' : 'Retry'}
            </Button>
          </div>
        )}

        {!loading && !error && filteredArticles.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <FileText className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <p className="font-extrabold text-slate-900 text-sm">
                {searchTerm
                  ? (isBn ? 'কোনো নিবন্ধের মিল পাওয়া যায়নি' : 'No matching articles')
                  : page > 1
                  ? (isBn ? 'আর কোনো নিবন্ধ নেই' : 'No more articles')
                  : (isBn ? 'এখনো কোনো নিবন্ধ লেখেননি' : 'No articles yet')}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {searchTerm
                  ? (isBn ? 'ভিন্ন কোনো শব্দ লিখে চেষ্টা করুন।' : 'Try different keywords.')
                  : (isBn ? 'আপনার প্রথম নিবন্ধটি লিখে প্রকাশ করুন।' : 'Articles you write will show up here.')}
              </p>
            </div>
            {!searchTerm && page === 1 && (
              <Button asChild className="rounded-xl bg-slate-950 text-white hover:bg-slate-800 text-xs font-bold mt-2">
                <Link href={`/${locale}/write`}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  {isBn ? 'নতুন নিবন্ধ লিখুন' : 'Write an article'}
                </Link>
              </Button>
            )}
          </div>
        )}

        {!loading &&
          !error &&
          filteredArticles.map((ar) => {
            const articleDate = new Date(ar.date)
            const formattedDate = isBn
              ? articleDate.toLocaleDateString('bn-BD', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : articleDate.toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })

            return (
              <article
                key={ar.id}
                className="group flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white p-4 transition-all hover:shadow-md hover:border-slate-300"
              >
                <Thumbnail src={ar.image} />

                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    <Link
                      href={`/${locale}/article/${ar.slug}`}
                      className="focus-visible:outline-none focus-visible:underline"
                    >
                      {ar.title}
                    </Link>
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                      <time dateTime={ar.date}>{formattedDate}</time>
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-lg text-slate-700 font-semibold">
                      <Eye className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                      {isBn ? toBanglaNumber(ar.views || 0) : (ar.views || 0).toLocaleString()} {isBn ? 'ভিউ' : 'views'}
                    </span>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-xl hover:bg-slate-100">
                      <span className="sr-only">Actions</span>
                      <MoreHorizontal className="h-4 w-4 text-slate-600" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[190px] rounded-2xl shadow-lg border-slate-200">
                    <DropdownMenuLabel className="text-xs text-slate-400 font-bold uppercase">
                      {isBn ? 'অ্যাকশনসমূহ' : 'Actions'}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => router.push(`/${locale}/article/${ar.slug}`)}
                      className="cursor-pointer text-xs font-semibold"
                    >
                      <ExternalLink className="mr-2 h-4 w-4 text-slate-500" aria-hidden />
                      {isBn ? 'নিবন্ধ দেখুন' : 'View article'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push(`/${locale}/write?id=${ar.id}`)}
                      className="cursor-pointer text-xs font-semibold"
                    >
                      <Pencil className="mr-2 h-4 w-4 text-slate-500" aria-hidden />
                      {isBn ? 'সম্পাদনা করুন' : 'Edit article'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={async () => {
                        if (!confirm(isBn ? 'আপনি কি নিশ্চিত এই নিবন্ধটি মুছে ফেলতে চান?' : 'Are you sure you want to delete this article?')) return
                        try {
                          const res = await fetch(`/api/articles/${ar.id}`, { method: 'DELETE' })
                          if (res.ok) {
                            setArticles((prev) => prev.filter((x) => x.id !== ar.id))
                          } else {
                            alert(isBn ? 'নিবন্ধটি মুছে ফেলা ব্যর্থ হয়েছে' : 'Failed to delete article')
                          }
                        } catch (err) {
                          console.error('Delete error:', err)
                          alert(isBn ? 'নিবন্ধটি মুছে ফেলা ব্যর্থ হয়েছে' : 'Failed to delete article')
                        }
                      }}
                      className="cursor-pointer text-xs font-semibold text-red-600 focus:text-red-700"
                    >
                      <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                      {isBn ? 'মুছে ফেলুন' : 'Delete'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </article>
            )
          })}
      </div>

      {/* Pagination */}
      {(hasPrev || hasNext) && (
        <div className="pt-2">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  aria-disabled={!hasPrev}
                  onClick={(e) => {
                    e.preventDefault()
                    if (hasPrev) setPage((p) => p - 1)
                  }}
                  className={hasPrev ? 'cursor-pointer rounded-xl' : 'pointer-events-none opacity-40 rounded-xl'}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink isActive className="rounded-xl bg-slate-950 text-white font-bold">
                  {isBn ? toBanglaNumber(page) : page}
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  aria-disabled={!hasNext}
                  onClick={(e) => {
                    e.preventDefault()
                    if (hasNext) setPage((p) => p + 1)
                  }}
                  className={hasNext ? 'cursor-pointer rounded-xl' : 'pointer-events-none opacity-40 rounded-xl'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}

export default ArticlesView
