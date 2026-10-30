'use client'

import Link from 'next/link'
import { categories } from '@/lib/db/articles'
import { usePathname } from 'next/navigation'

const CATEGORY_TRANSLATIONS: Record<string, string> = {
  World: 'বিশ্ব',
  Technology: 'প্রযুক্তি',
  Business: 'বাণিজ্য',
  Sports: 'খেলাধুলা',
  Science: 'বিজ্ঞান',
  Health: 'স্বাস্থ্য',
  Opinion: 'মতামত',
}

export function CategoryFilter() {
  const pathname = usePathname()
  const locale = pathname.split('/')[1] || 'bn'
  const isBn = locale === 'bn' || !locale

  const isActive = (category: string) => {
    return pathname === `/${locale}/category/${category}`
  }

  return (
    <div className="bg-background border-b border-gray-200 sticky top-16 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-hide">
          <Link href={`/${locale}`}>
            <button
              className={`whitespace-nowrap px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                pathname === `/${locale}` || pathname === '/'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {isBn ? 'সকল খবর' : 'All News'}
            </button>
          </Link>

          {categories.map((category) => (
            <Link key={category} href={`/${locale}/category/${category}`}>
              <button
                className={`whitespace-nowrap px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  isActive(category)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {isBn ? (CATEGORY_TRANSLATIONS[category] || category) : category}
              </button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
