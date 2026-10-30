'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  FacebookLogo,
  TwitterLogo,
  InstagramLogo,
  YoutubeLogo,
  Envelope
} from '@phosphor-icons/react'
import { banglaFontlogo } from '@/lib/font'

export function Footer() {
  const currentYear = new Date().getFullYear()
  const params = useParams()
  const locale = (params?.locale as string) || 'bn'
  const isBn = locale === 'bn' || !locale

  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']
  const formattedYear = isBn
    ? String(currentYear).replace(/\d/g, (d) => banglaDigits[parseInt(d)])
    : String(currentYear)

  const links = isBn
    ? [
        { href: `/category/World`, label: 'বিশ্ব সংবাদ' },
        { href: `/category/Technology`, label: 'প্রযুক্তি' },
        { href: `/category/Business`, label: 'ব্যবসা ও বাণিজ্য' },
        { href: `/category/Sports`, label: 'খেলাধুলা' },
        { href: `/privacy`, label: 'গোপনীয়তা নীতি' },
        { href: `/terms`, label: 'ব্যবহারের শর্তাবলী' },
        { href: `/contact`, label: 'যোগাযোগ' },
      ]
    : [
        { href: `/category/World`, label: 'World' },
        { href: `/category/Technology`, label: 'Technology' },
        { href: `/category/Business`, label: 'Business' },
        { href: `/category/Sports`, label: 'Sports' },
        { href: `/privacy`, label: 'Privacy Policy' },
        { href: `/terms`, label: 'Terms' },
        { href: `/contact`, label: 'Contact' },
      ]

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 py-3 px-4 sm:px-6 no-print w-full">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs">

        {/* Brand & Copyright */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href={`/${locale}`} className="inline-block select-none">
            <span className={`${banglaFontlogo.className} text-lg font-black text-white`}>
              অনলি্হিন্দু™
            </span>
          </Link>
          <span className="text-slate-600">|</span>
          <p className="text-slate-400 whitespace-nowrap">
            &copy; {formattedYear} {isBn ? 'অনলি্হিন্দু™। সর্বস্বত্ব সংরক্ষিত।' : 'Only Hindu™. All rights reserved.'}
          </p>
        </div>

        {/* Center: Inline Navigation Links */}
        <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-slate-400 font-medium">
          {links.map((link, idx) => (
            <span key={link.label} className="flex items-center gap-3">
              {idx > 0 && <span className="text-slate-700 text-[10px]">•</span>}
              <Link
                href={`/${locale}${link.href.startsWith('/') ? link.href : '/' + link.href}`}
                className="hover:text-white transition-colors whitespace-nowrap"
              >
                {link.label}
              </Link>
            </span>
          ))}
        </nav>

        {/* Right: Contact & Socials */}
        <div className="flex items-center gap-4 shrink-0">
          <a
            href="mailto:info@onlyhindu.com"
            className="hidden sm:flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
          >
            <Envelope size={14} />
            <span>info@onlyhindu.com</span>
          </a>

          <div className="flex items-center gap-1.5">
            <a
              href="#"
              className="p-1.5 bg-slate-800 hover:bg-red-600 hover:text-white transition-all"
              aria-label="Facebook"
            >
              <FacebookLogo size={14} weight="fill" />
            </a>
            <a
              href="#"
              className="p-1.5 bg-slate-800 hover:bg-red-600 hover:text-white transition-all"
              aria-label="Twitter"
            >
              <TwitterLogo size={14} weight="fill" />
            </a>
            <a
              href="#"
              className="p-1.5 bg-slate-800 hover:bg-red-600 hover:text-white transition-all"
              aria-label="Instagram"
            >
              <InstagramLogo size={14} weight="fill" />
            </a>
            <a
              href="#"
              className="p-1.5 bg-slate-800 hover:bg-red-600 hover:text-white transition-all"
              aria-label="Youtube"
            >
              <YoutubeLogo size={14} weight="fill" />
            </a>
          </div>

          <span className="hidden xl:inline text-slate-500 text-[11px]">
            {isBn ? 'মানবতার কল্যাণে নিবেদিত ♥' : 'For humanity with ♥'}
          </span>
        </div>

      </div>
    </footer>
  )
}
