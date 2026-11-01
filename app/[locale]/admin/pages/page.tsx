import { redirect } from 'next/navigation'

export default async function AdminPagesRedirect({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect(`/${locale}/dashboard?tab=pages`)
}
