import { redirect } from 'next/navigation'

export default async function InviteTokenRedirect({
  params,
}: {
  params: Promise<{ slug: string; token: string }>
}) {
  const { slug, token } = await params
  redirect(`/e/${slug}/card/${token}`)
}
