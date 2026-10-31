'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
  FileText,
  Eye,
  Users,
  TrendUp,
  Clock,
  ArrowRight,
  Plus,
  WarningCircle,
  ArrowClockwise,
  PencilSimpleLine,
} from '@phosphor-icons/react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Stats {
  articles: number
  views: number
  users: number
}

interface RecentArticle {
  id: number
  title: string
  views: number
  created_at: string
}

interface OverviewData {
  stats: Stats
  recentArticles: RecentArticle[]
}

const numberFormat = new Intl.NumberFormat()
const compactFormat = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 })
const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: React.ElementType
  tone: { text: string;bg: string;bar: string }
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5">
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${tone.bar}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900" title={numberFormat.format(value)}>
            {value >= 100_000 ? compactFormat.format(value) : numberFormat.format(value)}
          </p>
        </div>
        <div className={`${tone.bg} ${tone.text} rounded-xl p-3`}>
          <Icon size={24} weight="duotone" aria-hidden />
        </div>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[104px] animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-72 animate-pulse rounded-2xl bg-slate-100 lg:col-span-2" />
        <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function DashboardOverview() {
  const [data, setData] = useState < OverviewData | null > (null)
  const [error, setError] = useState(false)
  const params = useParams()
  const rawLocale = params?.locale
  const locale = (Array.isArray(rawLocale) ? rawLocale[0] : rawLocale) || 'bn'
  
  const load = useCallback(async (signal ? : AbortSignal) => {
    try {
      setError(false)
      const res = await fetch('/api/admin/stats', { signal })
      if (!res.ok) throw new Error('Failed to fetch stats')
      const json = await res.json()
      if (json && !json.error && json.stats && Array.isArray(json.recentArticles)) {
        setData(json)
      } else {
        throw new Error(json?.error || 'Invalid data structure')
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      console.error(err)
      // Show a real error state instead of pretending everything is zero.
      setError(true)
    }
  }, [])
  
  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])
  
  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-6 py-14 text-center"
      >
        <WarningCircle size={36} weight="duotone" className="text-red-600" aria-hidden />
        <div>
          <p className="font-bold text-slate-900">Couldn&apos;t load the dashboard</p>
          <p className="text-sm text-slate-600">Check your connection and try again.</p>
        </div>
        <button
          onClick={() => {
            setData(null)
            load()
          }}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          <ArrowClockwise size={16} weight="bold" aria-hidden /> Retry
        </button>
      </div>
    )
  }
  
  if (!data) return <Skeleton />
  
  const { stats, recentArticles } = data
  const maxViews = Math.max(1, ...recentArticles.map((a) => a.views || 0))
  
  const statCards = [
    { label: 'Total articles', value: stats.articles, icon: FileText, tone: { text: 'text-blue-700', bg: 'bg-blue-50', bar: 'bg-blue-600' } },
    { label: 'Total views', value: stats.views, icon: Eye, tone: { text: 'text-violet-700', bg: 'bg-violet-50', bar: 'bg-violet-600' } },
    { label: 'Total users', value: stats.users, icon: Users, tone: { text: 'text-orange-700', bg: 'bg-orange-50', bar: 'bg-orange-500' } },
  ]
  
  return (
    <div className="space-y-6">
      {/* Stats */}
      <section aria-label="Overview" className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {statCards.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent articles */}
        <section aria-labelledby="recent" className="overflow-hidden rounded-2xl border border-slate-200 bg-white lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 id="recent" className="flex items-center gap-2 font-bold text-slate-900">
              <Clock size={20} className="text-slate-400" aria-hidden />
              Recent articles
            </h2>
            <Link
              href={`/${locale}/dashboard#articles`}
              className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              View all <ArrowRight size={14} aria-hidden />
            </Link>
          </div>

          {recentArticles.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <PencilSimpleLine size={32} className="text-slate-400" aria-hidden />
              <div>
                <p className="font-semibold text-slate-900">No articles yet</p>
                <p className="text-sm text-slate-600">Your latest articles will appear here.</p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentArticles.map((article) => {
                const pct = Math.round(((article.views || 0) / maxViews) * 100)
                return (
                  <li key={article.id} className="px-5 py-4 transition-colors hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 font-semibold leading-snug text-slate-900">{article.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          <time dateTime={article.created_at}>{dateFormat.format(new Date(article.created_at))}</time>
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-slate-700">
                        <Eye size={16} className="text-slate-400" aria-hidden />
                        {numberFormat.format(article.views || 0)}
                      </div>
                    </div>
                    {/* Relative views, scaled to the most-viewed recent article */}
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                      <div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* CTA */}
        <section className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-slate-900 p-7 text-white">
          <div className="relative z-10">
            <h2 className="text-2xl font-extrabold leading-tight">Ready to publish?</h2>
            <p className="mt-2 max-w-xs text-slate-300">Create a new article and reach your audience today.</p>
          </div>
          <Link
            href={`/${locale}/write`}
            className="relative z-10 mt-8 inline-flex min-h-[44px] w-fit items-center gap-2 rounded-xl bg-white px-6 font-bold text-slate-900 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            Start writing
            <Plus size={20} weight="bold" aria-hidden />
          </Link>
          <div className="absolute -bottom-8 -right-8 opacity-10" aria-hidden>
            <TrendUp size={200} weight="bold" />
          </div>
        </section>
      </div>
    </div>
  )
}