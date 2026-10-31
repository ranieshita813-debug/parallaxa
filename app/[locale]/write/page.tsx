"use client";

import { slabo } from '@/lib/font'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import React, {
  useState, useRef, useCallback, useEffect, useMemo, useId, memo,
  forwardRef, useImperativeHandle, Children, isValidElement, ReactNode,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CodeMirror from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { EditorView, Decoration, DecorationSet, ViewUpdate, ViewPlugin } from '@codemirror/view'
import { autocompletion, CompletionContext } from '@codemirror/autocomplete'
import { RangeSetBuilder } from '@codemirror/state'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import Markdown, { Components } from 'react-markdown'
import {
  ChevronLeft, ChevronDown, Plus, Undo2, Redo2, Bold, Italic, Strikethrough, Code,
  Link as LinkIcon, Image as ImageIcon, Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Minus, Table, Sigma, Workflow, Type, PanelRight, Eye, PenLine, FileCode,
  Monitor, Tablet, Smartphone, Search, X, Check, CheckCircle2, AlertCircle, Loader2,
  Send, Settings, SearchCheck, Accessibility, Tag, Share2, Star, Zap, TrendingUp, Clock,
  ArrowUp, ArrowDown, Copy, Trash2, Sparkles, Box, Columns2, Twitter, Facebook,
  Instagram, Youtube, Github, ImagePlus,
} from 'lucide-react'
import { createCustomBlockPlugin, blockRegistry, DBBlockConfig } from '@/lib/mdx/block-registry'
import '@/lib/mdx/blocks'
import { customBlockComponents } from '@/components/mdx/CustomBlockRenderer'
import FramedQuote from '@/components/mdx/FramedCornersQuote'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

/* ────────────────────────────────────────────────────────────────────────────
   Types & constants
──────────────────────────────────────────────────────────────────────────── */

type SidebarTab = 'metadata' | 'seo' | 'accessibility' | 'tags' | 'distribution'
type Mode = 'visual' | 'code' | 'preview'
type Device = 'desktop' | 'tablet' | 'mobile'
type Visibility = 'public' | 'private' | 'unlisted'
type ArticleStatus = 'draft' | 'published' | 'scheduled'
type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error'
type BlockType = 'p' | 'h1' | 'h2' | 'h3' | 'ul' | 'ol' | 'quote' | 'code' | 'mermaid' | 'math' | 'hr' | 'image' | 'table' | 'custom' | 'html'
type ConvertType = 'p' | 'h1' | 'h2' | 'h3' | 'ul' | 'ol' | 'quote' | 'code'
type Block = { id: string; text: string }

interface Meta {
  category: string; author: string; coverImage: string; tags: string[]
  visibility: Visibility; status: ArticleStatus; scheduledAt: string
  featured: boolean; breaking: boolean; trending: boolean
  seoTitle: string; metaDescription: string; focusKeyword: string; canonicalUrl: string
  ogImage: string; twitterCard: string; noIndex: boolean
  allowComments: boolean; showInRss: boolean; ampEnabled: boolean
  cssClass: string; redirectUrl: string
}

const DEFAULT_META: Meta = {
  category: '', author: '', coverImage: '', tags: [],
  visibility: 'public', status: 'draft', scheduledAt: '',
  featured: false, breaking: false, trending: false,
  seoTitle: '', metaDescription: '', focusKeyword: '', canonicalUrl: '',
  ogImage: '', twitterCard: 'summary_large_image', noIndex: false,
  allowComments: true, showInRss: true, ampEnabled: false,
  cssClass: '', redirectUrl: '',
}

const ACCENT = 'bg-[#3858e9] hover:bg-[#2c47c4] text-white'
const RING = 'ring-2 ring-[#3858e9]'

const TYPE_LABEL: Record<BlockType, string> = {
  p: 'Paragraph', h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', ul: 'List', ol: 'Numbered list',
  quote: 'Quote', code: 'Code', mermaid: 'Diagram', math: 'Math', hr: 'Divider', image: 'Image',
  table: 'Table', custom: 'Embed', html: 'HTML',
}

const CONVERT_OPTIONS: { value: ConvertType; label: string }[] = [
  { value: 'p', label: 'Paragraph' }, { value: 'h1', label: 'Heading 1' }, { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' }, { value: 'ul', label: 'Bulleted list' }, { value: 'ol', label: 'Numbered list' },
  { value: 'quote', label: 'Quote' }, { value: 'code', label: 'Code' },
]

const LINE_PREFIX: Partial<Record<ConvertType, string>> = {
  h1: '# ', h2: '## ', h3: '### ', ul: '- ', ol: '1. ', quote: '> ',
}

type LibItem = { id: string; label: string; icon: any; text: string; caret?: number; group: 'Text' | 'Media' | 'Advanced' | 'Embeds' }

const CORE_BLOCKS: LibItem[] = [
  { id: 'p', label: 'Paragraph', icon: Type, text: '', group: 'Text' },
  { id: 'h1', label: 'Heading 1', icon: Heading1, text: '# ', group: 'Text' },
  { id: 'h2', label: 'Heading 2', icon: Heading2, text: '## ', group: 'Text' },
  { id: 'h3', label: 'Heading 3', icon: Heading3, text: '### ', group: 'Text' },
  { id: 'ul', label: 'Bulleted list', icon: List, text: '- ', group: 'Text' },
  { id: 'ol', label: 'Numbered list', icon: ListOrdered, text: '1. ', group: 'Text' },
  { id: 'quote', label: 'Quote', icon: Quote, text: '> ', group: 'Text' },
  { id: 'image', label: 'Image', icon: ImageIcon, text: '![Describe the image](https://)', caret: 2, group: 'Media' },
  { id: 'table', label: 'Table', icon: Table, text: '| Column | Column |\n| --- | --- |\n| Cell | Cell |', caret: 2, group: 'Media' },
  { id: 'mermaid', label: 'Diagram', icon: Workflow, text: '```mermaid\ngraph TD\n  A[Start] --> B[Finish]\n```', caret: 11, group: 'Media' },
  { id: 'code', label: 'Code', icon: Code, text: '```js\n\n```', caret: 6, group: 'Advanced' },
  { id: 'math', label: 'Math', icon: Sigma, text: '$$\n\n$$', caret: 3, group: 'Advanced' },
  { id: 'hr', label: 'Divider', icon: Minus, text: '---', group: 'Advanced' },
]

/* ────────────────────────────────────────────────────────────────────────────
   Markdown block helpers
──────────────────────────────────────────────────────────────────────────── */

/** Split markdown into top-level blocks (blank-line separated, fences/$$ kept whole). */
function parseBlocks(md: string): string[] {
  const out: string[] = []
  let cur: string[] = []
  let fence: string | null = null
  let math = false
  const flush = () => { if (cur.length) { out.push(cur.join('\n')); cur = [] } }
  for (const line of md.replace(/\r\n/g, '\n').split('\n')) {
    const f = line.match(/^\s*(```+|~~~+)/)
    if (f) {
      if (!fence) fence = f[1][0]
      else if (f[1][0] === fence) fence = null
      cur.push(line); continue
    }
    if (!fence && line.trim() === '$$') { math = !math; cur.push(line); continue }
    if (!fence && !math && line.trim() === '') { flush(); continue }
    cur.push(line)
  }
  flush()
  return out
}

const isBlank = (t: string) => /^\s*(#{1,6}|>|[-*+]|1\.)?\s*$/.test(t)
const serialize = (blocks: Block[]) => blocks.map(b => b.text.replace(/\s+$/, '')).filter(t => !isBlank(t)).join('\n\n')

function detectType(t: string): BlockType {
  const s = t.trimStart()
  if (/^(```|~~~)\s*mermaid/i.test(s)) return 'mermaid'
  if (/^(```|~~~)/.test(s)) return 'code'
  if (s.startsWith('$$')) return 'math'
  const h = s.match(/^(#{1,6})\s/)
  if (h) return (`h${Math.min(h[1].length, 3)}`) as BlockType
  if (s.startsWith('>')) return 'quote'
  if (/^[-*+]\s/.test(s)) return 'ul'
  if (/^\d+[.)]\s/.test(s)) return 'ol'
  if (/^(---|\*\*\*|___)\s*$/.test(s)) return 'hr'
  if (/^!\[/.test(s)) return 'image'
  if (s.startsWith('|')) return 'table'
  if (/^\[!/.test(s)) return 'custom'
  if (s.startsWith('<')) return 'html'
  return 'p'
}

const MULTILINE: BlockType[] = ['code', 'mermaid', 'math', 'table', 'html']
const RICH: BlockType[] = ['mermaid', 'math', 'table', 'custom', 'image', 'html']

function convertText(text: string, t: ConvertType): string {
  let s = text
  const fence = s.match(/^\s*(```|~~~)[^\n]*\n([\s\S]*?)\n?\1\s*$/)
  if (fence) s = fence[2]
  if (t === 'code') return '```\n' + s + '\n```'
  const lines = s.split('\n').map(l => l.replace(/^(\s*)(#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/, '$1'))
  switch (t) {
    case 'h1': return '# ' + lines.join(' ')
    case 'h2': return '## ' + lines.join(' ')
    case 'h3': return '### ' + lines.join(' ')
    case 'ul': return lines.map(l => '- ' + l).join('\n')
    case 'ol': return lines.map((l, i) => `${i + 1}. ${l}`).join('\n')
    case 'quote': return lines.map(l => '> ' + l).join('\n')
    default: return lines.join('\n')
  }
}

const countWords = (t: string) => t.trim().split(/\s+/).filter(Boolean).length
const estimateReadTime = (t: string) => Math.max(1, Math.ceil(countWords(t) / 200))

function getText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(getText).join('')
  if (isValidElement(node)) return getText((node.props as any).children)
  return ''
}

function filterLib(items: LibItem[], q: string) {
  const s = q.trim().toLowerCase()
  return s ? items.filter(i => i.label.toLowerCase().includes(s) || i.id.includes(s)) : items
}

function useMedia(query: string) {
  const [m, setM] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const f = () => setM(mq.matches)
    f(); mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [query])
  return m
}

/* ────────────────────────────────────────────────────────────────────────────
   Rendering (shared by visual blocks, split view and preview)
──────────────────────────────────────────────────────────────────────────── */

/** Client-side Mermaid. rehype-mermaid needs Playwright and cannot run in the browser. */
function Mermaid({ chart }: { chart: string }) {
  const [svg, setSvg] = useState('')
  const [err, setErr] = useState('')
  const rid = 'mmd' + useId().replace(/[^a-zA-Z0-9]/g, '')
  useEffect(() => {
    let off = false
    const t = setTimeout(async () => {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'strict', ...({ look: 'handDrawn' } as any) })
        const { svg } = await mermaid.render(rid, chart)
        if (!off) { setSvg(svg); setErr('') }
      } catch (e: any) {
        if (!off) setErr(e?.message?.split('\n')[0] || 'This diagram has a syntax error.')
      }
    }, 250)
    return () => { off = true; clearTimeout(t) }
  }, [chart, rid])
  if (err && !svg) return <p className="my-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">Diagram error: {err}</p>
  return <div className="my-4 flex justify-center overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false)
  if (lang === 'mermaid') return <Mermaid chart={code} />
  return (
    <div className="relative my-4 max-w-full overflow-hidden rounded-xl border border-slate-800 bg-[#1a1a1a] text-gray-100">
      <div className="flex items-center justify-between border-b border-[#333] bg-[#222] px-4 py-2">
        <span className="font-mono text-xs text-gray-400">{lang}</span>
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            navigator.clipboard.writeText(code)
            setCopied(true); setTimeout(() => setCopied(false), 1800)
          }}
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-gray-400 transition-colors hover:text-white hover:bg-white/10"
        >
          {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[13px] leading-relaxed"><code>{code}</code></pre>
    </div>
  )
}

const mdComponents: Components = {
  ...customBlockComponents,
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children }) => {
    const text = String(children ?? '')
    const isBlock = /language-/.test(className || '') || text.includes('\n')
    if (!isBlock) return <code className="break-all rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-700">{children}</code>
    return <CodeBlock code={text.replace(/\n$/, '')} lang={(className || '').replace('language-', '') || 'text'} />
  },
  h1: ({ children }) => <h1 className="mb-4 mt-8 text-3xl font-bold leading-tight text-slate-900">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-3 mt-6 text-2xl font-semibold leading-snug text-slate-900">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-5 text-xl font-semibold text-slate-800">{children}</h3>,
  p: ({ children }) => <p className="my-3 text-[1.05rem] leading-[1.85] text-slate-700">{children}</p>,
  ul: ({ children }) => <ul className="my-4 flex list-disc flex-col gap-2 pl-6 text-[1.05rem] text-slate-700">{children}</ul>,
  ol: ({ children }) => <ol className="my-4 flex list-decimal flex-col gap-2 pl-6 text-[1.05rem] text-slate-700">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => {
    const items = Children.toArray(children).filter(isValidElement)
    const last = items[items.length - 1]
    const lastText = last ? getText(last).trim() : ''
    const hasAuthor = lastText.startsWith('—') || lastText.startsWith('-')
    const author = hasAuthor ? lastText.replace(/^[—-]\s*/, '') : undefined
    return <FramedQuote author={author}>{hasAuthor ? items.slice(0, -1) : items}</FramedQuote>
  },
  img: ({ src, alt }) => <img src={typeof src === 'string' ? src : undefined} alt={alt || ''} loading="lazy" className="my-4 h-auto max-w-full rounded-xl" />,
  table: ({ children }) => <div className="my-5 overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full text-sm">{children}</table></div>,
  thead: ({ children }) => <thead className="bg-slate-50 text-slate-600">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-slate-100">{children}</tbody>,
  tr: ({ children }) => <tr className="transition-colors hover:bg-slate-50/60">{children}</tr>,
  th: ({ children }) => <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold">{children}</th>,
  td: ({ children }) => <td className="px-4 py-3 text-slate-700">{children}</td>,
  hr: () => <hr className="my-8 border-slate-200" />,
  strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
  em: ({ children }) => <em className="italic text-slate-600">{children}</em>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#3858e9] underline decoration-[#3858e9]/30 underline-offset-2 transition-colors hover:decoration-[#3858e9]">
      {children}
    </a>
  ),
}

const REHYPE = [rehypeRaw, rehypeKatex] as any

const MarkdownView = memo(function MarkdownView({ content, dbBlocks }: { content: string; dbBlocks: DBBlockConfig[] }) {
  const remark = useMemo(() => [remarkGfm, remarkMath, [createCustomBlockPlugin, dbBlocks]] as any, [dbBlocks])
  return (
    <div className="w-full min-w-0">
      <Markdown remarkPlugins={remark} rehypePlugins={REHYPE} components={mdComponents}>{content}</Markdown>
    </div>
  )
})

function Badges({ meta }: { meta: Meta }) {
  if (!meta.breaking && !meta.featured && !meta.trending) return null
  return (
    <div className="flex flex-wrap gap-2">
      {meta.breaking && <span className="flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600"><Zap size={10} /> Breaking</span>}
      {meta.featured && <span className="flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600"><Star size={10} /> Featured</span>}
      {meta.trending && <span className="flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600"><TrendingUp size={10} /> Trending</span>}
    </div>
  )
}

function ArticleView({ title, content, meta, dbBlocks }: { title: string; content: string; meta: Meta; dbBlocks: DBBlockConfig[] }) {
  return (
    <article className={`${slabo.className} ${meta.cssClass}`}>
      <div className="mb-6"><Badges meta={meta} /></div>
      {meta.coverImage && <figure className="mb-8 overflow-hidden rounded-xl"><img src={meta.coverImage} alt="" className="max-h-80 w-full object-cover" /></figure>}
      <h1 className="font-['Newsreader'] text-4xl font-bold leading-[1.15] tracking-tight text-slate-900 sm:text-5xl">{title || 'Untitled article'}</h1>
      <div className="mb-8 mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-100 pb-6 text-sm text-slate-400">
        {meta.author && <span className="font-semibold text-slate-500">{meta.author}</span>}
        {meta.category && <span>{meta.category}</span>}
        <span className="flex items-center gap-1"><Clock size={12} />{estimateReadTime(content)} min read</span>
      </div>
      {content.trim()
        ? <MarkdownView content={content} dbBlocks={dbBlocks} />
        : <p className="py-16 text-center italic text-slate-300">Nothing to preview yet.</p>}
      {meta.tags.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-2 border-t border-slate-100 pt-6">
          {meta.tags.map(t => <span key={t} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">#{t}</span>)}
        </div>
      )}
    </article>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
   Small UI primitives
──────────────────────────────────────────────────────────────────────────── */

const IconBtn = ({ icon: Icon, label, onClick, active, disabled, keepFocus, className = '' }: {
  icon: any; label: string; onClick: () => void; active?: boolean; disabled?: boolean; keepFocus?: boolean; className?: string
}) => (
  <button
    type="button" title={label} aria-label={label} aria-pressed={active} disabled={disabled} onClick={onClick}
    onMouseDown={keepFocus ? e => e.preventDefault() : undefined}
    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3858e9] disabled:cursor-not-allowed disabled:opacity-30 ${
      active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    } ${className}`}
  >
    <Icon size={16} />
  </button>
)

const FieldLabel = ({ children }: { children: ReactNode }) => <label className="text-xs font-semibold text-slate-500">{children}</label>

const Field = memo(function Field({ label, value, onChange, placeholder, multiline, hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; hint?: string
}) {
  const cls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-shadow placeholder:text-slate-300 focus:border-[#3858e9] focus:ring-2 focus:ring-[#3858e9]/20'
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} className={`${cls} resize-none`} />
        : <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
})

const SelectField = ({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) => (
  <div className="flex flex-col gap-1.5">
    <FieldLabel>{label}</FieldLabel>
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm text-slate-900 outline-none focus:border-[#3858e9] focus:ring-2 focus:ring-[#3858e9]/20">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
    </div>
  </div>
)

const Toggle = ({ label, checked, onChange, description }: { label: string; checked: boolean; onChange: (v: boolean) => void; description?: string }) => (
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-slate-800">{label}</p>
      {description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}
    </div>
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3858e9] focus-visible:ring-offset-2 ${checked ? 'bg-[#3858e9]' : 'bg-slate-300'}`}>
      <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`} />
    </button>
  </div>
)

const Panel = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5">
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    {children}
  </section>
)

const CheckItem = ({ ok, text }: { ok: boolean; text: string }) => (
  <div className="flex items-start gap-2.5">
    {ok
      ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
      : <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-600" />}
    <span className="min-w-0 text-sm leading-snug text-slate-700">{text}</span>
  </div>
)

/* ────────────────────────────────────────────────────────────────────────────
   Block library (inserter)
──────────────────────────────────────────────────────────────────────────── */

function BlockLibrary({ items, onPick, query }: { items: LibItem[]; onPick: (i: LibItem) => void; query?: string }) {
  const [q, setQ] = useState('')
  const filtered = filterLib(items, query ?? q)
  const groups = (['Text', 'Media', 'Advanced', 'Embeds'] as const)
    .map(g => [g, filtered.filter(i => i.group === g)] as const).filter(([, l]) => l.length)
  return (
    <div className="flex min-h-0 flex-col">
      {query === undefined && (
        <div className="relative border-b border-slate-100 p-2">
          <Search size={14} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search blocks"
            onKeyDown={e => { if (e.key === 'Enter' && filtered[0]) onPick(filtered[0]) }}
            className="w-full rounded-lg bg-slate-50 py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#3858e9]/30" />
        </div>
      )}
      <div className="max-h-80 overflow-y-auto p-1.5">
        {groups.length === 0 && <p className="px-3 py-6 text-center text-sm text-slate-400">No blocks match.</p>}
        {groups.map(([g, list]) => (
          <div key={g} className="mb-1">
            <p className="px-2.5 pb-1 pt-2 text-xs font-semibold text-slate-400">{g}</p>
            {list.map(i => {
              const Icon = i.icon
              return (
                <button key={i.id} type="button" onMouseDown={e => e.preventDefault()} onClick={() => onPick(i)}
                  className="flex w-full items-center gap-3 rounded-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"><Icon size={14} /></span>
                  {i.label}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
   Visual block editor
──────────────────────────────────────────────────────────────────────────── */

export interface BlockEditorApi {
  format: (before: string, after: string, placeholder: string) => void
  setType: (t: ConvertType) => void
  insertBlock: (text: string, caret?: number) => void
  focusFirst: () => void
}

type Focus = { id: string; pos: number | 'start' | 'end' }

const BlockView = memo(function BlockView({ text, dbBlocks }: { text: string; dbBlocks: DBBlockConfig[] }) {
  return <MarkdownView content={text} dbBlocks={dbBlocks} />
})

const BLOCK_TA: Record<BlockType, string> = {
  p: 'text-[1.05rem] leading-[1.85] text-slate-800',
  h1: 'text-3xl font-bold leading-tight text-slate-900', h2: 'text-2xl font-semibold leading-snug text-slate-900',
  h3: 'text-xl font-semibold text-slate-800', ul: 'text-[1.05rem] leading-[1.85] text-slate-800',
  ol: 'text-[1.05rem] leading-[1.85] text-slate-800', quote: 'text-[1.05rem] italic leading-[1.85] text-slate-600',
  code: 'rounded-lg bg-[#1a1a1a] p-3 font-mono text-[13px] leading-relaxed text-gray-100',
  mermaid: 'rounded-lg bg-slate-50 p-3 font-mono text-[13px] leading-relaxed text-slate-700',
  math: 'rounded-lg bg-slate-50 p-3 font-mono text-[13px] leading-relaxed text-slate-700',
  table: 'rounded-lg bg-slate-50 p-3 font-mono text-[13px] leading-relaxed text-slate-700',
  html: 'rounded-lg bg-slate-50 p-3 font-mono text-[13px] leading-relaxed text-slate-700',
  custom: 'rounded-lg bg-amber-50 p-3 font-mono text-[13px] text-amber-800', image: 'rounded-lg bg-slate-50 p-3 font-mono text-[13px] text-slate-700',
  hr: 'text-slate-400',
}

const BlockEditor = forwardRef<BlockEditorApi, {
  value: string
  onChange: (md: string) => void
  library: LibItem[]
  dbBlocks: DBBlockConfig[]
  onActiveType: (t: BlockType | null) => void
}>(function BlockEditor({ value, onChange, library, dbBlocks, onActiveType }, ref) {
  const uid = useRef(0)
  const mk = useCallback((text: string): Block => ({ id: `b${++uid.current}`, text }), [])
  const init = (md: string) => (parseBlocks(md).length ? parseBlocks(md) : ['']).map(mk)

  const [blocks, setBlocks] = useState<Block[]>(() => init(value))
  const [activeId, setActiveId] = useState<string | null>(null)
  const [insertAt, setInsertAt] = useState<number | null>(null)
  const lastEmitted = useRef(value)
  const taRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const pending = useRef<Focus | null>(null)

  // Re-sync when the markdown changes outside this editor (undo, code mode, load).
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value
      setBlocks(init(value)); setActiveId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const commit = useCallback((next: Block[]) => {
    setBlocks(next)
    const md = serialize(next)
    lastEmitted.current = md
    onChange(md)
  }, [onChange])

  const focusBlock = (id: string, pos: Focus['pos'] = 'end') => { pending.current = { id, pos }; setActiveId(id) }

  useEffect(() => {
    const p = pending.current
    if (!p) return
    const el = taRefs.current[p.id]
    if (!el) return
    el.focus()
    const pos = p.pos === 'start' ? 0 : p.pos === 'end' ? el.value.length : p.pos
    el.setSelectionRange(pos, pos)
    pending.current = null
  })

  const activeIndex = blocks.findIndex(b => b.id === activeId)
  const activeText = activeIndex >= 0 ? blocks[activeIndex].text : null
  useEffect(() => { onActiveType(activeText === null ? null : detectType(activeText)) }, [activeText, onActiveType])

  const updateText = (id: string, text: string) => commit(blocks.map(b => (b.id === id ? { ...b, text } : b)))

  const addAt = (index: number, text = '', caret?: number) => {
    const nb = mk(text)
    commit([...blocks.slice(0, index), nb, ...blocks.slice(index)])
    focusBlock(nb.id, caret ?? 'end')
  }

  const remove = (i: number) => {
    if (blocks.length === 1) { updateText(blocks[0].id, ''); focusBlock(blocks[0].id, 0); return }
    const next = blocks.filter((_, k) => k !== i)
    commit(next)
    const target = next[Math.max(0, i - 1)]
    focusBlock(target.id, i === 0 ? 'start' : 'end')
  }

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= blocks.length) return
    const next = [...blocks]; [next[i], next[j]] = [next[j], next[i]]
    commit(next)
  }

  const duplicate = (i: number) => {
    const nb = mk(blocks[i].text)
    commit([...blocks.slice(0, i + 1), nb, ...blocks.slice(i + 1)])
    setActiveId(nb.id)
  }

  const formatActive = (before: string, after: string, placeholder: string) => {
    const b = blocks[activeIndex]; const el = b && taRefs.current[b.id]
    if (!b || !el) return
    const s = el.selectionStart, e = el.selectionEnd
    const sel = b.text.slice(s, e) || placeholder
    const text = b.text.slice(0, s) + before + sel + after + b.text.slice(e)
    updateText(b.id, text)
    focusBlock(b.id, s + before.length + sel.length)
  }

  const insertBlock = (text: string, caret?: number) => {
    if (activeIndex >= 0 && isBlank(blocks[activeIndex].text)) {
      updateText(blocks[activeIndex].id, text); focusBlock(blocks[activeIndex].id, caret ?? 'end')
    } else addAt(activeIndex >= 0 ? activeIndex + 1 : blocks.length, text, caret)
  }

  useImperativeHandle(ref, () => ({
    format: formatActive,
    setType: t => { const b = blocks[activeIndex]; if (b) { const text = convertText(b.text, t); updateText(b.id, text); focusBlock(b.id) } },
    insertBlock,
    focusFirst: () => focusBlock(blocks[0].id, 'start'),
  }))

  const slashQuery = activeText !== null && /^\/[\w ]*$/.test(activeText) ? activeText.slice(1) : null
  const slashItems = slashQuery !== null ? filterLib(library, slashQuery) : []

  const pickSlash = (b: Block, item: LibItem) => { updateText(b.id, item.text); focusBlock(b.id, item.caret ?? 'end') }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, b: Block, i: number) => {
    const el = e.currentTarget
    const mod = e.metaKey || e.ctrlKey
    const type = detectType(b.text)
    const k = e.key.toLowerCase()

    if (mod && k === 'b') { e.preventDefault(); formatActive('**', '**', 'bold text'); return }
    if (mod && k === 'i') { e.preventDefault(); formatActive('*', '*', 'italic text'); return }
    if (mod && k === 'k') { e.preventDefault(); formatActive('[', '](https://)', 'link text'); return }
    if (e.key === 'Escape') { setActiveId(null); return }

    if (e.key === 'Enter' && slashQuery !== null && slashItems[0]) { e.preventDefault(); pickSlash(b, slashItems[0]); return }

    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      if (mod) { e.preventDefault(); addAt(i + 1); return }
      if (MULTILINE.includes(type)) return
      if (e.shiftKey) {
        if (type === 'quote') {
          e.preventDefault()
          const p = el.selectionStart
          updateText(b.id, b.text.slice(0, p) + '\n> ' + b.text.slice(el.selectionEnd)); focusBlock(b.id, p + 3)
        }
        return
      }
      e.preventDefault()
      const pos = el.selectionStart
      const head = b.text.slice(0, pos), tail = b.text.slice(el.selectionEnd)

      if (type === 'ul' || type === 'ol') {
        const lineStart = head.lastIndexOf('\n') + 1
        const line = head.slice(lineStart)
        if (/^\s*([-*+]|\d+[.)])\s*$/.test(line) && tail === '') {
          const trimmed = head.slice(0, lineStart).replace(/\n$/, '')
          if (!trimmed.trim()) { updateText(b.id, ''); focusBlock(b.id, 0); return }
          const nb = mk('')
          commit([...blocks.slice(0, i), { ...b, text: trimmed }, nb, ...blocks.slice(i + 1)])
          focusBlock(nb.id, 'start'); return
        }
        const m = line.match(/^(\s*)([-*+]|(\d+)[.)])\s/)
        if (m) {
          const marker = m[3] ? `${+m[3] + 1}.` : m[2]
          const ins = `\n${m[1]}${marker} `
          updateText(b.id, head + ins + tail); focusBlock(b.id, pos + ins.length); return
        }
      }

      if (tail === '') { addAt(i + 1); return }
      const nb = mk(tail.replace(/^\s+/, ''))
      commit([...blocks.slice(0, i), { ...b, text: head.replace(/\s+$/, '') }, nb, ...blocks.slice(i + 1)])
      focusBlock(nb.id, 'start'); return
    }

    if (e.key === 'Backspace' && b.text === '' && blocks.length > 1) { e.preventDefault(); remove(i); return }
    if (e.key === 'ArrowUp' && el.selectionStart === 0 && el.selectionEnd === 0 && i > 0) {
      e.preventDefault(); focusBlock(blocks[i - 1].id, 'end')
    }
    if (e.key === 'ArrowDown' && el.selectionStart === b.text.length && i < blocks.length - 1 && slashQuery === null) {
      e.preventDefault(); focusBlock(blocks[i + 1].id, 'start')
    }
  }

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>, b: Block, i: number) => {
    const txt = e.clipboardData.getData('text/plain')
    if (!/\n\s*\n/.test(txt) || MULTILINE.includes(detectType(b.text))) return
    e.preventDefault()
    const parts = parseBlocks(txt).map(mk)
    if (!parts.length) return
    commit(isBlank(b.text)
      ? [...blocks.slice(0, i), ...parts, ...blocks.slice(i + 1)]
      : [...blocks.slice(0, i + 1), ...parts, ...blocks.slice(i + 1)])
    focusBlock(parts[parts.length - 1].id, 'end')
  }

  const pickInline = (index: number, item: LibItem) => { setInsertAt(null); addAt(index, item.text, item.caret) }

  return (
    <div className="relative" onClick={e => { if ((e.target as HTMLElement).closest('a')) e.preventDefault() }}>
      {blocks.map((b, i) => {
        const active = b.id === activeId
        const type = detectType(b.text)
        const blank = isBlank(b.text)
        return (
          <div key={b.id} className="relative">
            {i > 0 && (
              <div className="group/ins relative -my-1 flex h-3 items-center justify-center">
                <div className="absolute inset-x-0 top-1/2 h-px bg-[#3858e9] opacity-0 transition-opacity group-hover/ins:opacity-40" />
                <button type="button" aria-label="Add block here" onClick={() => setInsertAt(insertAt === i ? null : i)}
                  className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full ${ACCENT} opacity-0 transition-opacity focus-visible:opacity-100 group-hover/ins:opacity-100 ${insertAt === i ? '!opacity-100' : ''}`}>
                  <Plus size={12} />
                </button>
                {insertAt === i && (
                  <div className="absolute top-6 z-30 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    <BlockLibrary items={library} onPick={item => pickInline(i, item)} />
                  </div>
                )}
              </div>
            )}

            <div className={`relative -mx-3 rounded-lg px-3 py-1 transition-shadow ${active ? RING : 'hover:ring-1 hover:ring-slate-200'}`}>
              {active && (
                <div onMouseDown={e => e.preventDefault()} className="absolute -top-10 left-0 z-20 flex items-center gap-0.5 rounded-full border border-slate-200 bg-white p-1 shadow-md">
                  <span className="px-3 text-xs font-medium text-slate-500">{TYPE_LABEL[type]}</span>
                  <span className="mx-0.5 h-4 w-px bg-slate-200" />
                  <IconBtn icon={ArrowUp} label="Move up" onClick={() => move(i, -1)} disabled={i === 0} keepFocus />
                  <IconBtn icon={ArrowDown} label="Move down" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} keepFocus />
                  <IconBtn icon={Copy} label="Duplicate block" onClick={() => duplicate(i)} keepFocus />
                  <IconBtn icon={Plus} label="Add block below" onClick={() => addAt(i + 1)} keepFocus />
                  <IconBtn icon={Trash2} label="Delete block" onClick={() => remove(i)} keepFocus className="hover:!bg-red-50 hover:!text-red-600" />
                </div>
              )}

              {active ? (
                <>
                  <textarea
                    ref={el => { taRefs.current[b.id] = el; if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` } }}
                    value={b.text} rows={1} spellCheck
                    aria-label={`${TYPE_LABEL[type]} block`}
                    placeholder={blocks.length === 1 ? 'Start writing, or type / to add a block' : 'Type / to add a block'}
                    onChange={e => updateText(b.id, e.target.value)}
                    onKeyDown={e => onKeyDown(e, b, i)}
                    onPaste={e => onPaste(e, b, i)}
                    className={`block w-full resize-none overflow-hidden border-0 bg-transparent p-0 outline-none placeholder:text-slate-300 ${BLOCK_TA[type]}`}
                  />
                  {RICH.includes(type) && !blank && (
                    <div className="mt-3 border-t border-dashed border-slate-200 pt-2"><BlockView text={b.text} dbBlocks={dbBlocks} /></div>
                  )}
                  {slashQuery !== null && slashItems.length > 0 && (
                    <div className="absolute left-3 top-full z-30 mt-1 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                      <BlockLibrary items={library} query={slashQuery} onPick={item => pickSlash(b, item)} />
                    </div>
                  )}
                </>
              ) : (
                <div onClick={() => focusBlock(b.id)} className="cursor-text">
                  {blank
                    ? <p className="py-2 text-[1.05rem] text-slate-300">{blocks.length === 1 ? 'Start writing, or type / to add a block' : 'Type / to add a block'}</p>
                    : <BlockView text={b.text} dbBlocks={dbBlocks} />}
                </div>
              )}
            </div>
          </div>
        )
      })}

      <button type="button"
        onClick={() => { const last = blocks[blocks.length - 1]; isBlank(last.text) ? focusBlock(last.id) : addAt(blocks.length) }}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-slate-200 py-3 text-sm text-slate-400 transition-colors hover:border-[#3858e9] hover:text-[#3858e9]">
        <Plus size={14} /> Add block
      </button>
    </div>
  )
})

/* ────────────────────────────────────────────────────────────────────────────
   Code mode (CodeMirror) config
──────────────────────────────────────────────────────────────────────────── */

const markdownTheme = EditorView.theme({
  '&': { fontSize: '1.05rem', fontFamily: 'var(--font-slabo), Georgia, serif', background: 'transparent !important', color: '#1a1b1c' },
  '.cm-content': { padding: '0', caretColor: '#1a1b1c' },
  '.cm-line': { padding: '0 0 2px', lineHeight: '1.85' },
  '&.cm-focused': { outline: 'none !important' },
  '.cm-editor': { background: 'transparent !important' },
  '.cm-scroller': { overflow: 'visible' },
  '.cm-header-1': { fontSize: '1.7em', fontWeight: '700', color: '#000' },
  '.cm-header-2': { fontSize: '1.4em', fontWeight: '600', color: '#1a1b1c' },
  '.cm-header-3': { fontSize: '1.2em', fontWeight: '600', color: '#313334' },
  '.cm-strong': { fontWeight: '700', color: '#000' },
  '.cm-em': { fontStyle: 'italic', color: '#5e5f61' },
  '.cm-strikethrough': { textDecoration: 'line-through', color: '#9e9fa0' },
  '.cm-monospace': { fontFamily: 'monospace', background: '#efedee', color: '#585f64', borderRadius: '3px', padding: '0 3px' },
  '.cm-link': { color: '#3858e9', textDecoration: 'underline' },
  '.cm-url': { color: '#b8b9ba' },
  '.cm-quote': { color: '#5e5f61', fontStyle: 'italic' },
  '.cm-gutters': { display: 'none' },
  '.cm-activeLine': { background: 'rgba(56,88,233,0.04)' },
  '.cm-selectionBackground': { background: 'rgba(56,88,233,0.15) !important' },
  '.cm-custom-block': {
    color: '#b45309', fontWeight: '600', backgroundColor: '#fef9c3', padding: '1px 5px',
    borderRadius: '4px', border: '1px solid #fde68a', fontSize: '0.9em',
  },
})

const customBlockHighlight = ViewPlugin.fromClass(class {
  decorations: DecorationSet
  constructor(view: EditorView) { this.decorations = this.build(view) }
  update(u: ViewUpdate) { if (u.docChanged || u.viewportChanged) this.decorations = this.build(u.view) }
  build(view: EditorView) {
    const builder = new RangeSetBuilder<Decoration>()
    const regex = /\[!.+?\(url=".+?"\)\]/g
    const text = view.state.doc.toString()
    let m
    while ((m = regex.exec(text)) !== null) builder.add(m.index, m.index + m[0].length, Decoration.mark({ class: 'cm-custom-block' }))
    return builder.finish()
  }
}, { decorations: v => v.decorations })

/* ────────────────────────────────────────────────────────────────────────────
   Page
──────────────────────────────────────────────────────────────────────────── */

const SIDEBAR_TABS: { id: SidebarTab; label: string; icon: any }[] = [
  { id: 'metadata', label: 'Post', icon: Settings },
  { id: 'seo', label: 'Search engine', icon: SearchCheck },
  { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
  { id: 'tags', label: 'Tags and badges', icon: Tag },
  { id: 'distribution', label: 'Publishing', icon: Share2 },
]

const DEVICE_WIDTH: Record<Device, string> = { desktop: '900px', tablet: '768px', mobile: '390px' }

const EditorPage = ({ searchParams }: { searchParams: Promise<{ id?: string }> }) => {
  const { id: initialId } = React.use(searchParams)
  const router = useRouter()
  const { data: session } = useSession()
  const isDesktop = useMedia('(min-width: 1024px)')

  const [articleId, setArticleId] = useState<string | undefined>(initialId)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [meta, setMetaState] = useState<Meta>(DEFAULT_META)
  const [mode, setMode] = useState<Mode>('visual')
  const [device, setDevice] = useState<Device>('desktop')
  const [splitPreview, setSplitPreview] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<SidebarTab>('metadata')
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [showPublish, setShowPublish] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [dbBlocks, setDbBlocks] = useState<DBBlockConfig[]>([])
  const [activeType, setActiveType] = useState<BlockType | null>(null)
  const [toast, setToast] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const editorRef = useRef<any>(null)
  const blockApi = useRef<BlockEditorApi>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const wasPublished = useRef(false)
  const [, bump] = useState(0)

  const markDirty = useCallback(() => setSaveStatus(s => (s === 'saving' ? s : 'dirty')), [])
  const setMeta = useCallback(<K extends keyof Meta>(k: K, v: Meta[K]) => { setMetaState(m => ({ ...m, [k]: v })); markDirty() }, [markDirty])

  /* ── undo / redo ─────────────────────────────────────────────── */
  const hist = useRef<{ stack: string[]; idx: number; timer: ReturnType<typeof setTimeout> | null }>({ stack: [''], idx: 0, timer: null })
  const contentRef = useRef(content); contentRef.current = content

  const commitNow = (val: string) => {
    const h = hist.current
    if (h.timer) { clearTimeout(h.timer); h.timer = null }
    if (h.stack[h.idx] === val) return
    h.stack = [...h.stack.slice(0, h.idx + 1), val].slice(-100)
    h.idx = h.stack.length - 1
    bump(n => n + 1)
  }
  const updateContent = useCallback((val: string) => {
    setContent(val); markDirty()
    const h = hist.current
    if (h.timer) clearTimeout(h.timer)
    h.timer = setTimeout(() => commitNow(val), 500)
  }, [markDirty])
  const undo = () => { commitNow(contentRef.current); const h = hist.current; if (h.idx > 0) { h.idx--; setContent(h.stack[h.idx]); markDirty(); bump(n => n + 1) } }
  const redo = () => { const h = hist.current; if (h.idx < h.stack.length - 1) { h.idx++; setContent(h.stack[h.idx]); markDirty(); bump(n => n + 1) } }
  const canUndo = hist.current.idx > 0 || content !== hist.current.stack[hist.current.idx]
  const canRedo = hist.current.idx < hist.current.stack.length - 1

  /* ── data loading ────────────────────────────────────────────── */
  useEffect(() => { if (session?.user?.name && !meta.author) setMetaState(m => ({ ...m, author: m.author || session.user!.name! })) }, [session?.user?.name]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch('/api/blocks?user=1').then(r => (r.ok ? r.json() : [])).then(d => Array.isArray(d) && setDbBlocks(d)).catch(() => null)
  }, [])

  useEffect(() => { if (window.matchMedia('(min-width: 1280px)').matches) setSettingsOpen(true) }, [])

  useEffect(() => {
    if (!initialId) {
      try {
        const raw = localStorage.getItem('article-draft:new')
        if (raw) {
          const d = JSON.parse(raw)
          if (d.content || d.title) {
            setTitle(d.title || ''); setContent(d.content || ''); setMetaState({ ...DEFAULT_META, ...d.meta })
            hist.current = { stack: [d.content || ''], idx: 0, timer: null }
            setSaveStatus('dirty'); setToast({ kind: 'ok', text: 'Restored your unsaved draft.' })
          }
        }
      } catch { /* ignore */ }
      return
    }
    ;(async () => {
      try {
        const res = await fetch(`/api/articles/${initialId}`)
        if (!res.ok) throw new Error()
        const d = await res.json()
        setTitle(d.title || ''); setContent(d.content || '')
        setMetaState(m => ({
          ...m,
          author: d.author || m.author, category: d.category || '', coverImage: d.image || '', tags: d.tags || [],
          featured: !!d.featured, breaking: !!d.breaking, trending: !!d.trending,
          visibility: d.visibility || 'public', status: d.status || 'draft',
          scheduledAt: d.scheduledAt ? new Date(d.scheduledAt).toISOString().slice(0, 16) : '',
          seoTitle: d.seoTitle || '', metaDescription: d.metaDescription || d.description || '',
          focusKeyword: d.focusKeyword || '', canonicalUrl: d.canonicalUrl || '', ogImage: d.ogImage || '',
          twitterCard: d.twitterCard || 'summary_large_image', noIndex: !!d.noIndex,
          allowComments: d.allowComments ?? true, showInRss: d.showInRss ?? true, ampEnabled: !!d.ampEnabled,
          cssClass: d.cssClass || '', redirectUrl: d.redirectUrl || '',
        }))
        wasPublished.current = d.status === 'published'
        hist.current = { stack: [d.content || ''], idx: 0, timer: null }
        setLastSaved(new Date()); setSaveStatus('saved')
      } catch {
        setToast({ kind: 'error', text: 'Could not load this article.' })
      }
    })()
  }, [initialId])

  useEffect(() => {
    const el = titleRef.current
    if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }
  }, [title, mode])

  /* ── local backup + unload guard ─────────────────────────────── */
  useEffect(() => {
    if (saveStatus !== 'dirty') return
    const t = setTimeout(() => {
      try { localStorage.setItem(`article-draft:${articleId || 'new'}`, JSON.stringify({ title, content, meta })) } catch { /* quota */ }
    }, 1200)
    return () => clearTimeout(t)
  }, [saveStatus, title, content, meta, articleId])

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (saveStatus === 'dirty') { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [saveStatus])

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t) } }, [toast])

  /* ── analysis (SEO + accessibility) ──────────────────────────── */
  const analysis = useMemo(() => {
    const body = content.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, '')
    const headings = Array.from(body.matchAll(/^(#{1,6})\s+\S/gm)).map(m => m[1].length)
    let prev = 1, skipped = false
    headings.forEach(h => { if (h > prev + 1) skipped = true; prev = h })
    const words = countWords(content)
    const seo = [
      { ok: title.length >= 10 && title.length <= 70, text: `Title is 10–70 characters (${title.length})` },
      { ok: !!meta.focusKeyword && title.toLowerCase().includes(meta.focusKeyword.toLowerCase()), text: 'Focus keyword appears in the title' },
      { ok: meta.metaDescription.length >= 120 && meta.metaDescription.length <= 160, text: `Meta description is 120–160 characters (${meta.metaDescription.length})` },
      { ok: words >= 300, text: `At least 300 words (${words})` },
      { ok: !!meta.coverImage, text: 'Cover image is set' },
      { ok: !meta.noIndex, text: 'Page can be indexed' },
    ]
    const a11y = [
      { ok: title.trim().length > 0, text: 'Article has a title' },
      { ok: !headings.includes(1), text: 'Body has no extra Heading 1 (the title is the H1)' },
      { ok: !skipped, text: 'Headings do not skip levels' },
      { ok: !/!\[\s*\]\(/.test(body), text: 'Every image has alt text' },
      { ok: !/\[\s*(click here|here|read more|link)\s*\]\(/i.test(body), text: 'Links use descriptive text' },
    ]
    return { seo, a11y, seoScore: Math.round((seo.filter(c => c.ok).length / seo.length) * 100) }
  }, [content, title, meta.focusKeyword, meta.metaDescription, meta.coverImage, meta.noIndex])

  /* ── saving & publishing ─────────────────────────────────────── */
  const persist = async (status: ArticleStatus) => {
    const payload = {
      title, description: meta.metaDescription, content, category: meta.category, image: meta.coverImage,
      readTime: estimateReadTime(content), featured: meta.featured, breaking: meta.breaking, trending: meta.trending,
      tags: meta.tags, author: meta.author, seoTitle: meta.seoTitle, metaDescription: meta.metaDescription,
      focusKeyword: meta.focusKeyword, canonicalUrl: meta.canonicalUrl, ogImage: meta.ogImage, twitterCard: meta.twitterCard,
      noIndex: meta.noIndex, allowComments: meta.allowComments, showInRss: meta.showInRss, ampEnabled: meta.ampEnabled,
      redirectUrl: meta.redirectUrl, cssClass: meta.cssClass, visibility: meta.visibility,
      scheduledAt: meta.scheduledAt ? new Date(meta.scheduledAt).toISOString() : undefined, status,
    }
    const res = await fetch(articleId ? `/api/articles/${articleId}` : '/api/articles', {
      method: articleId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j.error || 'Request failed')
    let id = articleId
    if (!id && j?.id) { id = j.id; setArticleId(j.id); window.history.replaceState(null, '', `?id=${j.id}`) }
    if (status === 'published' && !wasPublished.current && id) {
      wasPublished.current = true
      fetch('/api/ptp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ articleId: id }) }).catch(() => null)
    }
    try { localStorage.removeItem(`article-draft:${articleId || 'new'}`) } catch { /* ignore */ }
    setSaveStatus('saved'); setLastSaved(new Date())
  }

  const save = useCallback(async () => {
    if (!title.trim() && !content.trim()) { setToast({ kind: 'error', text: 'Add a title or some content first.' }); return }
    setSaveStatus('saving')
    try { await persist(meta.status); setToast({ kind: 'ok', text: 'Saved.' }) }
    catch (e) { setSaveStatus('error'); setToast({ kind: 'error', text: e instanceof Error ? e.message : 'Save failed.' }) }
  }, [title, content, meta, articleId]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveRef = useRef(save); saveRef.current = save
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveRef.current() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const publish = async () => {
    setPublishing(true)
    const future = !!meta.scheduledAt && new Date(meta.scheduledAt).getTime() > Date.now()
    const status: ArticleStatus = future ? 'scheduled' : 'published'
    try {
      await persist(status)
      setMetaState(m => ({ ...m, status }))
      setShowPublish(false)
      setToast({ kind: 'ok', text: future ? 'Scheduled.' : 'Published.' })
    } catch (e) {
      setSaveStatus('error'); setToast({ kind: 'error', text: e instanceof Error ? e.message : 'Publishing failed.' })
    } finally { setPublishing(false) }
  }

  useEffect(() => {
    if (!showPublish) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowPublish(false) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [showPublish])

  const exit = () => { if (saveStatus !== 'dirty' || confirm('You have unsaved changes. Leave anyway?')) router.back() }

  const saveLabel = saveStatus === 'saving' ? 'Saving…' : saveStatus === 'dirty' ? 'Unsaved changes' : saveStatus === 'error' ? 'Save failed'
    : lastSaved ? `Saved ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Saved'

  /* ── toolbar actions (work in both visual and code mode) ─────── */
  const cmInsert = useCallback((before: string, after = '', ph = '') => {
    const view = editorRef.current?.view; if (!view) return
    const { from, to } = view.state.selection.main
    const sel = view.state.sliceDoc(from, to) || ph
    view.dispatch({ changes: { from, to, insert: before + sel + after }, selection: { anchor: from + before.length + sel.length }, scrollIntoView: true })
    view.focus()
  }, [])
  const cmPrefix = useCallback((prefix: string) => {
    const view = editorRef.current?.view; if (!view) return
    const line = view.state.doc.lineAt(view.state.selection.main.from)
    view.dispatch({ changes: { from: line.from, insert: prefix }, scrollIntoView: true })
    view.focus()
  }, [])

  const applyFormat = (b: string, a: string, ph: string) => (mode === 'visual' ? blockApi.current?.format(b, a, ph) : cmInsert(b, a, ph))
  const applyType = (t: ConvertType) => {
    if (mode === 'visual') return blockApi.current?.setType(t)
    if (t === 'code') return cmInsert('```\n', '\n```', 'code')
    if (LINE_PREFIX[t]) cmPrefix(LINE_PREFIX[t]!)
  }
  const library = useMemo<LibItem[]>(() => [
    ...CORE_BLOCKS,
    ...(([...blockRegistry.getAllBlocks(), ...dbBlocks]) as DBBlockConfig[]).map(b => ({
      id: `custom-${b.name}`, label: b.name, icon: Box, group: 'Embeds' as const, text: b.template || `[!${b.name}(url="")]`,
    })),
  ], [dbBlocks])

  const pickLibrary = (item: LibItem) => {
    setLibraryOpen(false)
    if (mode === 'visual') blockApi.current?.insertBlock(item.text, item.caret)
    else cmInsert('\n' + item.text + '\n')
  }

  const customCompletions = useCallback((ctx: CompletionContext) => {
    const word = ctx.matchBefore(/\[!/)
    if (!word || (word.from === word.to && !ctx.explicit)) return null
    return { from: word.from, options: library.filter(l => l.group === 'Embeds').map(l => ({ label: l.text, type: 'function', apply: l.text })) }
  }, [library])

  const cmExtensions = useMemo(() => [
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    EditorView.lineWrapping, markdownTheme, customBlockHighlight,
    autocompletion({ override: [customCompletions] }),
  ], [customCompletions])

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (t && !meta.tags.includes(t)) setMeta('tags', [...meta.tags, t])
    setTagInput('')
  }

  /* ── settings panel ──────────────────────────────────────────── */
  // NOTE: called as a function, not rendered as <Panel />. A component defined inside
  // EditorPage would be a new type every render and remount (dropping input focus).
  const renderSettings = () => (
    <div className="flex h-full min-h-0 flex-col">
      <div role="tablist" aria-label="Settings sections" className="flex shrink-0 gap-1 border-b border-slate-100 px-3 py-2">
        {SIDEBAR_TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} role="tab" aria-selected={activeTab === t.id} title={t.label} aria-label={t.label} onClick={() => setActiveTab(t.id)}
              className={`flex h-9 flex-1 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3858e9] ${activeTab === t.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              <Icon size={16} />
            </button>
          )
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <h2 className="px-5 pt-4 text-base font-semibold text-slate-900">{SIDEBAR_TABS.find(t => t.id === activeTab)?.label}</h2>

        {activeTab === 'metadata' && (<>
          <Panel title="Article">
            <Field label="Category" value={meta.category} onChange={v => setMeta('category', v)} placeholder="e.g. Technology" />
            <Field label="Author" value={meta.author} onChange={v => setMeta('author', v)} />
          </Panel>
          <Panel title="Cover image">
            {meta.coverImage && (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <img src={meta.coverImage} alt="" className="aspect-video w-full object-cover" />
              </div>
            )}
            <Field label="Image URL" value={meta.coverImage} onChange={v => setMeta('coverImage', v)} placeholder="https://…" />
            {meta.coverImage && <button type="button" onClick={() => setMeta('coverImage', '')} className="self-start rounded-full px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50">Remove cover image</button>}
          </Panel>
          <Panel title="Summary">
            <div className="grid grid-cols-2 gap-3">
              {[['Words', countWords(content).toLocaleString()], ['Read time', `${estimateReadTime(content)} min`]].map(([l, v]) => (
                <div key={l} className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-400">{l}</p><p className="text-lg font-semibold tabular-nums text-slate-900">{v}</p></div>
              ))}
            </div>
          </Panel>
          <Panel title="Advanced">
            <Field label="Custom CSS class" value={meta.cssClass} onChange={v => setMeta('cssClass', v)} placeholder="e.g. long-form" />
            <Field label="Redirect URL" value={meta.redirectUrl} onChange={v => setMeta('redirectUrl', v)} placeholder="https://old-url…" />
          </Panel>
        </>)}

        {activeTab === 'seo' && (<>
          <Panel title="Score">
            <div className="flex items-center gap-3">
              <span className={`text-3xl font-bold tabular-nums ${analysis.seoScore >= 70 ? 'text-emerald-600' : analysis.seoScore >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{analysis.seoScore}%</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${analysis.seoScore >= 70 ? 'bg-emerald-500' : analysis.seoScore >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${analysis.seoScore}%` }} /></div>
            </div>
            <div className="flex flex-col gap-2.5">{analysis.seo.map((c, i) => <CheckItem key={i} ok={c.ok} text={c.text} />)}</div>
          </Panel>
          <Panel title="Search appearance">
            <Field label="SEO title" value={meta.seoTitle} onChange={v => setMeta('seoTitle', v)} placeholder={title || 'Uses the article title'} />
            <Field label="Meta description" value={meta.metaDescription} onChange={v => setMeta('metaDescription', v)} multiline placeholder="120–160 characters" hint={`${meta.metaDescription.length}/160`} />
            <Field label="Focus keyword" value={meta.focusKeyword} onChange={v => setMeta('focusKeyword', v)} placeholder="e.g. climate policy" />
            <Field label="Canonical URL" value={meta.canonicalUrl} onChange={v => setMeta('canonicalUrl', v)} placeholder="https://…" />
            <Toggle label="Hide from search engines" description="Adds a noindex tag" checked={meta.noIndex} onChange={v => setMeta('noIndex', v)} />
          </Panel>
          <Panel title="Social preview">
            <Field label="Social image URL" value={meta.ogImage} onChange={v => setMeta('ogImage', v)} placeholder="Uses the cover image" />
            <SelectField label="Twitter card" value={meta.twitterCard} onChange={v => setMeta('twitterCard', v)} options={[{ value: 'summary_large_image', label: 'Large image' }, { value: 'summary', label: 'Summary' }]} />
          </Panel>
        </>)}

        {activeTab === 'accessibility' && (
          <Panel title="Checks">
            <div className="flex flex-col gap-2.5">{analysis.a11y.map((c, i) => <CheckItem key={i} ok={c.ok} text={c.text} />)}</div>
          </Panel>
        )}

        {activeTab === 'tags' && (<>
          <Panel title="Tags">
            <div className="flex gap-2">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }} placeholder="Add a tag"
                className="min-w-0 flex-1 rounded-full border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-300 focus:border-[#3858e9] focus:ring-2 focus:ring-[#3858e9]/20" />
              <button type="button" onClick={addTag} className="rounded-full bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-black">Add</button>
            </div>
            {meta.tags.length ? (
              <div className="flex flex-wrap gap-2">
                {meta.tags.map(t => (
                  <span key={t} className="flex items-center gap-1.5 rounded-full border border-slate-200 py-1 pl-3 pr-2 text-sm text-slate-700">
                    #{t}
                    <button type="button" aria-label={`Remove tag ${t}`} onClick={() => setMeta('tags', meta.tags.filter(x => x !== t))} className="rounded-full p-0.5 text-slate-400 hover:text-red-600"><X size={12} /></button>
                  </span>
                ))}
              </div>
            ) : <p className="text-sm text-slate-400">No tags yet.</p>}
          </Panel>
          <Panel title="Badges">
            <Toggle label="Featured" description="Show in the featured rail" checked={meta.featured} onChange={v => setMeta('featured', v)} />
            <Toggle label="Breaking" description="Mark as breaking news" checked={meta.breaking} onChange={v => setMeta('breaking', v)} />
            <Toggle label="Trending" description="Mark as trending" checked={meta.trending} onChange={v => setMeta('trending', v)} />
          </Panel>
        </>)}

        {activeTab === 'distribution' && (<>
          <Panel title="Visibility">
            <SelectField label="Who can see this" value={meta.visibility} onChange={v => setMeta('visibility', v as Visibility)}
              options={[{ value: 'public', label: 'Public' }, { value: 'unlisted', label: 'Unlisted (link only)' }, { value: 'private', label: 'Private' }]} />
            <SelectField label="Status" value={meta.status} onChange={v => setMeta('status', v as ArticleStatus)}
              options={[{ value: 'draft', label: 'Draft' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'published', label: 'Published' }]} />
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Publish at</FieldLabel>
              <input type="datetime-local" value={meta.scheduledAt} onChange={e => setMeta('scheduledAt', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#3858e9] focus:ring-2 focus:ring-[#3858e9]/20" />
              <p className="text-xs text-slate-400">Leave empty to publish immediately.</p>
            </div>
          </Panel>
          <Panel title="Discussion and feeds">
            <Toggle label="Allow comments" checked={meta.allowComments} onChange={v => setMeta('allowComments', v)} />
            <Toggle label="Include in RSS feed" checked={meta.showInRss} onChange={v => setMeta('showInRss', v)} />
            <Toggle label="AMP version" description="Publish a lightweight version" checked={meta.ampEnabled} onChange={v => setMeta('ampEnabled', v)} />
          </Panel>
          <Panel title="Share to">
            <div className="flex flex-wrap gap-2">
              {[[Twitter, 'X'], [Facebook, 'Facebook'], [Instagram, 'Instagram'], [Youtube, 'YouTube'], [Github, 'GitHub']].map(([Icon, n]: any) => (
                <button key={n} type="button" disabled title={`${n} sharing is coming soon`} aria-label={`${n} (coming soon)`}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 opacity-60"><Icon size={15} /></button>
              ))}
            </div>
          </Panel>
        </>)}
      </div>
    </div>
  )

  /* ── shared canvas pieces ────────────────────────────────────── */
  const titleBlock = (
    <div className="mb-6">
      <div className="mb-4"><Badges meta={meta} /></div>
      {meta.coverImage ? (
        <div className="group relative mb-6 aspect-video overflow-hidden rounded-xl">
          <img src={meta.coverImage} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <button onClick={() => setMeta('coverImage', '')} className="rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white">Remove cover</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => { setActiveTab('metadata'); setSettingsOpen(true) }}
          className="mb-4 flex items-center gap-2 rounded-full border border-dashed border-slate-200 px-4 py-2 text-sm text-slate-400 transition-colors hover:border-[#3858e9] hover:text-[#3858e9]">
          <ImagePlus size={15} /> Add cover image
        </button>
      )}
      <textarea ref={titleRef} rows={1} value={title} aria-label="Article title" placeholder="Add title"
        onChange={e => { setTitle(e.target.value); markDirty() }}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); mode === 'visual' ? blockApi.current?.focusFirst() : editorRef.current?.view?.focus() }
        }}
        className="w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-['Newsreader'] text-4xl font-bold leading-[1.15] tracking-tight text-slate-900 outline-none placeholder:text-slate-200 sm:text-5xl" />
      <p className="mt-3 flex flex-wrap items-center gap-x-3 text-sm text-slate-400">
        {meta.author && <span className="font-medium text-slate-500">{meta.author}</span>}
        {meta.category && <span>{meta.category}</span>}
        <span className="flex items-center gap-1"><Clock size={12} />{estimateReadTime(content)} min read</span>
      </p>
    </div>
  )

  const paper = 'mx-auto my-6 w-full max-w-[760px] rounded-xl border border-slate-200 bg-white px-6 py-10 shadow-sm sm:my-10 sm:px-14 sm:py-14'
  const visualDisabled = mode === 'visual' && !activeType

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
      <Header />

      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 sm:px-4">
          <IconBtn icon={ChevronLeft} label="Leave editor" onClick={exit} />
          {mode !== 'preview' && (
            <button type="button" aria-label="Add block" aria-expanded={libraryOpen} onClick={() => setLibraryOpen(o => !o)}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-transform ${libraryOpen ? 'rotate-45 bg-slate-900 text-white' : ACCENT}`}>
              <Plus size={18} />
            </button>
          )}
          <IconBtn icon={Undo2} label="Undo" onClick={undo} disabled={!canUndo} />
          <IconBtn icon={Redo2} label="Redo" onClick={redo} disabled={!canRedo} />

          <div className="mx-auto flex items-center rounded-full bg-slate-100 p-0.5" role="tablist" aria-label="Editor mode">
            {([['visual', 'Visual', PenLine], ['code', 'Code', FileCode], ['preview', 'Preview', Eye]] as const).map(([m, label, Icon]) => (
              <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                <Icon size={15} /><span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </div>

          <span className={`hidden items-center gap-2 text-sm lg:flex ${saveStatus === 'error' ? 'text-red-600' : 'text-slate-500'}`} aria-live="polite">
            <span className={`h-2 w-2 rounded-full ${saveStatus === 'saving' ? 'animate-pulse bg-amber-400' : saveStatus === 'dirty' ? 'bg-rose-400' : saveStatus === 'error' ? 'bg-red-600' : 'bg-emerald-500'}`} />
            {saveLabel}
          </span>
          <button type="button" onClick={save} disabled={saveStatus === 'saving'} className="hidden h-9 items-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:flex">
            {saveStatus === 'saving' ? <Loader2 size={14} className="animate-spin" /> : meta.status === 'published' ? 'Update' : 'Save draft'}
          </button>
          <button type="button" onClick={() => setShowPublish(true)} disabled={!title.trim() || !content.trim()}
            className={`flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors disabled:opacity-40 ${ACCENT}`}>
            <Send size={14} /><span className="hidden sm:inline">{meta.status === 'published' ? 'Update' : 'Publish'}</span>
          </button>
          <IconBtn icon={PanelRight} label="Settings" active={settingsOpen} onClick={() => setSettingsOpen(o => !o)} />
        </header>

        {/* Formatting toolbar */}
        {mode !== 'preview' ? (
          <div className="sticky top-14 z-30 flex shrink-0 items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-1.5" style={{ scrollbarWidth: 'none' }}>
            <div className="relative mr-1 shrink-0">
              <select aria-label="Block type" disabled={mode === 'visual' && !activeType}
                value={activeType && CONVERT_OPTIONS.some(o => o.value === activeType) ? activeType : ''}
                onChange={e => e.target.value && applyType(e.target.value as ConvertType)}
                className="h-8 cursor-pointer appearance-none rounded-full border border-slate-200 bg-white pl-3 pr-7 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#3858e9]/30 disabled:opacity-40">
                <option value="" disabled>{mode === 'visual' ? (activeType ? TYPE_LABEL[activeType] : 'Select a block') : 'Turn into…'}</option>
                {CONVERT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            <IconBtn icon={Bold} label="Bold (Ctrl+B)" keepFocus disabled={visualDisabled} onClick={() => applyFormat('**', '**', 'bold text')} />
            <IconBtn icon={Italic} label="Italic (Ctrl+I)" keepFocus disabled={visualDisabled} onClick={() => applyFormat('*', '*', 'italic text')} />
            <IconBtn icon={Strikethrough} label="Strikethrough" keepFocus disabled={visualDisabled} onClick={() => applyFormat('~~', '~~', 'text')} />
            <IconBtn icon={Code} label="Inline code" keepFocus disabled={visualDisabled} onClick={() => applyFormat('`', '`', 'code')} />
            <IconBtn icon={LinkIcon} label="Link (Ctrl+K)" keepFocus disabled={visualDisabled} onClick={() => applyFormat('[', '](https://)', 'link text')} />
            <span className="mx-1 h-5 w-px shrink-0 bg-slate-200" />
            <IconBtn icon={Heading2} label="Heading 2" keepFocus disabled={visualDisabled} onClick={() => applyType('h2')} />
            <IconBtn icon={List} label="Bulleted list" keepFocus disabled={visualDisabled} onClick={() => applyType('ul')} />
            <IconBtn icon={ListOrdered} label="Numbered list" keepFocus disabled={visualDisabled} onClick={() => applyType('ol')} />
            <IconBtn icon={Quote} label="Quote" keepFocus disabled={visualDisabled} onClick={() => applyType('quote')} />
            <span className="ml-auto flex shrink-0 items-center gap-3 pl-3">
              {mode === 'code' && isDesktop && (
                <button type="button" onClick={() => setSplitPreview(s => !s)} aria-pressed={splitPreview}
                  className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium ${splitPreview ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                  <Columns2 size={15} /> Live preview
                </button>
              )}
              <span className="hidden text-sm tabular-nums text-slate-400 sm:inline">{countWords(content).toLocaleString()} words</span>
            </span>
          </div>
        ) : (
          <div className="sticky top-14 z-30 flex shrink-0 items-center justify-center gap-1 border-b border-slate-200 bg-white py-1.5">
            {([['desktop', Monitor], ['tablet', Tablet], ['mobile', Smartphone]] as const).map(([d, Icon]) => (
              <IconBtn key={d} icon={Icon} label={`${d[0].toUpperCase()}${d.slice(1)} preview`} active={device === d} onClick={() => setDevice(d)} />
            ))}
          </div>
        )}

        {/* Workspace */}
        <div className="relative flex flex-1 min-h-[calc(100vh-14rem)]">
          <AnimatePresence>
            {libraryOpen && mode !== 'preview' && (
              <motion.aside initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -16, opacity: 0 }} transition={{ duration: 0.15 }}
                className="absolute left-3 top-3 z-30 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <BlockLibrary items={library} onPick={pickLibrary} />
              </motion.aside>
            )}
          </AnimatePresence>

          <main className="flex min-w-0 flex-1">
            {mode === 'visual' && (
              <div className="min-w-0 flex-1 overflow-y-auto" onMouseDown={e => { if (e.target === e.currentTarget) setLibraryOpen(false) }}>
                <div className={`${paper} ${slabo.className} ${meta.cssClass}`}>
                  {titleBlock}
                  <BlockEditor ref={blockApi} value={content} onChange={updateContent} library={library} dbBlocks={dbBlocks} onActiveType={setActiveType} />
                </div>
              </div>
            )}

            {mode === 'code' && (
              <>
                <div className={`${splitPreview && isDesktop ? 'w-1/2 border-r border-slate-200' : 'flex-1'} min-w-0 overflow-y-auto`}>
                  <div className={`${paper} ${slabo.className}`}>
                    {titleBlock}
                    <CodeMirror
                      ref={editorRef} value={content} onChange={updateContent} extensions={cmExtensions}
                      basicSetup={{ lineNumbers: false, foldGutter: false, dropCursor: false, allowMultipleSelections: false, indentOnInput: false, highlightActiveLine: true, highlightSelectionMatches: false }}
                      className="min-h-[400px] w-full outline-none"
                      placeholder={'Start writing. Markdown is supported.\n\n# Headings\n**Bold**, *italic*, `code`\n- Lists\n> Quotes'}
                    />
                  </div>
                </div>
                {splitPreview && isDesktop && (
                  <div className="w-1/2 min-w-0 overflow-y-auto bg-white">
                    <div className="mx-auto w-full max-w-2xl px-8 py-10"><ArticleView title={title} content={content} meta={meta} dbBlocks={dbBlocks} /></div>
                  </div>
                )}
              </>
            )}

            {mode === 'preview' && (
              <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-8">
                <div className="mx-auto overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-[max-width] duration-300" style={{ maxWidth: DEVICE_WIDTH[device] }}>
                  <div className="px-6 py-10 sm:px-10"><ArticleView title={title} content={content} meta={meta} dbBlocks={dbBlocks} /></div>
                </div>
              </div>
            )}
          </main>

          {settingsOpen && isDesktop && <aside className="w-[340px] shrink-0 border-l border-slate-200 bg-white">{renderSettings()}</aside>}
        </div>
      </div>

      {/* Settings sheet (mobile / tablet) */}
      <AnimatePresence>
        {settingsOpen && !isDesktop && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-slate-900/30" onClick={() => setSettingsOpen(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 260 }}
              className="fixed inset-x-0 bottom-0 top-14 z-[70] flex flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                <h2 className="font-semibold text-slate-900">Settings</h2>
                <IconBtn icon={X} label="Close settings" onClick={() => setSettingsOpen(false)} />
              </div>
              <div className="min-h-0 flex-1">{renderSettings()}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Publish dialog */}
      <AnimatePresence>
        {showPublish && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setShowPublish(false)}>
            <motion.div initial={{ y: 24 }} animate={{ y: 0 }} role="dialog" aria-modal="true" aria-labelledby="publish-title" onClick={e => e.stopPropagation()}
              className="w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-[460px] sm:rounded-2xl">
              <div className="px-7 pb-4 pt-7 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Sparkles size={22} /></div>
                <h3 id="publish-title" className="font-['Newsreader'] text-2xl font-bold">{meta.scheduledAt && new Date(meta.scheduledAt).getTime() > Date.now() ? 'Schedule this article?' : 'Publish this article?'}</h3>
                <p className="mt-1 text-sm text-slate-500">Review the details before it goes live.</p>
              </div>
              <div className="flex flex-col gap-5 px-7 pb-7">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="line-clamp-2 font-['Newsreader'] text-lg font-bold leading-tight">{title}</p>
                  <p className="mt-2 flex flex-wrap gap-x-4 text-sm text-slate-500">
                    <span>{estimateReadTime(content)} min read</span><span>{meta.category || 'Uncategorized'}</span><span className="capitalize">{meta.visibility}</span>
                  </p>
                </div>
                <div className="flex flex-col gap-2.5">
                  <CheckItem ok={analysis.seoScore >= 50} text={`Search optimization: ${analysis.seoScore}%`} />
                  <CheckItem ok={analysis.a11y.every(c => c.ok)} text={analysis.a11y.every(c => c.ok) ? 'No accessibility issues found' : `${analysis.a11y.filter(c => !c.ok).length} accessibility issue(s) to review`} />
                  <CheckItem ok={!!meta.coverImage} text={meta.coverImage ? 'Cover image set' : 'No cover image'} />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowPublish(false)} className="h-11 flex-1 rounded-full border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Back</button>
                  <button onClick={publish} disabled={publishing} className={`flex h-11 flex-[2] items-center justify-center gap-2 rounded-full text-sm font-semibold disabled:opacity-60 ${ACCENT}`}>
                    {publishing ? <><Loader2 size={16} className="animate-spin" /> Publishing…</> : <><Send size={15} /> Confirm and publish</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-[110] flex justify-center px-4">
        {toast && (
          <div className={`pointer-events-auto flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white shadow-lg ${toast.kind === 'error' ? 'bg-red-600' : 'bg-slate-900'}`}>
            {toast.kind === 'error' ? <AlertCircle size={15} /> : <Check size={15} />}{toast.text}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}

export default EditorPage