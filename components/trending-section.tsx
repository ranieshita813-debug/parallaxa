'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { NewsArticle, getTrendingArticles } from '@/lib/db/articles'
import { Flame } from 'lucide-react'
import { toDigitalNumber } from '@/components/news-card'

export function TrendingSection() {
  const [trendingArticles, setTrendingArticles] = useState<NewsArticle[]>([])
  const params = useParams()
  const locale = (params?.locale as string) || 'bn'
  const isBn = locale === 'bn' || !locale

  useEffect(() => {
    async function load() {
      const articles = await getTrendingArticles()
      setTrendingArticles(articles)
    }
    load()
  }, [])

  if (trendingArticles.length === 0) return null

  return (
    <div className="bg-gray-50 border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Flame className="w-5 h-5 text-red-600" />
        <h2 className="text-lg font-bold text-foreground">
          {isBn ? 'ট্রেন্ডিং সংবাদ' : 'Trending Now'}
        </h2>
      </div>

      <div className="space-y-4">
        {trendingArticles.map((article, index) => (
          <Link key={article.id} href={`/${locale}/article/${article.slug || article.id}`}>
            <div className="group cursor-pointer pb-4 border-b border-gray-200 last:border-0 last:pb-0">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-red-600 text-white flex items-center justify-center text-xs font-bold">
                  {toDigitalNumber(index + 1, undefined, locale)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-red-600 transition-colors text-sm">
                    {article.title}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {toDigitalNumber(article.views, isBn ? 'বার পঠিত' : 'views', locale)}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <Link href={`/${locale}/search?trending=true`} className="block mt-4 pt-4 border-t border-gray-200">
        <button className="w-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
          {isBn ? 'সকল ট্রেন্ডিং দেখুন →' : 'View All Trending →'}
        </button>
      </Link>
    </div>
  )
}
