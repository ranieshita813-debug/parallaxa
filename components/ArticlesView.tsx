'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
} from 'lucide-react'

interface MyArticle {
  id: string | number
  title: string
  slug: string
  image ? : string | null
  date: string
  views ? : number | null
}

const LIMIT = 12

const dateFormat = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

function Thumbnail({ src }: { src ? : string | null }) {
  const [failed, setFailed] = useState(false)
  
  if (!src || failed) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:h-20 sm:w-28">
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
      className="h-16 w-16 shrink-0 rounded-lg bg-muted object-cover sm:h-20 sm:w-28"
    />
  )
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-3 sm:p-4" aria-hidden>
      <div className="h-16 w-16 shrink-0 animate-pulse rounded-lg bg-muted sm:h-20 sm:w-28" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-9 w-9 animate-pulse rounded-md bg-muted" />
    </div>
  )
}

const ArticlesView = () => {
  const router = useRouter()
  const [articles, setArticles] = useState < MyArticle[] > ([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [page, setPage] = useState(1)
  
  const fetchArticles = useCallback(
    async (signal ? : AbortSignal) => {
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
          // An aborted request must not flip loading off for the newer one.
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
  
  const hasNext = articles.length === LIMIT
  const hasPrev = page > 1
  
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight">My articles</h2>
      </div>

      <div className="space-y-3" aria-busy={loading}>
        {/* Loading */}
        {loading && Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)}

        {/* Error */}
        {!loading && error && (
          <div
            role="alert"
            className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
          >
            <AlertCircle className="h-8 w-8 text-destructive" aria-hidden />
            <div>
              <p className="font-semibold">Couldn&apos;t load your articles</p>
              <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
            </div>
            <Button variant="outline" onClick={() => fetchArticles()}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
              Retry
            </Button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && articles.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" aria-hidden />
            <div>
              <p className="font-semibold">{page > 1 ? 'No more articles' : 'No articles yet'}</p>
              <p className="text-sm text-muted-foreground">
                {page > 1 ? 'Go back to the previous page.' : 'Articles you write will show up here.'}
              </p>
            </div>
            {page === 1 && (
              <Button asChild>
                <Link href="/write">Write an article</Link>
              </Button>
            )}
          </div>
        )}

        {/* List */}
        {!loading &&
          !error &&
          articles.map((ar) => (
            <article
              key={ar.id}
              className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/40 sm:gap-4 sm:p-4"
            >
              <Thumbnail src={ar.image} />

              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base">
                  <Link
                    href={`/article/${ar.slug}`}
                    className="focus-visible:outline-none focus-visible:underline"
                  >
                    {ar.title}
                  </Link>
                </h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                    <time dateTime={ar.date}>{dateFormat.format(new Date(ar.date))}</time>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                    {(ar.views || 0).toLocaleString()} views
                  </span>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
                    <span className="sr-only">Open actions for {ar.title}</span>
                    <MoreHorizontal className="h-4 w-4" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px]">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => router.push(`/article/${ar.slug}`)}
                    className="cursor-pointer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                    View article
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push(`/write?id=${ar.id}`)}
                    className="cursor-pointer"
                  >
                    <Pencil className="mr-2 h-4 w-4" aria-hidden />
                    Edit article
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {/* TODO: not wired in the original either. Connect to your delete endpoint. */}
                  <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </article>
          ))}
      </div>

      {(hasPrev || hasNext) && (
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
                className={hasPrev ? 'cursor-pointer' : 'pointer-events-none opacity-50'}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink isActive>{page}</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={!hasNext}
                onClick={(e) => {
                  e.preventDefault()
                  if (hasNext) setPage((p) => p + 1)
                }}
                className={hasNext ? 'cursor-pointer' : 'pointer-events-none opacity-50'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}

export default ArticlesView