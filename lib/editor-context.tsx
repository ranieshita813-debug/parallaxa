import React from 'react'
import * as LucideIcons from 'lucide-react'
import * as PhosphorIcons from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

/* ────────────────────────────────────────────────────────────────────────────
   Accessible Application Components Catalog
──────────────────────────────────────────────────────────────────────────── */

export interface ComponentDoc {
  name: string
  category: 'UI' | 'Icon' | 'Layout' | 'Feedback' | 'Function'
  description: string
  snippet: string
  props?: string[]
}

// Built-in accessible interactive widgets and components that can be used in pages
export const ACCESSIBLE_COMPONENTS: ComponentDoc[] = [
  // UI Primitives
  {
    name: 'Button',
    category: 'UI',
    description: 'Customizable button with various styles and variants (default, outline, ghost, destructive).',
    snippet: '<Button variant="default" size="default">Click Me</Button>',
    props: ['variant', 'size', 'onClick', 'className', 'children', 'disabled'],
  },
  {
    name: 'Card',
    category: 'UI',
    description: 'Card container with header, content, and footer sections.',
    snippet: `<Card className="p-6">
  <h3 className="text-xl font-bold mb-2">Card Title</h3>
  <p className="text-slate-600">This is card content with flexible styling.</p>
</Card>`,
    props: ['className', 'children'],
  },
  {
    name: 'Badge',
    category: 'UI',
    description: 'Inline badge indicator for status, categories, or highlights.',
    snippet: '<Badge variant="default">New</Badge>',
    props: ['variant', 'className', 'children'],
  },
  {
    name: 'Alert',
    category: 'Feedback',
    description: 'Callout banner for warnings, information, or success notices.',
    snippet: `<Alert variant="info" title="Important Notice">
  Please read this important notice regarding the update.
</Alert>`,
    props: ['variant', 'title', 'children', 'className'],
  },
  {
    name: 'Callout',
    category: 'UI',
    description: 'Modern highlighted blockquote or callout box.',
    snippet: `<Callout icon="💡" title="Pro Tip">
  You can embed interactive React components directly in any page.
</Callout>`,
    props: ['title', 'icon', 'children'],
  },
  {
    name: 'Grid',
    category: 'Layout',
    description: 'Responsive multi-column grid layout.',
    snippet: `<Grid cols={3} gap={4}>
  <div className="p-4 bg-slate-50 border rounded-xl">Column 1</div>
  <div className="p-4 bg-slate-50 border rounded-xl">Column 2</div>
  <div className="p-4 bg-slate-50 border rounded-xl">Column 3</div>
</Grid>`,
    props: ['cols', 'gap', 'className', 'children'],
  },
  {
    name: 'Accordion',
    category: 'UI',
    description: 'Collapsible accordion item with header and body.',
    snippet: `<Accordion title="Frequently Asked Question #1">
  Here is the detailed answer explaining the topic.
</Accordion>`,
    props: ['title', 'children', 'defaultOpen'],
  },
  {
    name: 'Tabs',
    category: 'UI',
    description: 'Tabbed switcher for organizing multi-section content.',
    snippet: `<Tabs tabs={[
  { label: 'Overview', content: 'This is the general overview section.' },
  { label: 'Details', content: 'Detailed information and specifications.' }
]} />`,
    props: ['tabs', 'className'],
  },
  {
    name: 'StatCard',
    category: 'UI',
    description: 'Metrics card showcasing key figures and growth indicators.',
    snippet: '<StatCard label="Total Readers" value="125,400" change="+14.2%" trend="up" />',
    props: ['label', 'value', 'change', 'trend', 'className'],
  },
  {
    name: 'Divider',
    category: 'Layout',
    description: 'Horizontal divider line with optional centered text label.',
    snippet: '<Divider label="OR" />',
    props: ['label', 'className'],
  },
]

// Accessible Utility Functions
export const ACCESSIBLE_FUNCTIONS = [
  {
    name: 'cn(...inputs)',
    category: 'Function' as const,
    description: 'Combines Tailwind CSS class names with clsx and twMerge.',
    snippet: 'cn("px-4 py-2", isActive && "bg-slate-900 text-white")',
  },
  {
    name: 'formatDate(date, locale)',
    category: 'Function' as const,
    description: 'Formats a date into localized Bangla or English standard string.',
    snippet: 'formatDate(new Date(), "bn")',
  },
  {
    name: 'toBanglaNumber(num)',
    category: 'Function' as const,
    description: 'Converts English digits (0-9) to Bangla numerals (০-৯).',
    snippet: 'toBanglaNumber(12345)',
  },
  {
    name: 'fetchMetadata(url)',
    category: 'Function' as const,
    description: 'Fetches title, author, year, siteName, and open graph data for any URL.',
    snippet: 'await fetch("/api/fetch-metadata", { method: "POST", body: JSON.stringify({ url }) })',
  },
  {
    name: 'searchArticles(query)',
    category: 'Function' as const,
    description: 'Performs full-text article search across title, content, and category.',
    snippet: 'await fetch(`/api/articles/search?q=${encodeURIComponent(query)}`)',
  },
  {
    name: 'getBreakingNews()',
    category: 'Function' as const,
    description: 'Returns the currently active breaking news stories.',
    snippet: 'await fetch("/api/articles?breaking=true")',
  },
]

/* ────────────────────────────────────────────────────────────────────────────
   Client Runtime Components Map for Live Preview & Dynamic Pages
──────────────────────────────────────────────────────────────────────────── */

export function SimpleButton({
  children,
  variant = 'default',
  size = 'default',
  className = '',
  onClick,
  disabled,
  ...props
}: any) {
  const base = 'inline-flex items-center justify-center font-semibold transition-colors rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-950/20 disabled:opacity-50'
  const variants: Record<string, string> = {
    default: 'bg-slate-950 text-white hover:bg-slate-800 shadow-sm',
    outline: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
    ghost: 'text-slate-700 hover:bg-slate-100',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
  }
  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs',
    default: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }
  return (
    <button
      className={cn(base, variants[variant] || variants.default, sizes[size] || sizes.default, className)}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

export function SimpleCard({ children, className = '', ...props }: any) {
  return (
    <div
      className={cn('rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function SimpleBadge({ children, variant = 'default', className = '', ...props }: any) {
  const variants: Record<string, string> = {
    default: 'bg-slate-900 text-white',
    secondary: 'bg-slate-100 text-slate-700 border border-slate-200',
    destructive: 'bg-red-50 text-red-700 border border-red-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  }
  return (
    <span
      className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold', variants[variant] || variants.default, className)}
      {...props}
    >
      {children}
    </span>
  )
}

export function SimpleAlert({ children, title, variant = 'info', className = '' }: any) {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    info: { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200' },
    warning: { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200' },
    error: { bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-200' },
    success: { bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-200' },
  }
  const cur = styles[variant] || styles.info
  return (
    <div className={cn('p-4 rounded-2xl border', cur.bg, cur.border, cur.text, className)}>
      {title && <h4 className="font-bold text-sm mb-1">{title}</h4>}
      <div className="text-xs leading-relaxed opacity-90">{children}</div>
    </div>
  )
}

export function SimpleCallout({ icon = '💡', title, children, className = '' }: any) {
  return (
    <div className={cn('my-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4.5', className)}>
      <span className="text-xl select-none shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        {title && <h4 className="font-bold text-sm text-slate-900 mb-1">{title}</h4>}
        <div className="text-xs text-slate-700 leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

export function SimpleGrid({ cols = 2, gap = 4, children, className = '' }: any) {
  const colMap: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4',
  }
  return (
    <div className={cn('grid my-4', colMap[cols] || 'grid-cols-1 md:grid-cols-2', `gap-${gap}`, className)}>
      {children}
    </div>
  )
}

export function SimpleAccordion({ title, children, defaultOpen = false }: any) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className="my-3 rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left font-semibold text-slate-900 hover:bg-slate-50/70 transition-colors"
      >
        <span className="text-sm">{title}</span>
        <span className={cn('text-xs transition-transform duration-200 text-slate-400', open && 'rotate-180')}>
          ▼
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 text-xs text-slate-600 border-t border-slate-100 leading-relaxed">
          {children}
        </div>
      )}
    </div>
  )
}

export function SimpleTabs({ tabs = [], className = '' }: any) {
  const [active, setActive] = React.useState(0)
  if (!tabs.length) return null
  return (
    <div className={cn('my-4 rounded-2xl border border-slate-200 bg-white overflow-hidden', className)}>
      <div className="flex border-b border-slate-100 bg-slate-50/60 px-2 pt-2 gap-1 overflow-x-auto">
        {tabs.map((tab: any, i: number) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              'px-4 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2',
              active === i
                ? 'bg-white text-slate-900 border-slate-950 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 border-transparent'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-4 text-xs text-slate-700 leading-relaxed">
        {tabs[active]?.content}
      </div>
    </div>
  )
}

export function SimpleStatCard({ label, value, change, trend = 'neutral', className = '' }: any) {
  return (
    <div className={cn('rounded-2xl border border-slate-200 bg-white p-5 shadow-xs', className)}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
      <div className="mt-2 flex items-baseline justify-between">
        <h3 className="text-2xl font-extrabold text-slate-950 tabular-nums">{value}</h3>
        {change && (
          <span
            className={cn(
              'text-xs font-semibold px-2 py-0.5 rounded-full',
              trend === 'up' && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
              trend === 'down' && 'bg-red-50 text-red-700 border border-red-200',
              trend === 'neutral' && 'bg-slate-100 text-slate-600'
            )}
          >
            {change}
          </span>
        )}
      </div>
    </div>
  )
}

export function SimpleDivider({ label, className = '' }: any) {
  if (!label) {
    return <hr className={cn('my-6 border-slate-200', className)} />
  }
  return (
    <div className={cn('relative my-6 flex items-center justify-center', className)}>
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-slate-200" />
      </div>
      <span className="relative bg-white px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
    </div>
  )
}

export const RUNTIME_COMPONENTS: Record<string, React.ComponentType<any>> = {
  Button: SimpleButton,
  Card: SimpleCard,
  Badge: SimpleBadge,
  Alert: SimpleAlert,
  Callout: SimpleCallout,
  Grid: SimpleGrid,
  Accordion: SimpleAccordion,
  Tabs: SimpleTabs,
  StatCard: SimpleStatCard,
  Divider: SimpleDivider,
}

/* ────────────────────────────────────────────────────────────────────────────
   Autocomplete Provider for CodeMirror
──────────────────────────────────────────────────────────────────────────── */

export function getCodeCompletions() {
  const items: Array<{ label: string; type: string; info: string; apply: string; boost?: number }> = []

  // Add Components
  ACCESSIBLE_COMPONENTS.forEach(c => {
    items.push({
      label: `<${c.name}`,
      type: 'class',
      info: `${c.description}\n\nSnippet:\n${c.snippet}`,
      apply: c.snippet,
      boost: 10,
    })
    c.props?.forEach(p => {
      items.push({
        label: `${c.name} ${p}=`,
        type: 'property',
        info: `Prop '${p}' for <${c.name} />`,
        apply: `${p}=""`,
        boost: 5,
      })
    })
  })

  // Add Utility Functions
  ACCESSIBLE_FUNCTIONS.forEach(f => {
    items.push({
      label: f.name,
      type: 'function',
      info: `${f.description}\n\nExample:\n${f.snippet}`,
      apply: f.snippet,
      boost: 8,
    })
  })

  // Common HTML/JSX Tags
  const commonTags = [
    { tag: 'div', desc: 'Container element' },
    { tag: 'span', desc: 'Inline element' },
    { tag: 'section', desc: 'Section container' },
    { tag: 'h1', desc: 'Top heading' },
    { tag: 'h2', desc: 'Sub heading' },
    { tag: 'h3', desc: 'Section heading' },
    { tag: 'p', desc: 'Paragraph text' },
    { tag: 'a', desc: 'Hyperlink' },
    { tag: 'img', desc: 'Image element' },
  ]
  commonTags.forEach(t => {
    items.push({
      label: `<${t.tag}`,
      type: 'type',
      info: t.desc,
      apply: `<${t.tag} className="">\n</${t.tag}>`,
      boost: 2,
    })
  })

  return items
}
