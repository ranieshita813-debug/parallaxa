"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import Link from 'next/link'
import CodeMirror from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { EditorView } from '@codemirror/view'
import { autocompletion, CompletionContext } from '@codemirror/autocomplete'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { toast } from 'sonner'
import {
  ChevronLeft,
  PenLine,
  FileCode,
  Eye,
  Columns2,
  FolderTree,
  Send,
  Save,
  Settings,
  Sparkles,
  Layers,
  Copy,
  Check,
  X,
  Search,
  FileText,
  Folder,
  FolderOpen,
  ExternalLink,
  AlertCircle,
  Globe,
  Code,
  Plus,
  Play,
  Monitor,
  Smartphone,
  Tablet,
  RotateCw,
} from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import {
  ACCESSIBLE_COMPONENTS,
  ACCESSIBLE_FUNCTIONS,
  getCodeCompletions,
  RUNTIME_COMPONENTS,
} from '@/lib/editor-context'

type Mode = 'visual' | 'code' | 'preview'
type Device = 'desktop' | 'tablet' | 'mobile'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  extension?: string
  children?: FileNode[]
}

const customMarkdownTheme = EditorView.theme({
  '&': {
    fontSize: '14px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    background: '#ffffff !important',
    color: '#0f172a',
  },
  '.cm-content': { padding: '16px', caretColor: '#0f172a' },
  '.cm-line': { padding: '0 0 2px', lineHeight: '1.6' },
  '&.cm-focused': { outline: 'none !important' },
  '.cm-activeLine': { background: '#f8fafc' },
  '.cm-gutters': {
    backgroundColor: '#f8fafc',
    color: '#94a3b8',
    borderRight: '1px solid #e2e8f0',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#f1f5f9',
    color: '#0f172a',
  },
  '.cm-selectionBackground': { background: '#e0e7ff !important' },
})

export default function PageEditor() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const pageId = searchParams.get('id')
  const locale = (params?.locale as string) || 'bn'
  const isBn = locale === 'bn'

  // Page Form State
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<'published' | 'draft'>('published')
  const [seoTitle, setSeoTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')

  // Editor UI State
  const [mode, setMode] = useState<Mode>('code')
  const [device, setDevice] = useState<Device>('desktop')
  const [splitPreview, setSplitPreview] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [fileViewerOpen, setFileViewerOpen] = useState(false)
  const [componentCatalogOpen, setComponentCatalogOpen] = useState(false)

  // File Viewer State
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [fileLoading, setFileLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<{ path: string; name: string; content: string | null; isBinary?: boolean } | null>(null)
  const [fileSearch, setFileSearch] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ app: true, components: true, lib: true })
  const [copiedCode, setCopiedCode] = useState(false)

  const editorRef = useRef<any>(null)

  // Fetch initial page data if editing
  useEffect(() => {
    if (!pageId) {
      // Default template for new pages
      setTitle(isBn ? 'নতুন পেইজ' : 'New Custom Page')
      setSlug('new-page')
      setContent(`# Welcome to My Custom Page\n\nThis is a full-featured custom page built with Markdown and React components.\n\n<Callout icon="✨" title="Interactive Support">\n  You can use built-in components like **Button**, **Card**, **Alert**, and **Tabs** directly in this page!\n</Callout>\n\n<Grid cols={2} gap={4}>\n  <Card className="p-5">\n    <h3 className="font-bold text-lg mb-2">Feature One</h3>\n    <p className="text-slate-600 text-sm">Rich design elements with complete responsive support.</p>\n    <div className="mt-4">\n      <Button variant="default">Learn More</Button>\n    </div>\n  </Card>\n  <Card className="p-5">\n    <h3 className="font-bold text-lg mb-2">Feature Two</h3>\n    <p className="text-slate-600 text-sm">Fully integrated with application functions and API.</p>\n    <div className="mt-4">\n      <Badge variant="success">Active</Badge>\n    </div>\n  </Card>\n</Grid>\n`)
      return
    }

    const loadPage = async () => {
      try {
        const res = await fetch(`/api/admin/pages/${pageId}`)
        if (!res.ok) throw new Error('Failed to load page')
        const data = await res.json()
        setTitle(data.title || '')
        setSlug(data.slug || '')
        setDescription(data.description || '')
        setContent(data.content || '')
        setStatus(data.status || 'published')
        setSeoTitle(data.seoTitle || '')
        setMetaDescription(data.metaDescription || '')
      } catch (err: any) {
        toast.error(err.message || 'Error loading page')
      }
    }
    loadPage()
  }, [pageId, isBn])

  // Fetch File Tree for Admin Explorer
  const loadFileTree = async () => {
    if (fileTree.length > 0) return
    setFileLoading(true)
    try {
      const res = await fetch('/api/admin/files')
      if (res.ok) {
        const data = await res.json()
        setFileTree(data.tree || [])
      }
    } catch (e) {
      console.error('Failed to load app files:', e)
    } finally {
      setFileLoading(false)
    }
  }

  const handleOpenFile = async (node: FileNode) => {
    if (node.type === 'directory') {
      setExpandedFolders(prev => ({ ...prev, [node.path]: !prev[node.path] }))
      return
    }

    try {
      const res = await fetch(`/api/admin/files?path=${encodeURIComponent(node.path)}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedFile(data)
      } else {
        toast.error('Could not read file')
      }
    } catch {
      toast.error('Failed to read file')
    }
  }

  // Insert code snippet into editor
  const insertSnippet = (snippet: string) => {
    const view = editorRef.current?.view
    if (view) {
      const { from, to } = view.state.selection.main
      view.dispatch({
        changes: { from, to, insert: snippet },
        selection: { anchor: from + snippet.length },
      })
      view.focus()
      toast.success(isBn ? 'স্নিপেট যুক্ত করা হয়েছে' : 'Snippet inserted into editor')
    } else {
      setContent(prev => prev + '\n\n' + snippet)
      toast.success(isBn ? 'স্নিপেট যুক্ত করা হয়েছে' : 'Snippet inserted into editor')
    }
  }

  // CodeMirror Autocomplete Extension
  const customCompletions = useCallback((ctx: CompletionContext) => {
    const word = ctx.matchBefore(/<[A-Za-z0-9_]*|[A-Za-z0-9_]+/)
    if (!word) return null

    const allItems = getCodeCompletions()
    return {
      from: word.from,
      options: allItems.map(item => ({
        label: item.label,
        type: item.type,
        detail: item.info.split('\n')[0],
        info: item.info,
        apply: item.apply,
        boost: item.boost,
      })),
    }
  }, [])

  const cmExtensions = useMemo(() => [
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    EditorView.lineWrapping,
    customMarkdownTheme,
    autocompletion({ override: [customCompletions] }),
  ], [customCompletions])

  // Save / Update Page
  const handleSave = async () => {
    if (!title.trim()) {
      toast.error(isBn ? 'পেইজের শিরোনাম দেওয়া প্রয়োজন' : 'Page title is required')
      return
    }
    if (!slug.trim()) {
      toast.error(isBn ? 'পেইজের রাউট / স্লাগ প্রয়োজন' : 'Page route/slug is required')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        content,
        description: description.trim() || undefined,
        status,
        seoTitle: seoTitle.trim() || undefined,
        metaDescription: metaDescription.trim() || undefined,
      }

      const url = pageId ? `/api/admin/pages/${pageId}` : '/api/admin/pages'
      const method = pageId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save page')

      toast.success(pageId ? 'Page updated successfully!' : 'Page created successfully!')
      if (!pageId && data.id) {
        router.replace(`/${locale}/admin/pages/editor?id=${data.id}`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Operation failed')
    } finally {
      setIsSaving(false)
    }
  }

  // Render file tree recursively
  const renderTree = (nodes: FileNode[]) => {
    return (
      <div className="space-y-0.5 text-xs font-mono">
        {nodes.map(node => {
          const isDir = node.type === 'directory'
          const isExpanded = !!expandedFolders[node.path]
          const isSelected = selectedFile?.path === node.path

          if (fileSearch) {
            const matches = node.name.toLowerCase().includes(fileSearch.toLowerCase()) || node.path.toLowerCase().includes(fileSearch.toLowerCase())
            if (!matches && !isDir) return null
          }

          return (
            <div key={node.path} className="select-none">
              <div
                onClick={() => handleOpenFile(node)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {isDir ? (
                  isExpanded ? (
                    <FolderOpen size={15} className="text-amber-500 shrink-0 fill-amber-500" />
                  ) : (
                    <Folder size={15} className="text-amber-500 shrink-0 fill-amber-500" />
                  )
                ) : (
                  <FileText size={15} className="text-slate-400 shrink-0" />
                )}
                <span className="truncate">{node.name}</span>
                {node.size ? (
                  <span className="ml-auto text-[10px] text-slate-400 font-sans">
                    {Math.ceil(node.size / 1024)} KB
                  </span>
                ) : null}
              </div>

              {isDir && isExpanded && node.children && (
                <div className="pl-3.5 ml-2 border-l border-slate-200">
                  {renderTree(node.children)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Device width configuration for preview
  const DEVICE_WIDTH: Record<Device, string> = {
    desktop: '100%',
    tablet: '768px',
    mobile: '390px',
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header />

      {/* ── TOP ACTION BAR ── */}
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/dashboard?tab=pages`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            title="Back to Pages"
          >
            <ChevronLeft size={18} />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {pageId ? 'Editing Page' : 'New Page'}
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                <Globe size={11} />
                /{locale}/{slug || 'custom-route'}
              </span>
            </div>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/60">
          <button
            type="button"
            onClick={() => setMode('visual')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              mode === 'visual' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <PenLine size={14} />
            <span>Visual</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('code')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              mode === 'code' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileCode size={14} />
            <span>Code (IDE)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              mode === 'preview' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Eye size={14} />
            <span>Preview</span>
          </button>
        </div>

        {/* Top Tools & Save Button */}
        <div className="flex items-center gap-2">
          {/* App Files Explorer Button */}
          <button
            type="button"
            onClick={() => {
              loadFileTree()
              setFileViewerOpen(true)
            }}
            className="flex items-center gap-1.5 h-9 px-3 text-xs font-semibold border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors"
            title="Browse Application Files & Code"
          >
            <FolderTree size={16} />
            <span className="hidden md:inline">App Files</span>
          </button>

          {/* Component Catalog Button */}
          <button
            type="button"
            onClick={() => setComponentCatalogOpen(true)}
            className="flex items-center gap-1.5 h-9 px-3 text-xs font-semibold border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors"
            title="Available React Components & Functions"
          >
            <Layers size={16} />
            <span className="hidden md:inline">Components</span>
          </button>

          {/* Settings Drawer Button */}
          <button
            type="button"
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={`flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 transition-colors ${
              settingsOpen ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Page Settings"
          >
            <Settings size={17} />
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-slate-950 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isSaving ? (
              <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={15} />
            )}
            <span>{isSaving ? 'Saving…' : pageId ? 'Update' : 'Publish'}</span>
          </button>
        </div>
      </header>

      {/* ── SUB-BAR: QUICK CONTROLS ── */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 text-xs">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Page Title..."
            className="font-bold text-sm text-slate-900 outline-none placeholder:text-slate-400 bg-transparent min-w-[200px]"
          />
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-mono">/{locale}/</span>
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder="route-slug"
              className="font-mono text-xs text-slate-800 outline-none bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {mode === 'code' && (
            <button
              type="button"
              onClick={() => setSplitPreview(!splitPreview)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                splitPreview
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Columns2 size={14} />
              <span>Live Split</span>
            </button>
          )}

          {mode === 'preview' && (
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setDevice('desktop')}
                className={`p-1 rounded-md ${device === 'desktop' ? 'bg-white shadow-2xs' : 'text-slate-500'}`}
                title="Desktop View"
              >
                <Monitor size={14} />
              </button>
              <button
                type="button"
                onClick={() => setDevice('tablet')}
                className={`p-1 rounded-md ${device === 'tablet' ? 'bg-white shadow-2xs' : 'text-slate-500'}`}
                title="Tablet View"
              >
                <Tablet size={14} />
              </button>
              <button
                type="button"
                onClick={() => setDevice('mobile')}
                className={`p-1 rounded-md ${device === 'mobile' ? 'bg-white shadow-2xs' : 'text-slate-500'}`}
                title="Mobile View"
              >
                <Smartphone size={14} />
              </button>
            </div>
          )}

          {pageId && (
            <Link
              href={`/${locale}/${slug}`}
              target="_blank"
              className="flex items-center gap-1 text-slate-500 hover:text-slate-900"
            >
              <span>View Live</span>
              <ExternalLink size={13} />
            </Link>
          )}
        </div>
      </div>

      {/* ── MAIN WORKSPACE ── */}
      <div className="flex-1 flex overflow-hidden min-h-[calc(100vh-7rem)]">
        {/* Editor Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Visual Mode */}
          {mode === 'visual' && (
            <div className="flex-1 overflow-y-auto p-6 md:p-12">
              <div className="max-w-4xl mx-auto bg-white border border-slate-200/80 rounded-3xl p-8 md:p-12 shadow-xs">
                <h1 className="text-3xl md:text-5xl font-black text-slate-950 mb-4">{title || 'Page Title'}</h1>
                {description && <p className="text-base text-slate-600 mb-6">{description}</p>}
                <div className="prose prose-slate max-w-none">
                  <Markdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw as any]}
                    components={RUNTIME_COMPONENTS as any}
                  >
                    {content}
                  </Markdown>
                </div>
              </div>
            </div>
          )}

          {/* Code Mode with optional Split Live Preview */}
          {mode === 'code' && (
            <>
              <div className={`overflow-y-auto bg-white ${splitPreview ? 'w-1/2 border-r border-slate-200' : 'w-full'}`}>
                <div className="p-2 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between text-[11px] text-slate-500 font-mono px-4">
                  <span>MARKDOWN & REACT/JSX IDE</span>
                  <span>Type &lt; to trigger accessible components autocomplete</span>
                </div>
                <CodeMirror
                  ref={editorRef}
                  value={content}
                  onChange={val => setContent(val)}
                  extensions={cmExtensions}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    highlightActiveLine: true,
                    indentOnInput: true,
                  }}
                  className="min-h-[500px]"
                />
              </div>

              {splitPreview && (
                <div className="w-1/2 overflow-y-auto bg-slate-50/50 p-6">
                  <div className="max-w-2xl mx-auto bg-white border border-slate-200/70 rounded-3xl p-6 md:p-8 shadow-xs">
                    <h1 className="text-2xl md:text-4xl font-extrabold text-slate-950 mb-3">{title || 'Untitled'}</h1>
                    {description && <p className="text-sm text-slate-600 mb-6">{description}</p>}
                    <div className="prose prose-slate max-w-none">
                      <Markdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw as any]}
                        components={RUNTIME_COMPONENTS as any}
                      >
                        {content}
                      </Markdown>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Standalone Full Preview Mode */}
          {mode === 'preview' && (
            <div className="flex-1 overflow-y-auto bg-slate-100 p-6 flex justify-center">
              <div
                className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12 shadow-sm transition-[max-width] duration-200 h-fit my-4"
                style={{ width: '100%', maxWidth: DEVICE_WIDTH[device] }}
              >
                <div className="border-b border-slate-100 pb-6 mb-6">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    <span>Preview</span>
                    <span>•</span>
                    <span className="font-mono">/{locale}/{slug}</span>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-black text-slate-950 mb-3">{title}</h1>
                  {description && <p className="text-base text-slate-600">{description}</p>}
                </div>

                <div className="prose prose-slate max-w-none">
                  <Markdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw as any]}
                    components={RUNTIME_COMPONENTS as any}
                  >
                    {content}
                  </Markdown>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── SETTINGS SIDEBAR ── */}
        {settingsOpen && (
          <aside className="w-80 shrink-0 border-l border-slate-200 bg-white p-5 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Page Settings</h3>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X size={16} />
              </button>
            </div>

            {/* Publishing Status */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Visibility Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-slate-900"
              >
                <option value="published">Published (Live to public)</option>
                <option value="draft">Draft (Admin preview only)</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Description / Subtitle
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="A short summary of this page..."
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 outline-none focus:border-slate-900 resize-none"
              />
            </div>

            {/* SEO Settings */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Search Engine Optimization</h4>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">SEO Title</label>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={e => setSeoTitle(e.target.value)}
                  placeholder={title || 'Page Title'}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Meta Description</label>
                <textarea
                  rows={3}
                  value={metaDescription}
                  onChange={e => setMetaDescription(e.target.value)}
                  placeholder="Summary for search engines..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 outline-none focus:border-slate-900 resize-none"
                />
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ── APPLICATION FILES VIEWER (DRAWER / MODAL) ── */}
      {fileViewerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <FolderTree size={20} className="text-slate-800" />
                <div>
                  <h3 className="font-bold text-base text-slate-950">Application Files & Source Explorer</h3>
                  <p className="text-xs text-slate-500">
                    Explore, read, and inspect all accessible code files in this Next.js project.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFileViewerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200/50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: File Tree (left) + File Reader (right) */}
            <div className="flex-1 flex overflow-hidden">
              {/* File Tree Column */}
              <div className="w-72 shrink-0 border-r border-slate-200 bg-white flex flex-col">
                <div className="p-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                    <Search size={14} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={fileSearch}
                      onChange={e => setFileSearch(e.target.value)}
                      placeholder="Search files..."
                      className="w-full bg-transparent text-xs outline-none text-slate-800"
                    />
                    {fileSearch && (
                      <button onClick={() => setFileSearch('')} className="text-slate-400">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                  {fileLoading ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin mx-auto mb-2" />
                      Loading files…
                    </div>
                  ) : fileTree.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No files accessible.</p>
                  ) : (
                    renderTree(fileTree)
                  )}
                </div>
              </div>

              {/* File Content Viewer Column */}
              <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 overflow-hidden">
                {selectedFile ? (
                  <>
                    <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs font-mono">
                      <div className="flex items-center gap-2 truncate">
                        <FileCode size={16} className="text-blue-400 shrink-0" />
                        <span className="text-slate-200 font-semibold">{selectedFile.path}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {selectedFile.content && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(selectedFile.content || '')
                                setCopiedCode(true)
                                setTimeout(() => setCopiedCode(false), 2000)
                              }}
                              className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-md text-[11px] font-sans transition-colors"
                            >
                              {copiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                insertSnippet(`\`\`\`${selectedFile.name.split('.').pop() || 'ts'}\n// Source: ${selectedFile.path}\n${selectedFile.content}\n\`\`\``)
                                setFileViewerOpen(false)
                              }}
                              className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-md text-[11px] font-sans transition-colors"
                            >
                              <Plus size={12} />
                              <span>Insert Into Page</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
                      {selectedFile.isBinary ? (
                        <div className="p-8 text-center text-slate-400">
                          <p>Binary file ({selectedFile.extension}) cannot be displayed as plain text.</p>
                        </div>
                      ) : (
                        <pre className="text-slate-300">
                          <code>{selectedFile.content}</code>
                        </pre>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                    <FileText size={48} className="mb-3 opacity-40" />
                    <h4 className="text-sm font-semibold text-slate-400 mb-1">No File Selected</h4>
                    <p className="text-xs max-w-xs">
                      Click any file from the file explorer tree on the left to inspect its code.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REACT COMPONENTS & FUNCTIONS CATALOG MODAL ── */}
      {componentCatalogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Layers size={20} className="text-slate-900" />
                <div>
                  <h3 className="font-bold text-base text-slate-950">
                    Accessible Components & Functions
                  </h3>
                  <p className="text-xs text-slate-500">
                    Use these interactive React components and utilities anywhere in your page.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setComponentCatalogOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200/50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Components Section */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Interactive UI Components
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ACCESSIBLE_COMPONENTS.map(c => (
                    <div
                      key={c.name}
                      className="rounded-2xl border border-slate-200 p-4 bg-white flex flex-col justify-between hover:border-slate-300 transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-sm text-slate-950">&lt;{c.name} /&gt;</span>
                          <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            {c.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mb-3">{c.description}</p>
                        <pre className="p-2.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto mb-3">
                          <code>{c.snippet}</code>
                        </pre>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          insertSnippet(c.snippet)
                          setComponentCatalogOpen(false)
                        }}
                        className="inline-flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
                      >
                        <Plus size={14} />
                        <span>Insert Component</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Utility Functions Section */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Accessible Utility Functions
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ACCESSIBLE_FUNCTIONS.map(f => (
                    <div key={f.name} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                      <div className="font-mono text-xs font-bold text-slate-900 mb-1">{f.name}</div>
                      <p className="text-xs text-slate-600 mb-2">{f.description}</p>
                      <pre className="p-2 rounded-lg bg-white border border-slate-200/80 font-mono text-[11px] text-slate-800">
                        <code>{f.snippet}</code>
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
