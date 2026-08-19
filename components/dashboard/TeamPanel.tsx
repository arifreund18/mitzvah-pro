'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type UserRow = {
  id: string
  email: string
  name: string
  role: 'org_owner' | 'org_member' | 'platform_admin'
  orgId: string
  createdAt: string
}

type Me = {
  userId: string | null
  canManageUsers: boolean
}

export function TeamPanel({
  initialUsers,
  me,
}: {
  initialUsers: UserRow[]
  me: Me
}) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'org_owner' | 'org_member'>('org_member')
  const [saving, setSaving] = useState(false)

  async function refresh() {
    const res = await fetch('/api/platform/users')
    if (!res.ok) return
    const data = (await res.json()) as { users: UserRow[] }
    setUsers(data.users)
    router.refresh()
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/platform/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    })
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    setSaving(false)
    if (!res.ok) {
      setError(data?.error || 'Não foi possível criar')
      return
    }
    setName('')
    setEmail('')
    setPassword('')
    setRole('org_member')
    await refresh()
  }

  async function onRemove(id: string) {
    if (!confirm('Remover este utilizador?')) return
    setError('')
    const res = await fetch(`/api/platform/users/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      setError(data?.error || 'Não foi possível remover')
      return
    }
    await refresh()
  }

  if (!me.canManageUsers) {
    return (
      <p className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
        Sem permissão para gerir utilizadores.
      </p>
    )
  }

  return (
    <div className="space-y-10">
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <section>
        <h2 className="font-display text-xl">Membros</h2>
        <div className="mt-4 grid gap-3">
          {users.length === 0 ? (
            <p className="text-sm text-white/50">Nenhum utilizador na organização.</p>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-white/50">{user.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase text-white/60">
                    {user.role === 'org_owner' ? 'Owner' : 'Membro'}
                  </span>
                  {me.userId !== user.id ? (
                    <button
                      type="button"
                      onClick={() => void onRemove(user.id)}
                      className="text-sm text-rose-300 hover:text-rose-200"
                    >
                      Remover
                    </button>
                  ) : (
                    <span className="text-xs text-white/30">Você</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl">Convidar membro</h2>
        <form onSubmit={onCreate} className="mt-4 max-w-lg space-y-4">
          <label className="block text-sm">
            Nome
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
            />
          </label>
          <label className="block text-sm">
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
            />
          </label>
          <label className="block text-sm">
            Senha inicial
            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
            />
          </label>
          <label className="block text-sm">
            Papel
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'org_owner' | 'org_member')}
              className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
            >
              <option value="org_member">Membro</option>
              <option value="org_owner">Owner</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-cyan-400 px-6 py-3 font-semibold text-[#0b1020]"
          >
            {saving ? 'A criar…' : 'Adicionar'}
          </button>
        </form>
      </section>
    </div>
  )
}
