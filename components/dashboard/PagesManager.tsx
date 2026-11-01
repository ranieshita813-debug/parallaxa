'use client'

import React, { useState, useEffect } from 'react'
import {
  Plus,
  Trash,
  PencilSimple,
  ArrowSquareOut,
  Check,
  X,
  FileText,
  MagnifyingGlass,
  Globe,
  Eye,
  CalendarBlank,
  WarningCircle
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface PageItem {
  id: string
  title: string
  slug: string
  content: string
  description?: string | null
  status: 'published' | 'draft'
  seoTitle?: string | null
  metaDescription?: string | null
  createdAt: string
  updatedAt: string
}

export default function PagesManager() {
  const [pages, setPages] = useState<PageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPage, setEditingPage] = useState<PageItem | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const params = useParams()
  const locale = (params?.locale as string) || 'bn'
  const isBn = locale === 'bn'

  // Form fields
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    description: '',
    status: 'published' as 'published' | 'draft',
    seoTitle: '',
    metaDescription: '',
  })
  const [formError, setFormError] = useState<string | null>(null)

  const fetchPages = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/pages')
      if (!res.ok) throw new Error('Failed to fetch pages')
      const data = await res.json()
      if (Array.isArray(data)) {
        setPages(data)
      }
    } catch (err) {
      console.error(err)
      toast.error(isBn ? 'পেইজ লোড করতে ব্যর্থ হয়েছে' : 'Failed to load pages')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPages()
  }, [])

  const handleOpenCreate = () => {
    setEditingPage(null)
    setFormData({
      title: '',
      slug: '',
      content: '',
      description: '',
      status: 'published',
      seoTitle: '',
      metaDescription: '',
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (p: PageItem) => {
    setEditingPage(p)
    setFormData({
      title: p.title || '',
      slug: p.slug || '',
      content: p.content || '',
      description: p.description || '',
      status: p.status || 'published',
      seoTitle: p.seoTitle || '',
      metaDescription: p.metaDescription || '',
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleSlugifyTitle = (title: string) => {
    if (!editingPage) {
      const generated = title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
      setFormData(prev => ({ ...prev, title, slug: prev.slug || generated }))
    } else {
      setFormData(prev => ({ ...prev, title }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.title.trim()) {
      setFormError(isBn ? 'পেইজের শিরোনাম আবশ্যক' : 'Page title is required')
      return
    }

    if (!formData.slug.trim()) {
      setFormError(isBn ? 'পেইজের রাউট / স্লাগ আবশ্যক' : 'Page route/slug is required')
      return
    }

    setSubmitting(true)
    try {
      const url = editingPage
        ? `/api/admin/pages/${editingPage.id}`
        : '/api/admin/pages'
      const method = editingPage ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save page')
      }

      toast.success(
        editingPage
          ? (isBn ? 'পেইজ আপডেট করা হয়েছে' : 'Page updated successfully')
          : (isBn ? 'নতুন পেইজ তৈরি করা হয়েছে' : 'Page created successfully')
      )
      setIsModalOpen(false)
      fetchPages()
    } catch (err: any) {
      setFormError(err.message || 'Operation failed')
      toast.error(err.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/pages/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete page')
      }
      toast.success(isBn ? 'পেইজ ডিলিট করা হয়েছে' : 'Page deleted successfully')
      setDeleteConfirmId(null)
      fetchPages()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete page')
    }
  }

  const filteredPages = pages.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {isBn ? 'পেইজ ম্যানেজমেন্ট (Custom Pages)' : 'Pages Management'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isBn
              ? 'নতুন যেকোনো পেইজ তৈরি করুন এবং আপনার পছন্দের কাস্টম রাউট সেট করুন।'
              : 'Create custom pages and choose their unique custom route.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/admin/pages/editor`}
            className="inline-flex items-center gap-2 bg-slate-950 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-800 transition-all self-start sm:self-auto shadow-sm"
          >
            <Plus size={18} weight="bold" />
            {isBn ? 'নতুন পেইজ তৈরি করুন' : 'Create New Page'}
          </Link>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl max-w-md">
        <MagnifyingGlass size={18} className="text-slate-400 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={isBn ? 'পেইজের নাম বা রাউট দিয়ে খুঁজুন...' : 'Search pages by title or route...'}
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 text-slate-800"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Pages Table / List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          <div className="inline-block w-6 h-6 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin mb-2"></div>
          <p>{isBn ? 'পেইজ লোড হচ্ছে...' : 'Loading pages...'}</p>
        </div>
      ) : filteredPages.length === 0 ? (
        <div className="p-12 border border-dashed border-slate-200 rounded-2xl text-center space-y-3">
          <FileText size={36} className="mx-auto text-slate-300" />
          <h3 className="text-base font-bold text-slate-800">
            {isBn ? 'কোনো পেইজ পাওয়া যায়নি' : 'No pages found'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isBn
              ? 'আপনার ওয়েবসাইটে এখনো কোনো কাস্টম পেইজ তৈরি করা হয়নি। উপরের বাটনে ক্লিক করে নতুন পেইজ যোগ করুন।'
              : 'You have not created any custom pages yet. Click the button above to add one.'}
          </p>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus size={14} />
            {isBn ? 'পেইজ যোগ করুন' : 'Add Page'}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/70 border-b border-slate-200/80 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4">{isBn ? 'শিরোনাম' : 'Title'}</th>
                <th className="py-3.5 px-4">{isBn ? 'রাউট / পাথ' : 'Route / Path'}</th>
                <th className="py-3.5 px-4">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                <th className="py-3.5 px-4">{isBn ? 'তৈরির তারিখ' : 'Created'}</th>
                <th className="py-3.5 px-4 text-right">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredPages.map(page => (
                <tr key={page.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{page.title}</div>
                    {page.description && (
                      <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        {page.description}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="inline-flex items-center gap-1.5 font-mono text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200/60">
                      <Globe size={13} className="text-slate-400 shrink-0" />
                      <span>/{locale}/{page.slug}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        page.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${page.status === 'published' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {page.status === 'published'
                        ? (isBn ? 'প্রকাশিত' : 'Published')
                        : (isBn ? 'ড্রাফট' : 'Draft')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-500">
                    {new Date(page.createdAt).toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* View live page */}
                      <Link
                        href={`/${locale}/${page.slug}`}
                        target="_blank"
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title={isBn ? 'পেইজ দেখুন' : 'View Page'}
                      >
                        <ArrowSquareOut size={16} />
                      </Link>

                      {/* Edit in Rich Page Editor */}
                      <Link
                        href={`/${locale}/admin/pages/editor?id=${page.id}`}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title={isBn ? 'এডিটরে সম্পাদনা করুন' : 'Edit in Full Editor'}
                      >
                        <PencilSimple size={16} />
                      </Link>

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteConfirmId(page.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title={isBn ? 'মুছে ফেলুন' : 'Delete Page'}
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash size={20} />
            </div>
            <div className="text-center">
              <h4 className="text-base font-bold text-slate-900">
                {isBn ? 'আপনি কি নিশ্চিত?' : 'Are you sure?'}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                {isBn
                  ? 'এই পেইজটি মুছে ফেললে এর লিঙ্ক আর কাজ করবে না। এটি পুনরুদ্ধার করা সম্ভব নয়।'
                  : 'Deleting this page will remove it permanently. This cannot be undone.'}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
              >
                {isBn ? 'মুছে ফেলুন' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Page Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-950">
                  {editingPage
                    ? (isBn ? 'পেইজ সম্পাদনা করুন' : 'Edit Page')
                    : (isBn ? 'নতুন পেইজ তৈরি করুন' : 'Create New Custom Page')}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isBn
                    ? 'পেইজের শিরোনাম, কন্টেন্ট এবং নিজস্ব রাউট কনফিগার করুন।'
                    : 'Set page title, content and configure its custom route URL.'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <WarningCircle size={16} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title & Route row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    {isBn ? 'পেইজের নাম / শিরোনাম' : 'Page Title'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => handleSlugifyTitle(e.target.value)}
                    placeholder={isBn ? 'যেমন: আমাদের সম্পর্কে' : 'e.g. About Us'}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    {isBn ? 'কাস্টম রাউট / পাথ (Route URL)' : 'Custom Route / URL'} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-slate-900/10 focus-within:border-slate-900 focus-within:bg-white">
                    <span className="text-xs font-mono text-slate-400 select-none">/{locale}/</span>
                    <input
                      type="text"
                      required
                      value={formData.slug}
                      onChange={e => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="about-us"
                      className="w-full bg-transparent text-sm font-mono text-slate-900 outline-none pl-1"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {isBn
                      ? 'ভিজিটর্স এই রাউটে পেইজ দেখতে পাবেন: '
                      : 'Visitors will view this page at: '}
                    <span className="font-mono text-slate-600">/{locale}/{formData.slug || 'your-route'}</span>
                  </p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  {isBn ? 'সংক্ষিপ্ত বিবরণ (ঐচ্ছিক)' : 'Brief Description (Optional)'}
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder={isBn ? 'পেইজের একটি সংক্ষিপ্ত পরিচিতি...' : 'A short introduction or subtitle...'}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                />
              </div>

              {/* Content (Markdown) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    {isBn ? 'পেইজের বিষয়বস্তু / কন্টেন্ট (Markdown সমর্থিত)' : 'Page Content (Markdown Supported)'}
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {isBn ? 'হেডিং, লিংক, ইমেজ এবং টেবিল ব্যবহার করতে পারেন' : 'Supports headings, links, lists, images'}
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  placeholder={isBn ? 'এখানে আপনার পেইজের কন্টেন্ট লিখুন (Markdown ফরম্যাটে)...' : 'Write your page content here in Markdown...'}
                  className="w-full font-mono text-xs rounded-xl border border-slate-200 bg-white p-3.5 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                />
              </div>

              {/* Status & SEO Collapsible */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    {isBn ? 'স্ট্যাটাস' : 'Status'}
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  >
                    <option value="published">{isBn ? 'প্রকাশিত (Published)' : 'Published'}</option>
                    <option value="draft">{isBn ? 'ড্রাফট (Draft)' : 'Draft'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    {isBn ? 'SEO Title (ঐচ্ছিক)' : 'SEO Title (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={formData.seoTitle}
                    onChange={e => setFormData({ ...formData, seoTitle: e.target.value })}
                    placeholder={formData.title || 'SEO Title'}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    {isBn ? 'Meta Description (ঐচ্ছিক)' : 'Meta Description (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={formData.metaDescription}
                    onChange={e => setFormData({ ...formData, metaDescription: e.target.value })}
                    placeholder="Meta description for search engines"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-slate-950 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2"
                >
                  {submitting && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {editingPage
                    ? (isBn ? 'আপডেট সংরক্ষণ করুন' : 'Save Changes')
                    : (isBn ? 'পেইজ তৈরি করুন' : 'Create Page')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
