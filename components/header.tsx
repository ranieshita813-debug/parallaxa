'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'

import { NewsArticle, getBreakingNews, getTrendingArticles } from '@/lib/db/articles'
import {
  Home,
  Globe,
  Cpu,
  Briefcase,
  Trophy,
  FlaskConical,
  Activity,
  MessageSquare,
  X,
  Languages,
  ChevronDown,
  Search,
  Bell,
  FileEdit,
  Menu,
  LayoutDashboard,
} from 'lucide-react'
import { banglaFontlogo } from '@/lib/font'

const BANGLA_NAV_MAP: Record<string, string> = {
  Home: 'প্রচ্ছদ',
  World: 'বিশ্ব',
  Technology: 'প্রযুক্তি',
  Business: 'বাণিজ্য',
  Sports: 'খেলাধুলা',
  Science: 'বিজ্ঞান',
  Health: 'স্বাস্থ্য',
  Opinion: 'মতামত',
  'Latest News': 'সর্বশেষ সংবাদ',
  Latest: 'সর্বশেষ',
}

const DEFAULT_NAV_LINKS = [
  { href: '/', label: 'প্রচ্ছদ', icon: Home, key: 'Home' },
  { href: '/category/World', label: 'বিশ্ব', icon: Globe, key: 'World' },
  { href: '/category/Technology', label: 'প্রযুক্তি', icon: Cpu, key: 'Technology' },
  { href: '/category/Business', label: 'বাণিজ্য', icon: Briefcase, key: 'Business' },
  { href: '/category/Sports', label: 'খেলাধুলা', icon: Trophy, key: 'Sports' },
  { href: '/category/Science', label: 'বিজ্ঞান', icon: FlaskConical, key: 'Science' },
  { href: '/category/Health', label: 'স্বাস্থ্য', icon: Activity, key: 'Health' },
  { href: '/category/Opinion', label: 'মতামত', badge: 'নতুন', icon: MessageSquare, key: 'Opinion' },
]

const ICON_MAP: Record<string, any> = {
  Home,
  Globe,
  Cpu,
  Briefcase,
  Trophy,
  FlaskConical,
  Activity,
  MessageSquare
}

function sanitizeSvg(svg: string): string {
  if (!svg) return '';
  return svg
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*(['"])(.*?)\1/gi, '')
    .replace(/javascript\s*:/gi, '');
}

export function Header({
  includeTicker = false,
  className,
}: {
  includeTicker?: boolean
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const locale = pathname.split('/')[1] || 'bn'
  const isBn = locale === 'bn' || !locale

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [navLinks, setNavLinks] = useState<any[]>(DEFAULT_NAV_LINKS)
  const [isAnnVisible, setIsAnnVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [desktopQuery, setDesktopQuery] = useState('')
  const [searchCategory, setSearchCategory] = useState(isBn ? 'সকল' : 'All')
  const [isCatOpen, setIsCatOpen] = useState(false)
  const [tickerArticles, setTickerArticles] = useState<NewsArticle[]>([])
  const [trendingArticles, setTrendingArticles] = useState<NewsArticle[]>([])
  const catRef = useRef<HTMLDivElement>(null)

  const SEARCH_CATEGORIES = isBn
    ? [
        { key: 'All', label: 'সকল' },
        { key: 'World', label: 'বিশ্ব' },
        { key: 'Technology', label: 'প্রযুক্তি' },
        { key: 'Business', label: 'বাণিজ্য' },
        { key: 'Sports', label: 'খেলাধুলা' },
      ]
    : [
        { key: 'All', label: 'All' },
        { key: 'World', label: 'World' },
        { key: 'Technology', label: 'Technology' },
        { key: 'Business', label: 'Business' },
        { key: 'Sports', label: 'Sports' },
      ]

  useEffect(() => {
    async function loadMobileMenu() {
      try {
        const res = await fetch('/api/public-settings')
        if (res.ok) {
          const data = await res.json()
          if (data.mobile_menu_links) {
            const parsed = JSON.parse(data.mobile_menu_links)
            if (Array.isArray(parsed) && parsed.length > 0) {
              const mapped = parsed.map(link => {
                let displayLabel = link.label
                if (isBn && BANGLA_NAV_MAP[link.label]) {
                  displayLabel = BANGLA_NAV_MAP[link.label]
                }
                let displayBadge = link.badge
                if (isBn && link.badge === 'New') {
                  displayBadge = 'নতুন'
                }
                return {
                  href: link.href,
                  label: displayLabel,
                  badge: displayBadge || undefined,
                  icon: ICON_MAP[link.iconName] || Home,
                  iconName: link.iconName || 'Home',
                  iconUrl: link.iconUrl || undefined
                }
              })
              setNavLinks(mapped)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load mobile settings:', err)
      }
    }
    loadMobileMenu()
  }, [isBn])

  // Close category dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setIsCatOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Load breaking news ticker and trending
  useEffect(() => {
    async function loadData() {
      try {
        const [breaking, trending] = await Promise.all([
          getBreakingNews(),
          getTrendingArticles(),
        ])
        setTickerArticles(breaking)
        setTrendingArticles(trending)
      } catch (error) {
        console.error('Failed to load header data:', error)
      }
    }
    loadData()
  }, [])

  // Close mobile overlays on route change
  useEffect(() => {
    setIsMenuOpen(false)
    setIsSearchOpen(false)
  }, [pathname])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/${locale}/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setIsSearchOpen(false)
    }
  }

  const handleDesktopSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (desktopQuery.trim()) {
      const selectedCatObj = SEARCH_CATEGORIES.find(c => c.label === searchCategory)
      const catKey = selectedCatObj ? selectedCatObj.key : 'All'
      const cat = catKey !== 'All' ? `&category=${catKey}` : ''
      router.push(`/${locale}/search?q=${encodeURIComponent(desktopQuery.trim())}${cat}`)
      setDesktopQuery('')
    }
  }

  const handleSignOut = async () => {
    await signOut({ redirect: true, redirectUrl: `/${locale}` })
  }

  const today = new Date().toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <header className={`sticky top-0 z-50 bg-white ${className ?? ''}`}>
      {/* ── ANNOUNCEMENT BAR ── */}
      {isAnnVisible && (
        <div className="bg-red-600 text-primary-foreground text-xs font-medium tracking-wide flex items-center justify-center gap-2 px-4 py-1.5 relative">
          <span className="inline-block w-1.5 h-1.5 bg-background animate-pulse flex-shrink-0" />
          <span>{isBn ? 'ব্রেকিং: ফেড সুদের হার অপরিবর্তিত রেখেছে —' : 'Breaking: Fed holds interest rates steady —'}</span>
          <Link
            href={`/${locale}/category/Business`}
            className="underline underline-offset-2 opacity-80 hover:opacity-100 whitespace-nowrap"
          >
            {isBn ? 'বিস্তারিত পড়ুন' : 'Read full story'}
          </Link>
          <button
            onClick={() => setIsAnnVisible(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity p-1"
            aria-label={isBn ? 'বন্ধ করুন' : 'Dismiss'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── UTILITY ROW (desktop only) ── */}
      <div className="hidden md:block bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <span className="text-xs text-muted-foreground">{today}</span>
            <div className="flex items-center gap-4">
              {(isBn ? ['নিউজলেটার', 'পডকাস্ট', 'ই-পেপার'] : ['Newsletter', 'Podcast', 'E-paper']).map((item) => (
                <Link
                  key={item}
                  href="#"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item}
                </Link>
              ))}
            </div>
          </div>
          <div className="relative group">
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border px-2.5 py-0.5 hover:bg-background uppercase">
              <Languages className="w-3.5 h-3.5" />
              {(pathname.split('/')[1] || 'bn').toUpperCase()}
              <ChevronDown className="w-3 h-3" />
            </button>
            <div className="absolute top-full right-0 mt-1 bg-background border border-border shadow-xl p-1 w-24 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              {['bn', 'en', 'es', 'fr'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    const parts = pathname.split('/')
                    parts[1] = lang
                    router.push(parts.join('/') || `/${lang}`)
                  }}
                  className="w-full text-left px-3 py-1.5 text-[11px] font-medium text-gray-900 hover:bg-card transition-colors uppercase"
                >
                  {lang === 'bn' ? 'বাংলা' : lang}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── BRAND ROW (desktop) ── */}
      <div className="hidden md:block bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center gap-2.5 flex-shrink-0 select-none h-full">
            <div className="flex flex-col leading-none h-full justify-center">
              <h1 className={`${banglaFontlogo.className} text-3xl font-[900] text-slate-950`}>অনলি্হিন্দু™</h1>
            </div>
          </Link>

          {/* Search */}
          <form
            onSubmit={handleDesktopSearch}
            className="flex-1 max-w-md flex items-center border border-border overflow-hidden bg-card focus-within:bg-background focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-300 transition-all"
          >
            <div className="relative flex-shrink-0" ref={catRef}>
              <button
                type="button"
                onClick={() => setIsCatOpen(!isCatOpen)}
                className="flex items-center gap-1.5 px-3 h-10 text-xs text-muted-foreground border-r border-border hover:bg-gray-100 transition-colors"
              >
                {searchCategory}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {isCatOpen && (
                <div className="absolute top-full left-0 mt-1 bg-background border border-border shadow-lg overflow-hidden z-50 min-w-[120px]">
                  {SEARCH_CATEGORIES.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => {
                        setSearchCategory(cat.label)
                        setIsCatOpen(false)
                      }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                        searchCategory === cat.label
                          ? 'bg-primary text-primary-foreground'
                          : 'text-gray-700 hover:bg-card'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <input
              type="text"
              placeholder={isBn ? 'খবর, বিষয় বা ব্যক্তিত্ব খুঁজুন…' : 'Search stories, topics, people…'}
              value={desktopQuery}
              onChange={(e) => setDesktopQuery(e.target.value)}
              className="flex-1 px-3 py-2 text-sm outline-none bg-transparent text-foreground placeholder-gray-400 min-w-0"
            />
            <button
              type="submit"
              className="w-10 h-10 flex items-center justify-center bg-primary text-primary-foreground hover:bg-gray-700 transition-colors flex-shrink-0"
              aria-label={isBn ? 'খুঁজুন' : 'Search'}
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              className="relative w-9 h-9 flex items-center justify-center border border-border text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
              aria-label={isBn ? 'বিজ্ঞপ্তি' : 'Notifications'}
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 border border-white" />
            </button>

            {session?.user ? (
              <div className="flex items-center gap-2">
                <Link href={`/${locale}/dashboard`}>
                  <div className="w-8 h-8 bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold hover:ring-2 hover:ring-gray-300 transition-all">
                    {session.user.name?.charAt(0).toUpperCase() ??
                      session.user.email?.charAt(0).toUpperCase() ??
                      'U'}
                  </div>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href={`/${locale}/auth/signin`}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-foreground transition-colors"
                >
                  {isBn ? 'সাইন ইন' : 'Sign in'}
                </Link>
                <Link
                  href={`/${locale}/auth/signup`}
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  {isBn ? 'শুরু করুন' : 'Get started'}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── DESKTOP NAV ROW ── */}
      <div className="hidden md:block border-b border-border bg-white">
        <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-start">
          <nav className="flex items-center gap-1">
            {navLinks.map(({ href, label, badge, icon: Icon, iconUrl }) => {
              const localizedHref = `/${locale}${href === '/' ? '' : href}`
              const isActive = pathname === localizedHref
              return (
                <Link
                  key={href}
                  href={localizedHref}
                  className={`relative flex items-center gap-2 px-3 py-1.5 text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {iconUrl ? (
                    iconUrl.trim().startsWith('<svg') ? (
                      <span
                        className="w-4 h-4 flex items-center justify-center shrink-0 [&>svg]:w-4 [&>svg]:h-4 [&>svg]:object-contain"
                        dangerouslySetInnerHTML={{ __html: sanitizeSvg(iconUrl) }}
                      />
                    ) : (
                      <img
                        src={iconUrl}
                        alt=""
                        className="w-4 h-4 object-contain shrink-0"
                      />
                    )
                  ) : Icon ? (
                    <Icon className="w-4 h-4 shrink-0 text-slate-500" />
                  ) : null}
                  <span>{label}</span>
                  {badge && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5">
                      {badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* ── TICKER ── */}
      {includeTicker && tickerArticles.length > 0 && (
        <div className="bg-card border-b border-border h-8 flex items-center overflow-hidden">
          <div className="flex items-center gap-1.5 px-4 h-full bg-primary text-primary-foreground flex-shrink-0">
            <span className="inline-block w-1.5 h-1.5 bg-background animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap">
              {isBn ? 'ব্রেকিং নিউজ' : 'Breaking'}
            </span>
          </div>
          <div className="overflow-hidden flex-1 flex items-center">
            <div className="flex animate-[ticker_32s_linear_infinite] whitespace-nowrap">
              {[...tickerArticles, ...tickerArticles].map((article, i) => (
                <span
                  key={i}
                  className="text-[11px] text-muted-foreground px-7 border-r border-border last:border-r-0"
                >
                  <span className="font-semibold text-gray-800">
                    {article.category ?? (isBn ? 'ব্রেকিং' : 'Breaking')}:
                  </span>{' '}
                  {article.title}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE TOP BAR ── */}
      <div className="md:hidden">
        <div className="px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center justify-start gap-3 select-none h-full">
            <button
              onClick={() => {
                setIsMenuOpen((prev) => !prev)
                setIsSearchOpen(false)
              }}
              className="p-2 -ml-2 text-gray-900 hover:bg-card transition-colors"
              aria-label={isMenuOpen ? (isBn ? 'মেনু বন্ধ করুন' : 'Close menu') : (isBn ? 'মেনু খুলুন' : 'Open menu')}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link href={`/${locale}`} className="flex items-center gap-2.5 flex-shrink-0 select-none h-full">
              <div className="flex flex-col leading-none h-full justify-center">
                <h1 className={`${banglaFontlogo.className} text-2xl font-[900]`}>অনলি্হিন্দু™</h1>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setIsSearchOpen(!isSearchOpen)
                setIsMenuOpen(false)
              }}
              className="w-9 h-9 flex items-center justify-center text-gray-900 hover:bg-card transition-colors"
              aria-label={isBn ? 'খুঁজুন' : 'Search'}
            >
              {isSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile search bar */}
        {isSearchOpen && (
          <div className="px-4 pb-3 border-t border-border pt-2">
            <form
              onSubmit={handleSearch}
              className="flex items-center border border-gray-300 overflow-hidden bg-card focus-within:bg-background focus-within:border-gray-400 transition-all"
            >
              <input
                type="text"
                placeholder={isBn ? 'খবর বা বিষয় খুঁজুন…' : 'Search stories, topics…'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 text-sm outline-none bg-transparent text-foreground placeholder-gray-400"
                autoFocus
              />
              <button
                type="submit"
                className="w-10 h-10 flex items-center justify-center bg-primary text-primary-foreground flex-shrink-0"
                aria-label={isBn ? 'খুঁজুন' : 'Search'}
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ── MOBILE MENU ── */}
      {isMenuOpen && (
        <div className="md:hidden relative bg-stone-50 flex flex-col overflow-y-auto max-h-[calc(100svh-3.5rem)] border-b border-stone-300">
          <div className="flex items-baseline justify-between px-5 pt-4 pb-3">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-stone-500">
              {isBn ? 'সূচিপত্র' : 'Contents'}
            </span>
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-stone-400">
              {today}
            </span>
          </div>
          <div className="h-px bg-stone-900 mx-5" />

          <div className="px-5 pt-5 pb-6">
            <form onSubmit={handleSearch} className="flex items-end gap-2 border-b border-stone-400 pb-2">
              <Search className="w-4 h-4 text-stone-400 flex-shrink-0 mb-0.5" />
              <input
                type="text"
                placeholder={isBn ? 'খবর বা বিষয় খুঁজুন…' : 'Search stories, topics…'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-sm outline-none bg-transparent text-stone-900 placeholder-stone-400 font-sans"
              />
            </form>
          </div>

          <div className="px-5">
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-1">
              {isBn ? 'বিভাগসমূহ' : 'Sections'}
            </p>
            <nav className="flex flex-col">
              {navLinks.map(({ href, label, badge, icon: Icon, iconUrl }, idx) => {
                const localizedHref = `/${locale}${href === '/' ? '' : href}`
                const isActive = pathname === localizedHref
                return (
                  <Link
                    key={href}
                    href={localizedHref}
                    onClick={() => setIsMenuOpen(false)}
                    className="group relative flex items-center gap-3 py-3.5 border-b"
                  >
                    <span
                      className={`absolute -left-5 top-0 bottom-0 w-1 bg-red-700 transition-transform duration-200 origin-left ${
                        isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                      }`}
                    />
                    <span className="text-xs text-stone-400 w-6">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    {iconUrl ? (
                      iconUrl.trim().startsWith('<svg') ? (
                        <span
                          className="w-4 h-4 flex items-center justify-center shrink-0 [&>svg]:w-4 [&>svg]:h-4 [&>svg]:object-contain"
                          dangerouslySetInnerHTML={{ __html: sanitizeSvg(iconUrl) }}
                        />
                      ) : (
                        <img
                          src={iconUrl}
                          alt=""
                          className="w-4 h-4 object-contain shrink-0"
                        />
                      )
                    ) : Icon ? (
                      <Icon className="w-4 h-4 text-stone-500 flex-shrink-0" />
                    ) : null}
                    <span
                      className={`flex-1 text-[17px] leading-tight ${
                        isActive ? 'text-red-700' : 'text-stone-900'
                      }`}
                    >
                      {label}
                    </span>
                    {badge && (
                      <span className="text-[9px] font-mono uppercase tracking-widest text-red-700 border border-red-700 px-1.5 py-0.5">
                        {badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>

            {session && (
              <div className="grid grid-cols-2 gap-px mt-3 mb-2 border-t border-gray-100">
                <Link
                  href={`/${locale}/write`}
                  onClick={() => setIsMenuOpen(false)}
                  className="bg-stone-50 flex flex-col gap-2 p-4 hover:bg-stone-100 transition-colors"
                >
                  <FileEdit className="w-4 h-4 text-stone-700" />
                  <span className="font-mono text-[11px] uppercase tracking-wider text-stone-700">
                    {isBn ? 'লিখুন' : 'Write'}
                  </span>
                </Link>
                <Link
                  href={`/${locale}/dashboard`}
                  onClick={() => setIsMenuOpen(false)}
                  className="bg-stone-50 flex flex-col gap-2 p-4 hover:bg-stone-100 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4 text-stone-700" />
                  <span className="font-mono text-[11px] uppercase tracking-wider text-stone-700">
                    {isBn ? 'ড্যাশবোর্ড' : 'Dashboard'}
                  </span>
                </Link>
              </div>
            )}
          </div>

          {trendingArticles.length > 0 && (
            <div className="px-5 pt-5 border-t border-stone-300 mt-4">
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-3">
                {isBn ? 'ট্রেন্ডিং সংবাদ' : 'Trending now'}
              </p>
              <div className="flex flex-col">
                {trendingArticles.map((article, idx) => (
                  <Link
                    key={article.id}
                    href={`/${locale}/article/${article.slug || article.id}`}
                    onClick={() => setIsMenuOpen(false)}
                    className="group flex gap-3 py-3 border-b border-stone-200 last:border-b-0"
                  >
                    <span className="font-mono text-xs text-stone-400 mt-1 w-8 flex-shrink-0">
                      N&deg;{String(idx + 1).padStart(2, '0')}
                    </span>
                    <p className="font-serif text-[15px] text-stone-800 leading-snug group-hover:text-red-700 transition-colors">
                      {article.title}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto px-5 py-5 border-t border-stone-300 flex gap-2.5">
            {session ? (
              <button
                onClick={() => {
                  handleSignOut()
                  setIsMenuOpen(false)
                }}
                className="flex-1 h-11 text-sm font-medium text-stone-700 border border-stone-300 hover:bg-stone-100 transition-colors"
              >
                {isBn ? 'সাইন আউট' : 'Sign out'}
              </button>
            ) : (
              <>
                <Link
                  href={`/${locale}/auth/signin`}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex-1 h-11 flex items-center justify-center text-sm font-medium text-stone-900 border border-stone-300 hover:bg-stone-100 transition-colors"
                >
                  {isBn ? 'সাইন ইন' : 'Sign in'}
                </Link>
                <Link
                  href={`/${locale}/auth/signup`}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex-1 h-11 flex items-center justify-center text-sm font-medium text-stone-50 bg-red-700 hover:bg-red-800 transition-colors"
                >
                  {isBn ? 'শুরু করুন' : 'Get started'}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
