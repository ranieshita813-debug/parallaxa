'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useParams } from 'next/navigation'
import Link from 'next/link'
import { NewsCard, toDigitalNumber } from '@/components/news-card'
import { NewsArticle } from '@/lib/db/articles'
import { ArrowLeft, Search as SearchIcon } from 'lucide-react'

export function SearchContent() {
  const searchParams = useSearchParams()
  const params = useParams()
  const locale = (params?.locale as string) || 'bn'
  const isBn = locale === 'bn' || !locale

  const query = searchParams.get('q') || ''
  const category = searchParams.get('category') || ''
  const [results, setResults] = useState<NewsArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (query.trim()) {
        try {
          setIsLoading(true)
          const catParam = category ? `&category=${encodeURIComponent(category)}` : ''
          const res = await fetch(`/api/articles/search?q=${encodeURIComponent(query.trim())}${catParam}`)
          if (res.ok) {
            const data = await res.json()
            setResults(Array.isArray(data.articles) ? data.articles : [])
          } else {
            setResults([])
          }
        } catch (e) {
          console.error('Failed to search articles:', e)
          setResults([])
        } finally {
          setIsLoading(false)
        }
      } else {
        setResults([])
        setIsLoading(false)
      }
    }
    load()
  }, [query, category])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href={`/${locale}`} className="flex items-center gap-2 text-red-600 hover:text-red-700 mb-8 text-sm font-semibold">
        <ArrowLeft className="w-4 h-4" />
        {isBn ? 'হোম পেজে ফিরে যান' : 'Back to Home'}
      </Link>

      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <SearchIcon className="w-6 h-6 text-foreground" />
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            {isBn ? 'অনুসন্ধানের ফলাফল' : 'Search Results'}
          </h1>
        </div>
        {query && (
          <p className="text-lg text-gray-600">
            {isBn ? 'অনুসন্ধান করা শব্দ:' : 'Results for:'} <span className="font-semibold text-foreground">"{query}"</span>
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-48 animate-pulse" />
          ))}
        </div>
      ) : !query ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">
            {isBn ? 'সংবাদ খুঁজতে অনুসন্ধান বক্সে লিখুন।' : 'Enter a search query to find articles.'}
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-12">
          <SearchIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            {isBn ? 'কোনো ফলাফল পাওয়া যায়নি' : 'No results found'}
          </h2>
          <p className="text-gray-600 mb-6">
            {isBn ? `"${query}" এর সাথে মেলে এমন কোনো নিবন্ধ পাওয়া যায়নি` : `We couldn't find any articles matching "${query}"`}
          </p>
          <Link
            href={`/${locale}`}
            className="inline-block px-6 py-2 bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          >
            {isBn ? 'হোমে ফিরে যান' : 'Go Back Home'}
          </Link>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-600 mb-8">
            {isBn
              ? `মোট ${toDigitalNumber(results.length, undefined, locale)} টি ফলাফল পাওয়া গেছে`
              : `Found ${results.length} result${results.length !== 1 ? 's' : ''}`}
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {results.map((article) => (
              <NewsCard key={article.id} article={article} variant="horizontal" locale={locale} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
