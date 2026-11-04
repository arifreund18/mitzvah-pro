'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Guest, PlatformEvent, ScheduleInviteMode } from '@/lib/platform/types'

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString()
}

type SortKey = 'name' | 'rsvp' | 'std' | 'invite'

export function GuestAdminPanel({ event }: { event: PlatformEvent }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [rsvp, setRsvp] = useState<'all' | 'yes' | 'no' | 'pending'>('all')
  const [std, setStd] = useState<'all' | 'yes' | 'no'>('all')
  const [invite, setInvite] = useState<'all' | 'yes' | 'no'>('all')
  const [sort, setSort] = useState<SortKey>('name')
  const [busyId, setBusyId] = useState('')

  const counts = useMemo(() => {
    let adults = 0
    let children = 0
    for (const guest of event.guests) {
      for (const person of guest.people || []) {
        if (person.type === 'child') children += 1
        else adults += 1
      }
    }
    return { adults, children }
  }, [event.guests])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = [...event.guests]
    if (q) {
      list = list.filter(
        (g) =>
          g.familyName.toLowerCase().includes(q) ||
          g.email.toLowerCase().includes(q) ||
          g.emails.some((e) => e.toLowerCase().includes(q)),
      )
    }
    if (rsvp !== 'all') list = list.filter((g) => g.status === rsvp)
    if (std === 'yes') list = list.filter((g) => Boolean(g.stdSentAt))
    if (std === 'no') list = list.filter((g) => !g.stdSentAt)
    if (invite === 'yes') list = list.filter((g) => Boolean(g.inviteSentAt))
    if (invite === 'no') list = list.filter((g) => !g.inviteSentAt)
    list.sort((a, b) => {
      if (sort === 'rsvp') return a.status.localeCompare(b.status) || a.familyName.localeCompare(b.familyName)
      if (sort === 'std') return String(a.stdSentAt || '').localeCompare(String(b.stdSentAt || ''))
      if (sort === 'invite')
        return String(a.inviteSentAt || '').localeCompare(String(b.inviteSentAt || ''))
      return a.familyName.localeCompare(b.familyName)
    })
    return list
  }, [event.guests, query, rsvp, std, invite, sort])

  async function persist(next: Guest[]) {
    const res = await fetch(`/api/platform/events/${event.id}/guests`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guests: next }),
    })
    if (res.ok) router.refresh()
  }

  async function patchGuest(guestId: string, patch: Partial<Guest>) {
    setBusyId(guestId)
    const next = event.guests.map((g) => (g.id === guestId ? { ...g, ...patch } : g))
    await persist(next)
    setBusyId('')
  }

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-white/50">
        Adultos: {counts.adults} · Crianças: {counts.children}
      </p>
      <div className="flex flex-wrap gap-2 text-sm">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar família / email"
          className="min-w-52 rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none"
        />
        <select
          value={rsvp}
          onChange={(e) => setRsvp(e.target.value as typeof rsvp)}
          className="rounded-xl border border-white/15 bg-[#12182a] px-3 py-2"
        >
          <option value="all">RSVP: todos</option>
          <option value="yes">RSVP: sim</option>
          <option value="no">RSVP: não</option>
          <option value="pending">RSVP: pendente</option>
        </select>
        <select
          value={std}
          onChange={(e) => setStd(e.target.value as typeof std)}
          className="rounded-xl border border-white/15 bg-[#12182a] px-3 py-2"
        >
          <option value="all">STD: todos</option>
          <option value="yes">STD enviado</option>
          <option value="no">STD não enviado</option>
        </select>
        <select
          value={invite}
          onChange={(e) => setInvite(e.target.value as typeof invite)}
          className="rounded-xl border border-white/15 bg-[#12182a] px-3 py-2"
        >
          <option value="all">Convite: todos</option>
          <option value="yes">Convite enviado</option>
          <option value="no">Convite não enviado</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-xl border border-white/15 bg-[#12182a] px-3 py-2"
        >
          <option value="name">Ordenar: nome</option>
          <option value="rsvp">Ordenar: RSVP</option>
          <option value="std">Ordenar: STD</option>
          <option value="invite">Ordenar: convite</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-white/5 text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Família</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Pessoas</th>
              <th className="px-4 py-3 font-medium">RSVP</th>
              <th className="px-4 py-3 font-medium">Programação</th>
              <th className="px-4 py-3 font-medium">STD</th>
              <th className="px-4 py-3 font-medium">Convite</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-white/40">
                  Nenhum convidado neste filtro.
                </td>
              </tr>
            ) : (
              rows.map((guest) => {
                const adults = (guest.people || []).filter((p) => p.type !== 'child').length
                const children = (guest.people || []).filter((p) => p.type === 'child').length
                return (
                  <tr key={guest.id} className="border-t border-white/10 align-top">
                    <td className="px-4 py-3">{guest.familyName}</td>
                    <td className="px-4 py-3 text-white/60">{guest.email || '—'}</td>
                    <td className="px-4 py-3">
                      {guest.partySize}
                      <span className="block text-xs text-white/40">
                        {adults}A / {children}C
                      </span>
                    </td>
                    <td className="px-4 py-3">{guest.status}</td>
                    <td className="px-4 py-3">
                      <select
                        disabled={busyId === guest.id}
                        value={guest.scheduleInviteMode || 'all'}
                        onChange={(e) =>
                          void patchGuest(guest.id, {
                            scheduleInviteMode: e.target.value as ScheduleInviteMode,
                          })
                        }
                        className="mb-2 w-full rounded-lg border border-white/15 bg-[#12182a] px-2 py-1 text-xs"
                      >
                        <option value="all">Todos os momentos</option>
                        <option value="subset">Subconjunto</option>
                        <option value="none">Nenhum</option>
                      </select>
                      {guest.scheduleInviteMode === 'subset' ? (
                        <div className="max-h-28 space-y-1 overflow-auto text-xs">
                          {event.config.schedule.items.map((item) => {
                            const checked = (guest.scheduleItemIds || []).includes(item.id)
                            return (
                              <label key={item.id} className="flex items-center gap-2 text-white/70">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={busyId === guest.id}
                                  onChange={(e) => {
                                    const set = new Set(guest.scheduleItemIds || [])
                                    if (e.target.checked) set.add(item.id)
                                    else set.delete(item.id)
                                    void patchGuest(guest.id, {
                                      scheduleItemIds: Array.from(set),
                                      scheduleInviteMode: 'subset',
                                    })
                                  }}
                                />
                                {item.title || item.id}
                              </label>
                            )
                          })}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-white/60">{fmt(guest.stdSentAt)}</td>
                    <td className="px-4 py-3 text-white/60">{fmt(guest.inviteSentAt)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
