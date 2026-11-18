'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  guestsInvitedToScheduleItem,
  guestScheduleState,
} from '@/lib/platform/schedule-invite'
import type { PlatformEvent } from '@/lib/platform/types'

export function ScheduleGuestsPanel({ event }: { event: PlatformEvent }) {
  const items = event.config.schedule.items
  const allItemIds = useMemo(() => items.map((item) => item.id), [items])

  if (!items.length) {
    return (
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/50">
        Ainda não há momentos na programação. Adicione-os na seção Programação para gerir
        convites por evento.
      </div>
    )
  }

  if (!event.guests.length) {
    return (
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/50">
        Importe ou adicione convidados para escolher quem vê cada momento da programação.
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-3">
      {items.map((item) => (
        <ScheduleItemGuestsPicker
          key={item.id}
          eventId={event.id}
          itemId={item.id}
          itemLabel={[item.dayLabel, item.title].filter(Boolean).join(' — ') || item.id}
          itemMeta={[item.time, item.place].filter(Boolean).join(' · ')}
          guests={event.guests}
          allItemIds={allItemIds}
        />
      ))}
    </div>
  )
}

function ScheduleItemGuestsPicker({
  eventId,
  itemId,
  itemLabel,
  itemMeta,
  guests,
  allItemIds,
}: {
  eventId: string
  itemId: string
  itemLabel: string
  itemMeta: string
  guests: PlatformEvent['guests']
  allItemIds: string[]
}) {
  const router = useRouter()
  const initial = useMemo(
    () => new Set(guestsInvitedToScheduleItem(guests, itemId, allItemIds)),
    [guests, itemId, allItemIds],
  )
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(initial)
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState<'ok' | 'err'>('ok')

  useEffect(() => {
    setSelected(new Set(guestsInvitedToScheduleItem(guests, itemId, allItemIds)))
  }, [guests, itemId, allItemIds])

  const invitedCount = guestsInvitedToScheduleItem(guests, itemId, allItemIds).length

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return guests
    return guests.filter(
      (guest) =>
        guest.familyName.toLowerCase().includes(q) ||
        guest.email.toLowerCase().includes(q) ||
        guest.emails.some((email) => email.toLowerCase().includes(q)) ||
        guest.people.some((person) => person.name.toLowerCase().includes(q)),
    )
  }, [guests, query])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(guests.map((guest) => guest.id)))
  }

  function selectNone() {
    setSelected(new Set())
  }

  async function save() {
    setSaving(true)
    setMessage('')
    const res = await fetch(`/api/platform/events/${eventId}/schedule/invites`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduleItemId: itemId,
        invitedGuestIds: [...selected],
      }),
    })
    const data = (await res.json().catch(() => null)) as {
      error?: string
      invitedCount?: number
    } | null
    setSaving(false)
    if (!res.ok) {
      setMessageTone('err')
      setMessage(data?.error || 'Falha ao guardar convites')
      return
    }
    setMessageTone('ok')
    setMessage(
      `Guardado: ${data?.invitedCount ?? selected.size} famíli${
        (data?.invitedCount ?? selected.size) === 1 ? 'a' : 'as'
      } convidada(s) para este momento.`,
    )
    router.refresh()
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-white">{itemLabel}</p>
          {itemMeta ? <p className="mt-1 text-xs text-white/45">{itemMeta}</p> : null}
          <p className="mt-1 text-xs text-white/40">
            {invitedCount}/{guests.length} família(s) convidada(s)
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelected(new Set(guestsInvitedToScheduleItem(guests, itemId, allItemIds)))
            setOpen((value) => !value)
          }}
          className="rounded-full border border-cyan-400/40 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-400/10"
        >
          {open ? 'Fechar' : 'Gerir convidados'}
        </button>
      </div>

      {open ? (
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="text-xs text-white/50">
            Escolha quais famílias veem <strong className="text-white/80">{itemLabel}</strong> na
            programação do site. Famílias desmarcadas não veem este momento.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="rounded-full border border-white/20 px-3 py-1.5 text-xs hover:bg-white/10"
            >
              Adicionar todos
            </button>
            <button
              type="button"
              onClick={selectNone}
              className="rounded-full border border-white/20 px-3 py-1.5 text-xs hover:bg-white/10"
            >
              Remover todos
            </button>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar família / pessoa / email"
              className="min-w-52 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs outline-none"
            />
          </div>
          <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto text-sm">
            {filtered.map((guest) => {
              const people = guest.people.map((person) => person.name).filter(Boolean).join(', ')
              const mode = guestScheduleState(guest).mode
              return (
                <li key={guest.id}>
                  <label className="flex cursor-pointer items-start gap-2 rounded-xl px-2 py-1.5 hover:bg-white/5">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selected.has(guest.id)}
                      onChange={() => toggle(guest.id)}
                    />
                    <span>
                      <span className="font-medium">{guest.familyName}</span>
                      {people ? (
                        <span className="text-white/45"> — {people}</span>
                      ) : null}
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-white/30">
                        {mode === 'all' ? 'todos' : mode === 'none' ? 'nenhum' : 'parcial'}
                      </span>
                    </span>
                  </label>
                </li>
              )
            })}
            {filtered.length === 0 ? (
              <li className="px-2 py-3 text-xs text-white/40">Nenhuma família neste filtro.</li>
            ) : null}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-[#0b1020] disabled:opacity-40"
            >
              {saving ? 'A guardar…' : `Guardar (${selected.size})`}
            </button>
            {message ? (
              <p className={`text-xs ${messageTone === 'err' ? 'text-rose-300' : 'text-cyan-200'}`}>
                {message}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
