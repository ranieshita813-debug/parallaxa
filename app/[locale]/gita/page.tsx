import { Metadata } from 'next'
import { getGitaVerses, GITA_CHAPTERS } from '@/lib/gita'
import GitaReaderClient from './GitaReaderClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ chapter?: string; verse?: string; q?: string }>
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const isBn = locale === 'bn'

  return {
    title: isBn
      ? 'শ্রীমদ্ভগবদ্গীতা - শ্লোক ও ভাবার্থ | The Hindu Campus'
      : 'Srimad Bhagavad Gita - Verses & Commentary | The Hindu Campus',
    description: isBn
      ? 'শ্রীমদ্ভগবদ্গীতার ১৮টি অধ্যায় ও ৭০১টি শ্লোক সহজে খুঁজুন ও পাঠ করুন।'
      : 'Easily explore and read all 18 chapters and 701 verses of the Srimad Bhagavad Gita.',
  }
}

export default async function GitaPage({ params, searchParams }: Props) {
  const { locale } = await params
  const resolvedSearchParams = await searchParams

  const initialChapter = parseInt(resolvedSearchParams.chapter || '1', 10) || 1
  const initialVerse = parseInt(resolvedSearchParams.verse || '1', 10) || 1
  const initialQuery = resolvedSearchParams.q || ''

  // Pre-load all verses on the server for fast client interaction
  const allVerses = getGitaVerses()

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <GitaReaderClient
        locale={locale}
        chapters={GITA_CHAPTERS}
        initialVerses={allVerses}
        defaultChapter={initialChapter}
        defaultVerse={initialVerse}
        defaultQuery={initialQuery}
      />
    </main>
  )
}
