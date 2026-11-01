import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  getAllPages,
  createPage,
} from '@/lib/db/pages'

export async function GET() {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const pages = await getAllPages()
  return NextResponse.json(pages)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const data = await req.json()

    if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
      return NextResponse.json({ error: 'Page title is required' }, { status: 400 })
    }

    if (!data.slug || typeof data.slug !== 'string' || !data.slug.trim()) {
      return NextResponse.json({ error: 'Page route / slug is required' }, { status: 400 })
    }

    const newPage = await createPage({
      title: data.title.trim(),
      slug: data.slug.trim(),
      content: typeof data.content === 'string' ? data.content : '',
      description: data.description ? String(data.description).trim() : undefined,
      status: data.status === 'draft' ? 'draft' : 'published',
      seoTitle: data.seoTitle ? String(data.seoTitle).trim() : undefined,
      metaDescription: data.metaDescription ? String(data.metaDescription).trim() : undefined,
    })

    return NextResponse.json(newPage)
  } catch (e: any) {
    console.error('POST /api/admin/pages failed:', e)
    return NextResponse.json({ error: e.message || 'Failed to create page' }, { status: 400 })
  }
}
