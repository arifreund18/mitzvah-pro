'use client'

import { useState } from 'react'
import type { EventLocale, Guest, GuestPerson, GuestRsvp, PersonType } from '@/lib/platform/types'

type PublicRsvpConfig = {
  meals: string[]
  collectDietary: boolean
  collectMeal: boolean
  allowPlusOne: boolean
  notes: string
  confirmationMessage: string
  deadline: string
}

type Strings = {
  title: string
  family: string
  person: string
  adult: string
  child: string
  yes: string
  no: string
  pending: string
  meal: string
  dietary: string
  message: string
  addPerson: string
  submit: string
  submitting: string
  thanks: string
  update: string
  name: string
  type: string
  status: string
}

const STRINGS: Record<EventLocale, Strings> = {
  en: {
    title: 'RSVP',
    family: 'Family',
    person: 'Guest',
    adult: 'Adult',
    child: 'Child',
    yes: 'Attending',
    no: 'Cannot attend',
    pending: 'Pending',
    meal: 'Meal',
    dietary: 'Dietary needs',
    message: 'Message to hosts',
    addPerson: 'Add person',
    submit: 'Send RSVP',
    submitting: 'Sending…',
    thanks: 'Thank you! Your RSVP was saved.',
    update: 'Update RSVP',
    name: 'Name',
    type: 'Type',
    status: 'Response',
  },
  pt: {
    title: 'RSVP',
    family: 'Família',
    person: 'Convidado',
    adult: 'Adulto',
    child: 'Criança',
    yes: 'Vamos',
    no: 'Não poderemos',
    pending: 'Pendente',
    meal: 'Refeição',
    dietary: 'Restrições alimentares',
    message: 'Recado aos anfitriões',
    addPerson: 'Adicionar pessoa',
    submit: 'Enviar RSVP',
    submitting: 'Enviando…',
    thanks: 'Obrigado! Recebemos a confirmação.',
    update: 'Atualizar RSVP',
    name: 'Nome',
    type: 'Tipo',
    status: 'Presença',
  },
  es: {
    title: 'RSVP',
    family: 'Familia',
    person: 'Invitado',
    adult: 'Adulto',
    child: 'Niño/a',
    yes: 'Asistiremos',
    no: 'No podremos',
    pending: 'Pendiente',
    meal: 'Comida',
    dietary: 'Restricciones alimentarias',
    message: 'Mensaje a los anfitriones',
    addPerson: 'Añadir persona',
    submit: 'Enviar RSVP',
    submitting: 'Enviando…',
    thanks: '¡Gracias! Recibimos su confirmación.',
    update: 'Actualizar RSVP',
    name: 'Nombre',
    type: 'Tipo',
    status: 'Asistencia',
  },
  he: {
    title: 'RSVP',
    family: 'משפחה',
    person: 'אורח',
    adult: 'מבוגר',
    child: 'ילד/ה',
    yes: 'מגיעים',
    no: 'לא נוכל',
    pending: 'ממתין',
    meal: 'מנה',
    dietary: 'הגבלות תזונה',
    message: 'הודעה למארחים',
    addPerson: 'הוסיפו אורח',
    submit: 'שלחו RSVP',
    submitting: 'שולחים…',
    thanks: 'תודה! האישור התקבל.',
    update: 'עדכנו RSVP',
    name: 'שם',
    type: 'סוג',
    status: 'נוכחות',
  },
}

function blankPerson(familyName: string): GuestPerson {
  return {
    id: `tmp-${Math.random().toString(36).slice(2, 10)}`,
    name: familyName,
    type: 'adult',
    status: 'pending',
    meal: '',
    dietary: '',
  }
}

export function TokenRsvpForm({
  token,
  guest,
  rsvp,
  locale = 'pt',
  accent = '#22d3ee',
}: {
  token: string
  guest: Guest
  rsvp: PublicRsvpConfig
  locale?: EventLocale
  accent?: string
}) {
  const t = STRINGS[locale] || STRINGS.pt
  const alreadyReplied = guest.people.some((p) => p.status !== 'pending') || guest.status !== 'pending'
  const [people, setPeople] = useState<GuestPerson[]>(
    guest.people.length ? guest.people.map((p) => ({ ...p })) : [blankPerson(guest.familyName)],
  )
  const [message, setMessage] = useState(guest.message || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState('')

  function updatePerson(index: number, patch: Partial<GuestPerson>) {
    setPeople((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch(`/api/platform/rsvp/${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        people: people.map((p) => ({
          id: p.id.startsWith('tmp-') ? undefined : p.id,
          name: p.name,
          type: p.type,
          status: p.status,
          meal: p.meal,
          dietary: p.dietary,
        })),
        message,
      }),
    })
    setLoading(false)
    const data = (await res.json().catch(() => null)) as {
      error?: string
      confirmation?: string
      guest?: Guest
    } | null
    if (!res.ok) {
      setError(data?.error || 'RSVP failed')
      return
    }
    if (data?.guest?.people?.length) setPeople(data.guest.people.map((p) => ({ ...p })))
    setConfirmation(data?.confirmation || rsvp.confirmationMessage || t.thanks)
  }

  if (confirmation) {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-6 py-8 text-center text-emerald-50">
        <p className="text-lg font-medium">{confirmation}</p>
        <button
          type="button"
          className="mt-6 text-sm underline opacity-80"
          onClick={() => setConfirmation('')}
        >
          {t.update}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 text-left">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] opacity-60">{t.family}</p>
        <h1 className="mt-2 font-display text-3xl">{guest.familyName}</h1>
        {rsvp.notes ? <p className="mt-2 text-sm opacity-70">{rsvp.notes}</p> : null}
        {rsvp.deadline ? (
          <p className="mt-1 text-sm opacity-60">
            {rsvp.deadline}
          </p>
        ) : null}
      </div>

      {people.map((person, index) => (
        <fieldset
          key={person.id || index}
          className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4"
        >
          <legend className="px-1 text-sm font-medium">
            {t.person} {index + 1}
          </legend>
          <label className="block text-sm">
            {t.name}
            <input
              required
              value={person.name}
              onChange={(e) => updatePerson(index, { name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              {t.type}
              <select
                value={person.type}
                onChange={(e) => updatePerson(index, { type: e.target.value as PersonType })}
                className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
              >
                <option value="adult">{t.adult}</option>
                <option value="child">{t.child}</option>
              </select>
            </label>
            <label className="block text-sm">
              {t.status}
              <select
                value={person.status}
                onChange={(e) => updatePerson(index, { status: e.target.value as GuestRsvp })}
                className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
              >
                <option value="yes">{t.yes}</option>
                <option value="no">{t.no}</option>
                <option value="pending">{t.pending}</option>
              </select>
            </label>
          </div>
          {rsvp.collectMeal && rsvp.meals.length > 0 ? (
            <label className="block text-sm">
              {t.meal}
              <select
                value={person.meal}
                onChange={(e) => updatePerson(index, { meal: e.target.value })}
                className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
              >
                <option value="">—</option>
                {rsvp.meals.filter(Boolean).map((meal) => (
                  <option key={meal} value={meal}>
                    {meal}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {rsvp.collectDietary ? (
            <label className="block text-sm">
              {t.dietary}
              <input
                value={person.dietary}
                onChange={(e) => updatePerson(index, { dietary: e.target.value })}
                className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
              />
            </label>
          ) : null}
        </fieldset>
      ))}

      {guest.openRsvp || rsvp.allowPlusOne ? (
        <button
          type="button"
          onClick={() => setPeople((rows) => [...rows, blankPerson(guest.familyName)])}
          className="text-sm underline opacity-80"
        >
          {t.addPerson}
        </button>
      ) : null}

      <label className="block text-sm">
        {t.message}
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
        />
      </label>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full py-3 font-semibold text-[#0b1020]"
        style={{ background: accent }}
      >
        {loading ? t.submitting : alreadyReplied ? t.update : t.submit}
      </button>
    </form>
  )
}
