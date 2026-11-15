'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type UserRow = {
  id: string
  email: string
  name: string
  role: 'org_owner' | 'org_member' | 'platform_admin'
  orgId: string
  eventIds: string[]
  createdAt: string
}

type EventOption = {
  id: string
  slug: string
  name: string
  familyName: string
}

type Me = {
  userId: string | null
  canManageUsers: boolean
}

export function TeamPanel({
  initialUsers,
  events,
  me,
}: {
  initialUsers: UserRow[]
  events: EventOption[]
  me: Me
}) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'org_owner' | 'org_member'>('org_member')
  const [eventIds, setEventIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editEventIds, setEditEventIds] = useState<string[]>([])
  const [editBusy, setEditBusy] = useState(false)

  async function refresh() {
    const res = await fetch('/api/platform/users')
    if (!res.ok) return
    const data = (await res.json()) as { users: UserRow[] }
    setUsers(data.users)
    router.refresh()
  }

  function toggleId(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((row) => row !== id) : [...list, id]
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/platform/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        password,
        role,
        eventIds: role === 'org_member' ? eventIds : [],
      }),
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
    setEventIds([])
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

  function startEdit(user: UserRow) {
    setEditingId(user.id)
    setEditEventIds(user.eventIds || [])
    setError('')
  }

  async function saveEdit(user: UserRow) {
    setEditBusy(true)
    setError('')
    const res = await fetch(`/api/platform/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: user.role === 'org_owner' ? 'org_owner' : 'org_member',
        eventIds: user.role === 'org_member' ? editEventIds : [],
      }),
    })
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    setEditBusy(false)
    if (!res.ok) {
      setError(data?.error || 'Não foi possível atualizar')
      return
    }
    setEditingId(null)
    await refresh()
  }

  function eventLabel(id: string) {
    const event = events.find((row) => row.id === id)
    if (!event) return id
    return event.familyName ? `${event.name} · ${event.familyName}` : event.name
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
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-white/50">{user.email}</p>
                    <p className="mt-2 text-xs text-white/40">
                      {user.role === 'org_owner'
                        ? 'Owner — todos os eventos da org'
                        : user.eventIds?.length
                          ? `Eventos: ${user.eventIds.map(eventLabel).join(', ')}`
                          : 'Membro — nenhum evento atribuído'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase text-white/60">
                      {user.role === 'org_owner' ? 'Owner' : 'Membro'}
                    </span>
                    {user.role === 'org_member' ? (
                      <button
                        type="button"
                        onClick={() => startEdit(user)}
                        className="text-sm text-cyan-300 hover:text-cyan-200"
                      >
                        Eventos
                      </button>
                    ) : null}
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
                {editingId === user.id ? (
                  <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                    <p className="text-sm text-white/60">Quais eventos este membro pode editar?</p>
                    {events.length === 0 ? (
                      <p className="text-sm text-amber-200/80">Crie um evento antes de atribuir acesso.</p>
                    ) : (
                      <div className="grid gap-2">
                        {events.map((event) => (
                          <label key={event.id} className="flex items-center gap-3 text-sm text-white/80">
                            <input
                              type="checkbox"
                              checked={editEventIds.includes(event.id)}
                              onChange={() => setEditEventIds((list) => toggleId(list, event.id))}
                              className="size-4 rounded border-white/20 bg-white/5"
                            />
                            <span>
                              {event.name}
                              {event.familyName ? (
                                <span className="text-white/40"> · {event.familyName}</span>
                              ) : null}
                              <span className="text-white/30"> · {event.slug}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        disabled={editBusy}
                        onClick={() => void saveEdit(user)}
                        className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-[#0b1020] disabled:opacity-40"
                      >
                        {editBusy ? 'A guardar…' : 'Guardar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : null}
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
              <option value="org_member">Membro (só eventos atribuídos)</option>
              <option value="org_owner">Owner (todos os eventos)</option>
            </select>
          </label>
          {role === 'org_member' ? (
            <fieldset className="space-y-2">
              <legend className="text-sm">Eventos que pode editar</legend>
              {events.length === 0 ? (
                <p className="text-sm text-amber-200/80">Crie um evento antes de convidar a família.</p>
              ) : (
                events.map((event) => (
                  <label key={event.id} className="flex items-center gap-3 text-sm text-white/80">
                    <input
                      type="checkbox"
                      checked={eventIds.includes(event.id)}
                      onChange={() => setEventIds((list) => toggleId(list, event.id))}
                      className="size-4 rounded border-white/20 bg-white/5"
                    />
                    <span>
                      {event.name}
                      {event.familyName ? (
                        <span className="text-white/40"> · {event.familyName}</span>
                      ) : null}
                      <span className="text-white/30"> · {event.slug}</span>
                    </span>
                  </label>
                ))
              )}
            </fieldset>
          ) : null}
          <button
            type="submit"
            disabled={saving || (role === 'org_member' && eventIds.length === 0)}
            className="rounded-full bg-cyan-400 px-6 py-3 font-semibold text-[#0b1020] disabled:opacity-40"
          >
            {saving ? 'A criar…' : 'Adicionar'}
          </button>
        </form>
      </section>
    </div>
  )
}
