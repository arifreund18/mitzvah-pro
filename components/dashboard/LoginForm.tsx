'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function LoginForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/platform/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    setLoading(false)
    if (!res.ok) {
      setError('Senha incorreta')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm text-white/70">
        Senha do studio
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-cyan-400/60"
          autoFocus
        />
      </label>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-cyan-400 py-3 font-semibold text-[#0b1020]"
      >
        {loading ? 'Entrando…' : 'Entrar'}
      </button>
      <p className="text-center text-xs text-white/35">
        Local: senha padrão <code>mitzvah</code> (env <code>DASHBOARD_PASSWORD</code>)
      </p>
    </form>
  )
}
