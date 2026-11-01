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
  Sparkle,
  Article,
  CaretRight,
  FolderOpen,
  ArrowUpRight
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

function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  badgeText,
  isBn,
}: {
  label: string
  value: number
  subtext?: string
  icon: React.ElementType
  badgeText?: string
  isBn: boolean
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs hover:shadow-md transition-all group">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950 mt-1">
            {isBn ? toBanglaNumber(value) : value.toLocaleString()}
          </p>
          {subtext && (
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              {subtext}
            </p>
          )}
        </div>
        <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-slate-950 text-slate-700 group-hover:text-white flex items-center justify-center transition-colors shrink-0 shadow-xs">
          <Icon size={24} weight="duotone" aria-hidden />
        </div>
      </div>

      {badgeText && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>{badgeText}</span>
          <ArrowUpRight size={14} className="text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>
      )}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-3xl bg-slate-100" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-80 animate-pulse rounded-3xl bg-slate-100 lg:col-span-2" />
        <div className="h-80 animate-pulse rounded-3xl bg-slate-100" />
      </div>
    </div>
  )
}

export default function DashboardOverview() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [error, setError] = useState(false)
  const params = useParams()
  const rawLocale = params?.locale
  const locale = (Array.isArray(rawLocale) ? rawLocale[0] : rawLocale) || 'bn'
  const isBn = locale === 'bn'

  const load = useCallback(async (signal?: AbortSignal) => {
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
        className="flex flex-col items-center gap-4 rounded-3xl border border-red-200 bg-red-50/60 px-6 py-16 text-center"
      >
        <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
          <WarningCircle size={28} weight="duotone" aria-hidden />
        </div>
        <div>
          <p className="font-extrabold text-slate-900 text-base">
            {isBn ? 'ড্যাশবোর্ড তথ্য লোড করা যায়নি' : "Couldn't load the dashboard"}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {isBn ? 'ইন্টারনেট সংযোগ পরীক্ষা করুন এবং পুনরায় চেষ্টা করুন।' : 'Check your connection and try again.'}
          </p>
        </div>
        <button
          onClick={() => {
            setData(null)
            load()
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-slate-800 shadow-xs"
        >
          <ArrowClockwise size={15} weight="bold" aria-hidden />
          {isBn ? 'পুনরায় চেষ্টা করুন' : 'Retry'}
        </button>
      </div>
    )
  }

  if (!data) return <Skeleton />

  const { stats, recentArticles } = data
  const maxViews = Math.max(1, ...recentArticles.map((a) => a.views || 0))

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full text-slate-200">
            <Sparkle size={13} weight="fill" className="text-amber-400" />
            {isBn ? 'লাইভ কন্ট্রোল প্যানেল' : 'Live Operations'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isBn ? 'স্বাগতম অ্যাডমিন ড্যাশবোর্ডে' : 'Welcome to the Dashboard'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            {isBn
              ? 'ওয়েবসাইটের মোট নিবন্ধ, পাঠকদের সক্রিয় ভিউ এবং সিস্টেমে যুক্ত থাকা সদস্যদের হালনাগাদ তথ্যাদি।'
              : 'Monitor published stories, audience reader trends, custom pages, and system health in real-time.'}
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <Link
            href={`/${locale}/write`}
            className="inline-flex items-center gap-2 rounded-xl bg-white text-slate-950 px-5 py-2.5 text-xs sm:text-sm font-extrabold hover:bg-slate-100 transition-all shadow-md active:scale-95"
          >
            <Plus size={16} weight="bold" />
            {isBn ? 'নতুন নিবন্ধ লিখুন' : 'Create Article'}
          </Link>
          <Link
            href={`/${locale}/dashboard?tab=analysis`}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 text-xs sm:text-sm font-bold transition-all border border-white/10"
          >
            <TrendUp size={16} />
            {isBn ? 'অ্যানালাইসিস' : 'Analytics'}
          </Link>
        </div>

        {/* Background ambient pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-96 opacity-10 pointer-events-none flex items-center justify-center">
          <TrendUp size={280} weight="duotone" />
        </div>
      </div>

      {/* Top 3 Core Metric Cards */}
      <section aria-label="Key Metrics" className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <StatCard
          label={isBn ? 'মোট নিবন্ধ' : 'Total Articles'}
          value={stats.articles}
          subtext={isBn ? 'সর্বমোট প্রকাশিত ও সংরক্ষিত লেখা' : 'Published stories on portal'}
          icon={FileText}
          badgeText={isBn ? 'নিবন্ধ তালিকা দেখুন' : 'View all articles'}
          isBn={isBn}
        />
        <StatCard
          label={isBn ? 'মোট পাঠক ভিউ' : 'Total Views'}
          value={stats.views}
          subtext={isBn ? 'লাইভ রিডার এনগেজমেন্ট' : 'Accumulated readership views'}
          icon={Eye}
          badgeText={isBn ? 'ভিউ ট্রেন্ডস বিশ্লেষণ' : 'Detailed trend report'}
          isBn={isBn}
        />
        <StatCard
          label={isBn ? 'মোট ব্যবহারকারী' : 'Total Users'}
          value={stats.users}
          subtext={isBn ? 'নিবন্ধিত সদস্য ও প্রশাসক' : 'Registered members and admins'}
          icon={Users}
          badgeText={isBn ? 'সদস্য তালিকা ও অনুমতি' : 'Manage users & roles'}
          isBn={isBn}
        />
      </section>

      {/* Bottom Layout: Recent Articles & Action Panel */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 items-start">
        {/* Recent Articles Stream */}
        <section
          aria-labelledby="recent-articles-heading"
          className="rounded-3xl border border-slate-200/80 bg-white overflow-hidden shadow-xs lg:col-span-2"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-200/80 text-slate-800 flex items-center justify-center">
                <Clock size={16} weight="bold" />
              </div>
              <div>
                <h3 id="recent-articles-heading" className="text-sm font-extrabold text-slate-900">
                  {isBn ? 'সাম্প্রতিক নিবন্ধসমূহ' : 'Recent Articles'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {isBn ? 'সর্বশেষ প্রকাশিত ও পাঠকদের পাঠের পরিসংখ্যান' : 'Latest published content & reader statistics'}
                </p>
              </div>
            </div>

            <Link
              href={`/${locale}/dashboard?tab=articles`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 hover:text-slate-600 transition-colors bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs"
            >
              <span>{isBn ? 'সব দেখুন' : 'View All'}</span>
              <ArrowRight size={13} weight="bold" />
            </Link>
          </div>

          {recentArticles.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                <PencilSimpleLine size={24} weight="duotone" />
              </div>
              <div>
                <p className="font-extrabold text-slate-800 text-sm">
                  {isBn ? 'এখনো কোনো নিবন্ধ তৈরি করা হয়নি' : 'No articles yet'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {isBn ? 'আপনার প্রথম নিবন্ধটি লিখে ওয়েবসাইটে প্রকাশ করুন।' : 'Write your first article and publish it.'}
                </p>
              </div>
              <Link
                href={`/${locale}/write`}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                <Plus size={14} weight="bold" />
                {isBn ? 'নিবন্ধ লিখুন' : 'Write Now'}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentArticles.map((article) => {
                const pct = Math.round(((article.views || 0) / maxViews) * 100)
                const articleDate = new Date(article.created_at)
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
                  <div
                    key={article.id}
                    className="p-5 hover:bg-slate-50/70 transition-all flex flex-col gap-3 group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/${locale}/write?id=${article.id}`}
                          className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1"
                        >
                          {article.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-medium">
                          <span>{formattedDate}</span>
                          <span>•</span>
                          <span className="text-slate-600 font-mono">ID #{article.id}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                          <Eye size={13} weight="bold" className="text-slate-500" />
                          {isBn ? toBanglaNumber(article.views || 0) : (article.views || 0).toLocaleString()}
                        </span>
                        <Link
                          href={`/${locale}/write?id=${article.id}`}
                          className="p-1 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition-colors"
                          title={isBn ? 'সম্পাদনা করুন' : 'Edit'}
                        >
                          <PencilSimpleLine size={16} />
                        </Link>
                      </div>
                    </div>

                    {/* Progress Bar indicating relative popular engagement */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-slate-950 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Quick Launchpad & Utility Card */}
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
                <FolderOpen size={18} weight="duotone" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  {isBn ? 'কুইক শর্টকাট' : 'Quick Launchpad'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {isBn ? 'সরাসরি প্রয়োজনীয় বিভাগে প্রবেশ' : 'Jump directly into portal tools'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Link
                href={`/${locale}/dashboard?tab=pages`}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-slate-100 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-slate-900"></span>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-slate-950">
                    {isBn ? 'কাস্টম পেইজ তৈরি করুন' : 'Custom Pages Manager'}
                  </span>
                </div>
                <CaretRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href={`/${locale}/dashboard?tab=database`}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-slate-100 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-slate-900"></span>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-slate-950">
                    {isBn ? 'ডাটাবেস টেবিল ও কুয়েরি' : 'PostgreSQL Database'}
                  </span>
                </div>
                <CaretRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href={`/${locale}/dashboard?tab=home-manager`}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-slate-100 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-slate-900"></span>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-slate-950">
                    {isBn ? 'হোম সেকশন কনফিগারেশন' : 'Homepage Section Blocks'}
                  </span>
                </div>
                <CaretRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href={`/${locale}/admin/settings`}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-slate-100 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-slate-900"></span>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-slate-950">
                    {isBn ? 'এআই ও সিস্টেম সেটিংস' : 'System & API Settings'}
                  </span>
                </div>
                <CaretRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
