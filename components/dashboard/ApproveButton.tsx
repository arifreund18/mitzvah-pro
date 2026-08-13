'use client'

import { useState } from 'react'

export function ApproveButton({ token }: { token: string }) {
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function approve() {
    setBusy(true)
    setError('')
    const res = await fetch('/api/platform/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    setBusy(false)
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      setError(data?.error || 'Não foi possível aprovar')
      return
    }
    setDone(true)
  }

  if (done) {
    return <p className="text-emerald-200">Obrigado. A equipe já pode publicar o site.</p>
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void approve()}
        className="rounded-full bg-cyan-400 px-6 py-3 font-semibold text-[#0b1020]"
      >
        {busy ? 'A aprovar…' : 'Aprovar este site'}
      </button>
      {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
    </div>
  )
}
