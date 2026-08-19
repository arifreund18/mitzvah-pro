'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
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
      body: JSON.stringify({
        email: email.trim() || undefined,
        password,
      }),
    })
    setLoading(false)
    if (!res.ok) {
      setError('Credenciais inválidas')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm text-white/70">
        Email <span className="text-white/35">(opcional — admin da plataforma deixa em branco)</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="owner@mitzvah.pro"
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-cyan-400/60"
        />
      </label>
      <label className="block text-sm text-white/70">
        Senha
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-cyan-400/60"
          autoFocus={!email}
          required
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
      <div className="space-y-1 text-center text-xs text-white/35">
        <p>
          <strong className="text-white/50">Admin plataforma:</strong> só senha{' '}
          <code>mitzvah</code> (<code>DASHBOARD_PASSWORD</code>)
        </p>
        <p>
          <strong className="text-white/50">Utilizador org:</strong> email + senha (seed:{' '}
          <code>owner@mitzvah.pro</code> / <code>mitzvah</code>)
        </p>
      </div>
    </form>
  )
}
