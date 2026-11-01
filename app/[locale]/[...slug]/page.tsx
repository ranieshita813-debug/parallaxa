import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPageBySlug } from '@/lib/db/pages'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { auth } from '@/auth'
import Link from 'next/link'
import { CalendarBlank } from '@phosphor-icons/react/dist/ssr'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>
}): Promise<Metadata> {
  const { slug } = await params
  const slugPath = Array.isArray(slug) ? slug.join('/') : slug
  const page = await getPageBySlug(slugPath)

  if (!page) {
    return {
      title: 'Page Not Found',
      robots: 'noindex, nofollow',
    }
  }

  const title = page.seoTitle || page.title
  const description = page.metaDescription || page.description || ''

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function DynamicCustomPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>
}) {
  const { locale, slug } = await params
  const slugPath = Array.isArray(slug) ? slug.join('/') : slug
  const page = await getPageBySlug(slugPath)

  if (!page) {
    notFound()
  }

  // If status is draft, only allow logged-in admins to preview
  if (page.status === 'draft') {
    const session = await auth()
    if (!session || (session.user as any)?.role !== 'admin') {
      notFound()
    }
  }

  const isBn = locale === 'bn'
  const formattedDate = new Date(page.updatedAt || page.createdAt).toLocaleDateString(
    isBn ? 'bn-BD' : 'en-US',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
  )

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 md:py-12">
        {page.status === 'draft' && (
          <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5 rounded-xl font-medium flex items-center justify-between">
            <span>
              {isBn
                ? '⚠️ এই পেইজটি বর্তমানে ড্রাফট হিসেবে সংরক্ষিত (শুধুমাত্র এডমিন দেখতে পারবেন)।'
                : '⚠️ This page is currently a draft (visible only to admins).'}
            </span>
            <span className="uppercase text-[10px] font-bold bg-amber-200/80 px-2 py-0.5 rounded">
              Draft
            </span>
          </div>
        )}

        <article className="bg-white border border-slate-200/70 rounded-3xl p-6 md:p-12 shadow-sm">
          {/* Header */}
          <header className="border-b border-slate-100 pb-6 mb-8">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-950 mb-4 leading-tight">
              {page.title}
            </h1>

            {page.description && (
              <p className="text-base md:text-lg text-slate-600 mb-4 font-normal leading-relaxed">
                {page.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
              <span className="flex items-center gap-1.5">
                <CalendarBlank size={14} />
                {formattedDate}
              </span>
            </div>
          </header>

          {/* Content Body */}
          <div className="prose prose-slate max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:leading-relaxed prose-a:text-blue-600 prose-a:underline hover:prose-a:text-blue-800 prose-img:rounded-2xl">
            <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw as any]}>
              {page.content}
            </Markdown>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  )
}
