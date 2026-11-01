import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  getPageById,
  updatePage,
  deletePage,
} from '@/lib/db/pages'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const page = await getPageById(id)
  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 })
  }

  return NextResponse.json(page)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  try {
    const data = await req.json()
    const updated = await updatePage(id, {
      title: data.title !== undefined ? String(data.title).trim() : undefined,
      slug: data.slug !== undefined ? String(data.slug).trim() : undefined,
      content: data.content !== undefined ? String(data.content) : undefined,
      description: data.description !== undefined ? String(data.description).trim() : undefined,
      status: data.status !== undefined ? (data.status === 'draft' ? 'draft' : 'published') : undefined,
      seoTitle: data.seoTitle !== undefined ? String(data.seoTitle).trim() : undefined,
      metaDescription: data.metaDescription !== undefined ? String(data.metaDescription).trim() : undefined,
      showCard: data.showCard !== undefined ? Boolean(data.showCard) : undefined,
      showTitle: data.showTitle !== undefined ? Boolean(data.showTitle) : undefined,
    })

    return NextResponse.json(updated)
  } catch (e: any) {
    console.error(`PUT /api/admin/pages/${id} failed:`, e)
    return NextResponse.json({ error: e.message || 'Failed to update page' }, { status: 400 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  try {
    await deletePage(id)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error(`DELETE /api/admin/pages/${id} failed:`, e)
    return NextResponse.json({ error: e.message || 'Failed to delete page' }, { status: 400 })
  }
}
