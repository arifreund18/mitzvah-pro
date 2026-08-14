'use client'

import { useSearchParams } from 'next/navigation'

export function MissingEventNotice() {
  const params = useSearchParams()
  if (params.get('missing') !== '1') return null
  return (
    <div
      role="status"
      className="mb-6 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-5 py-4 text-sm text-rose-50"
    >
      Evento não encontrado. Se acabou de criar um, a persistência na Vercel provavelmente não está
      configurada (veja o aviso acima) — o ID existiu só na lambda que criou o registo.
    </div>
  )
}
