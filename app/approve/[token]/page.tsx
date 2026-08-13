import { notFound } from 'next/navigation'
import { EventSite } from '@/components/template/EventSite'
import { getEventByApprovalToken } from '@/lib/platform/store'
import { ApproveButton } from '@/components/dashboard/ApproveButton'

export const dynamic = 'force-dynamic'

export default async function ApprovePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const event = await getEventByApprovalToken(token)
  if (!event || event.status === 'archived') notFound()
  const already = event.status === 'approved' || event.status === 'published'

  return (
    <div className="bg-[#0b1020] text-white">
      <div className="border-b border-white/10 px-4 py-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Aprovação boutique</p>
        <h1 className="font-display mt-2 text-3xl">{event.config.basics.honoreeName || 'Evento'}</h1>
        <p className="mt-2 text-sm text-white/50">
          Revise o site abaixo. Se estiver correto, aprove para a equipe Mitzvah publicar.
        </p>
        <div className="mt-4">
          {already ? (
            <p className="text-emerald-200">Este evento já foi aprovado.</p>
          ) : (
            <ApproveButton token={token} />
          )}
        </div>
      </div>
      <EventSite
        config={event.config}
        mode="preview"
        displayLocale={event.config.locales.default}
        slug={event.slug}
      />
    </div>
  )
}
