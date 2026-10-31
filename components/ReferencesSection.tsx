'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronUp, BookOpen, ExternalLink } from 'lucide-react'
import { ArticleReference } from '@/lib/references'
interface ReferencesSectionProps {
  references: ArticleReference[]
  locale?: string
  defaultOpen?: boolean
}

function toBanglaDigits(val: string | number): string {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']
  return String(val).replace(/\d/g, d => banglaDigits[parseInt(d)])
}

export function ReferencesSection({
  references,
  locale = 'bn',
  defaultOpen = false,
}: ReferencesSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  if (!references || references.length === 0) {
    return null
  }

  const isBn = locale === 'bn'
  const countDisplay = isBn ? toBanglaDigits(references.length) : references.length

  return (
    <div id="article-references" className="my-8 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 transition-all">
      <button
        type="button"
        onClick={() => setIsOpen(open => !open)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between text-left transition-colors hover:text-neutral-900"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-200/70 text-neutral-800">
            <BookOpen size={15} />
          </span>
          <span className="text-base font-bold text-neutral-900">
            {isBn ? 'তথ্যসূত্র' : 'References'}
          </span>
          <span className="rounded-full bg-neutral-200/80 px-2 py-0.5 text-xs font-semibold text-neutral-700">
            {countDisplay}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
          <span>{isOpen ? (isBn ? 'লুকান' : 'Hide') : (isBn ? 'দেখুন' : 'Show')}</span>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {isOpen && (
        <ol className="mt-4 space-y-3 border-t border-neutral-200/80 pt-3">
          {references.map((ref) => {
            const indexStr = isBn ? toBanglaDigits(ref.index) : ref.index
            return (
              <li
                key={ref.index}
                id={`ref-${ref.index}`}
                className="group flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-neutral-100/60 target:bg-amber-50 target:ring-1 target:ring-amber-300"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-neutral-200/80 text-xs font-bold text-neutral-700 font-mono">
                  {indexStr}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
                    {ref.author && <span className="font-semibold text-neutral-800">{ref.author}</span>}
                    {ref.year && <span>({isBn ? toBanglaDigits(ref.year) : ref.year})</span>}
                    {ref.site && <span>• {ref.site}</span>}
                  </div>

                  <div className="mt-0.5">
                    {ref.url ? (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-900 transition-colors hover:text-blue-700 hover:underline"
                      >
                        <span>{ref.title}</span>
                        <ExternalLink size={12} className="shrink-0 text-neutral-400 group-hover:text-blue-700" />
                      </a>
                    ) : (
                      <span className="text-sm font-semibold text-neutral-900">{ref.title}</span>
                    )}
                  </div>

                  {ref.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-neutral-600 leading-relaxed">
                      {ref.description}
                    </p>
                  )}

                  {ref.url && (
                    <p className="mt-1 truncate text-[11px] font-mono text-neutral-400">
                      {ref.url}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
