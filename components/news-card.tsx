import Link from 'next/link'
import Image from 'next/image'
import { NewsArticle } from '@/lib/db/articles'
import { Eye } from 'lucide-react'

interface NewsCardProps {
  article: NewsArticle
  variant?: 'default' | 'featured' | 'horizontal'
  className?: string
  locale?: string
}

export const toDigitalNumber = (numbers: number | string | undefined | null, suffix?: string, locale: string = "bn"): string => {
  if (numbers === undefined || numbers === null) return "০"
  const num = typeof numbers === "string" ? parseFloat(numbers) : numbers
  if (isNaN(num)) return String(numbers)

  const convertDigits = (str: string) => {
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']
    return str.replace(/\d/g, (d) => banglaDigits[parseInt(d)])
  }

  if (num > 0) {
    if (num >= 10000000) {
      const crore = num / 10000000
      const formatted = crore % 1 === 0 ? crore : parseFloat(crore.toFixed(1))
      return `${convertDigits(String(formatted))} কোটি${suffix ? ' ' + suffix : ''}`
    } else if (num >= 100000) {
      const lakh = num / 100000
      const formatted = lakh % 1 === 0 ? lakh : parseFloat(lakh.toFixed(1))
      return `${convertDigits(String(formatted))} লাখ${suffix ? ' ' + suffix : ''}`
    } else if (num >= 1000) {
      const thousand = num / 1000
      const formatted = thousand % 1 === 0 ? thousand : parseFloat(thousand.toFixed(1))
      return `${convertDigits(String(formatted))} হাজার${suffix ? ' ' + suffix : ''}`
    }
    return convertDigits(String(num)) + (suffix ? ' ' + suffix : '')
  }
  return convertDigits(String(num))
}

const CATEGORY_TRANSLATIONS: Record<string, string> = {
  World: 'বিশ্ব',
  Technology: 'প্রযুক্তি',
  Business: 'বাণিজ্য',
  Sports: 'খেলাধুলা',
  Science: 'বিজ্ঞান',
  Health: 'স্বাস্থ্য',
  Opinion: 'মতামত',
  General: 'সাধারণ',
}

export function NewsCard({ article, variant = 'default', className, locale = 'bn' }: NewsCardProps) {
  if (!article || !article.id) return null

  const isBn = locale === 'bn' || !locale

  const formattedDate = new Date(article.date).toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const href = `/${locale}/article/${article.slug || article.id}`
  const authorHref = `/${locale}/author/${article.author_id || 'unknown'}`
  const imageSrc = article.image || '/images/placeholder.jpg'

  const displayCategory = isBn
    ? (CATEGORY_TRANSLATIONS[article.category] || article.category || 'সাধারণ')
    : article.category

  if (variant === 'featured') {
    return (
      <Link href={href} className="block h-full">
        <div className={`group cursor-pointer overflow-hidden h-full flex flex-col ${className ?? ''}`}>
          <div className="relative w-full flex-1 overflow-hidden bg-gray-200 min-h-[200px]">
            <Image
              src={imageSrc}
              alt={article.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <span className="inline-block bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 mb-2">
                {displayCategory}
              </span>
              <h3 id="post-title" className="text-primary-foreground text-lg font-bold leading-tight line-clamp-3">
                {article.title}
              </h3>
              <div className="flex items-center gap-3 mt-2 text-xs text-primary-foreground/80">
                <span className="font-medium hover:text-white transition-colors">
                  {article.author}
                </span>
                <span>•</span>
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  if (variant === 'horizontal') {
    return (
      <Link href={href} className="block">
        <div className={`group flex gap-4 cursor-pointer min-h-[7.5rem] overflow-hidden ${className ?? ''}`}>
          <div className="relative w-32 sm:w-40 h-28 sm:h-32 flex-shrink-0 overflow-hidden bg-gray-200">
            <Image
              src={imageSrc}
              alt={article.title}
              fill
              sizes="(max-width: 640px) 128px, 160px"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="flex-1 min-w-0 py-0.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-red-600 tracking-wide uppercase">
                {displayCategory}
              </span>
            </div>
            <h3 id="post-title" className="text-foreground line-clamp-2 group-hover:text-red-600 transition-colors text-sm font-bold leading-snug">
              {article.title}
            </h3>
            {article.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{article.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                <span>{toDigitalNumber(article.views, undefined, locale)}</span>
              </div>
              <span>•</span>
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  // Default variant
  return (
    <Link href={href} className="block">
      <div className={`group cursor-pointer overflow-hidden ${className ?? ''}`}>
        <div className="relative w-full h-48 overflow-hidden bg-gray-200 mb-3">
          <Image
            src={imageSrc}
            alt={article.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {article.breaking && (
            <div className="absolute top-2 left-2 bg-red-600 text-white px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide">
              {isBn ? 'ব্রেকিং' : 'Breaking'}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-red-600 uppercase tracking-wide">
              {displayCategory}
            </span>
            {article.trending && (
              <span className="text-xs font-bold text-red-600">🔥 {isBn ? 'ট্রেন্ডিং' : 'Trending'}</span>
            )}
          </div>
          <h3 id="post-title" className="text-foreground line-clamp-2 group-hover:text-red-600 transition-colors text-base font-bold leading-snug">
            {article.title}
          </h3>
          {article.description && (
            <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{article.description}</p>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
            <span>{formattedDate}</span>
            <span>{toDigitalNumber(article.readTime || 1, undefined, locale)} {isBn ? 'মিনিট পড়া' : 'min read'}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
