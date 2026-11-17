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
  yourGuests: string
  openHint: string
  person: string
  adult: string
  child: string
  yes: string
  no: string
  meal: string
  dietary: string
  message: string
  addPerson: string
  removePerson: string
  submit: string
  submitting: string
  thanks: string
  update: string
  name: string
  nameRequired: string
  contactEmail: string
  emailRequired: string
}

const STRINGS: Record<EventLocale, Strings> = {
  en: {
    title: 'RSVP',
    family: 'Family',
    yourGuests: 'Confirm attendance for each guest below.',
    openHint: 'Add each guest’s name and confirm attendance.',
    person: 'Guest',
    adult: 'Adult',
    child: 'Child',
    yes: 'Attending',
    no: 'Cannot attend',
    meal: 'Meal',
    dietary: 'Dietary needs',
    message: 'Message to hosts',
    addPerson: 'Add person',
    removePerson: 'Remove',
    submit: 'Send RSVP',
    submitting: 'Sending…',
    thanks: 'Thank you! Your RSVP was saved.',
    update: 'Update RSVP',
    name: 'Name',
    nameRequired: 'Please enter a name for each guest.',
    contactEmail: 'Contact email',
    emailRequired: 'Please enter a valid contact email.',
  },
  pt: {
    title: 'RSVP',
    family: 'Família',
    yourGuests: 'Confirme a presença de cada convidado abaixo.',
    openHint: 'Informe o nome de cada convidado e confirme a presença.',
    person: 'Convidado',
    adult: 'Adulto',
    child: 'Criança',
    yes: 'Vamos',
    no: 'Não poderemos',
    meal: 'Refeição',
    dietary: 'Restrições alimentares',
    message: 'Recado aos anfitriões',
    addPerson: 'Adicionar pessoa',
    removePerson: 'Remover',
    submit: 'Enviar RSVP',
    submitting: 'Enviando…',
    thanks: 'Obrigado! Recebemos a confirmação.',
    update: 'Atualizar RSVP',
    name: 'Nome',
    nameRequired: 'Informe o nome de cada convidado.',
    contactEmail: 'E-mail de contato',
    emailRequired: 'Informe um e-mail de contato válido.',
  },
  es: {
    title: 'RSVP',
    family: 'Familia',
    yourGuests: 'Confirme la asistencia de cada invitado abajo.',
    openHint: 'Indique el nombre de cada invitado y confirme la asistencia.',
    person: 'Invitado',
    adult: 'Adulto',
    child: 'Niño/a',
    yes: 'Asistiremos',
    no: 'No podremos',
    meal: 'Comida',
    dietary: 'Restricciones alimentarias',
    message: 'Mensaje a los anfitriones',
    addPerson: 'Añadir persona',
    removePerson: 'Quitar',
    submit: 'Enviar RSVP',
    submitting: 'Enviando…',
    thanks: '¡Gracias! Recibimos su confirmación.',
    update: 'Actualizar RSVP',
    name: 'Nombre',
    nameRequired: 'Indique el nombre de cada invitado.',
    contactEmail: 'Correo de contacto',
    emailRequired: 'Indique un correo de contacto válido.',
  },
  he: {
    title: 'RSVP',
    family: 'משפחה',
    yourGuests: 'אשרו הגעה עבור כל אורח למטה.',
    openHint: 'הזינו שם לכל אורח ואשרו הגעה.',
    person: 'אורח',
    adult: 'מבוגר',
    child: 'ילד/ה',
    yes: 'מגיעים',
    no: 'לא נוכל',
    meal: 'מנה',
    dietary: 'הגבלות תזונה',
    message: 'הודעה למארחים',
    addPerson: 'הוסיפו אורח',
    removePerson: 'הסירו',
    submit: 'שלחו RSVP',
    submitting: 'שולחים…',
    thanks: 'תודה! האישור התקבל.',
    update: 'עדכנו RSVP',
    name: 'שם',
    nameRequired: 'נא להזין שם לכל אורח.',
    contactEmail: 'אימייל ליצירת קשר',
    emailRequired: 'נא להזין אימייל תקין.',
  },
}

type Row = GuestPerson & { isNew?: boolean }

function newOpenRow(): Row {
  return {
    id: `tmp-${Math.random().toString(36).slice(2, 10)}`,
    name: '',
    type: 'adult',
    status: 'yes',
    meal: '',
    dietary: '',
    isNew: true,
  }
}

function toRows(guest: Guest, openMode: boolean, meals: string[]): Row[] {
  const defaultMeal = meals.filter(Boolean)[0] || ''
  if (openMode) return [{ ...newOpenRow(), meal: defaultMeal }]
  if (guest.people.length) {
    return guest.people.map((person) => {
      const status: GuestRsvp = person.status === 'no' ? 'no' : 'yes'
      return {
        ...person,
        // Closed invite: default unanswered guests to attending (BarBeni-style).
        status,
        meal: status === 'yes' ? person.meal || defaultMeal : '',
        isNew: false,
      }
    })
  }
  return [{ ...newOpenRow(), meal: defaultMeal }]
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
  const openMode = Boolean(guest.openRsvp)
  const alreadyReplied = guest.people.some((p) => p.status !== 'pending') || guest.status !== 'pending'
  const [people, setPeople] = useState<Row[]>(() => toRows(guest, openMode, rsvp.meals))
  const [message, setMessage] = useState(guest.message || '')
  const [contactEmail, setContactEmail] = useState(guest.email || guest.emails[0] || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState('')

  function updatePerson(index: number, patch: Partial<Row>) {
    setPeople((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (openMode || people.some((p) => p.isNew)) {
      if (people.some((p) => p.isNew && !p.name.trim())) {
        setError(t.nameRequired)
        return
      }
    }

    if (openMode) {
      const email = contactEmail.trim()
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError(t.emailRequired)
        return
      }
    }

    setLoading(true)
    const res = await fetch(`/api/platform/rsvp/${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        people: people.map((p) => ({
          id: p.isNew || p.id.startsWith('tmp-') ? undefined : p.id,
          name: p.isNew || openMode ? p.name : undefined,
          type: p.isNew || openMode ? p.type : undefined,
          status: p.status === 'no' ? 'no' : 'yes',
          meal: p.meal,
          dietary: p.dietary,
        })),
        message,
        contactEmail: openMode ? contactEmail.trim() : undefined,
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
    if (data?.guest?.people?.length) {
      setPeople(data.guest.people.map((p) => ({ ...p, isNew: false })))
    }
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

  const canAdd = openMode || rsvp.allowPlusOne

  return (
    <form onSubmit={onSubmit} className="space-y-6 text-left">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] opacity-60">{t.family}</p>
        <h1 className="mt-2 font-display text-3xl">{guest.familyName}</h1>
        <p className="mt-2 text-sm opacity-70">{openMode ? t.openHint : t.yourGuests}</p>
        {rsvp.notes ? <p className="mt-2 text-sm opacity-70">{rsvp.notes}</p> : null}
        {rsvp.deadline ? <p className="mt-1 text-sm opacity-60">{rsvp.deadline}</p> : null}
      </div>

      {people.map((person, index) => {
        const editableName = openMode || Boolean(person.isNew)
        return (
          <fieldset
            key={person.id || index}
            className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <legend className="px-1 text-sm font-medium">
              {t.person} {index + 1}
            </legend>

            {editableName ? (
              <label className="block text-sm">
                {t.name}
                <input
                  required
                  value={person.name}
                  onChange={(e) => updatePerson(index, { name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
                />
              </label>
            ) : (
              <p className="text-base font-semibold">
                {person.name}
                <span className="ml-2 text-xs font-normal opacity-50">
                  {person.type === 'child' ? t.child : t.adult}
                </span>
              </p>
            )}

            {editableName ? (
              <label className="block text-sm">
                <span className="sr-only">{t.adult}</span>
                <select
                  value={person.type}
                  onChange={(e) => updatePerson(index, { type: e.target.value as PersonType })}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
                >
                  <option value="adult">{t.adult}</option>
                  <option value="child">{t.child}</option>
                </select>
              </label>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  person.status === 'yes' ? 'text-[#0b1020]' : 'border border-white/15 bg-white/5'
                }`}
                style={person.status === 'yes' ? { background: accent } : undefined}
                onClick={() =>
                  updatePerson(index, {
                    status: 'yes' as GuestRsvp,
                    meal: person.meal || rsvp.meals.filter(Boolean)[0] || '',
                  })
                }
              >
                {t.yes}
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  person.status === 'no' ? 'bg-orange-400 text-[#0b1020]' : 'border border-white/15 bg-white/5'
                }`}
                onClick={() => updatePerson(index, { status: 'no' as GuestRsvp, meal: '', dietary: '' })}
              >
                {t.no}
              </button>
              {editableName && people.length > 1 ? (
                <button
                  type="button"
                  className="ml-auto text-sm text-rose-300"
                  onClick={() => setPeople((rows) => rows.filter((_, i) => i !== index))}
                >
                  {t.removePerson}
                </button>
              ) : null}
            </div>

            {person.status === 'yes' && rsvp.collectMeal && rsvp.meals.length > 0 ? (
              <label className="block text-sm">
                {t.meal}
                <select
                  value={person.meal || rsvp.meals[0] || ''}
                  onChange={(e) => updatePerson(index, { meal: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
                >
                  {rsvp.meals.filter(Boolean).map((meal) => (
                    <option key={meal} value={meal}>
                      {meal}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {person.status === 'yes' && rsvp.collectDietary ? (
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
        )
      })}

      {canAdd && people.length < 20 ? (
        <button
          type="button"
          onClick={() =>
            setPeople((rows) => [
              ...rows,
              { ...newOpenRow(), meal: rsvp.meals.filter(Boolean)[0] || '' },
            ])
          }
          className="text-sm underline opacity-80"
        >
          {t.addPerson}
        </button>
      ) : null}

      {openMode ? (
        <label className="block text-sm">
          {t.contactEmail}
          <input
            type="email"
            required
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 outline-none"
            autoComplete="email"
          />
        </label>
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
        {loading ? t.submitting : alreadyReplied && !openMode ? t.update : t.submit}
      </button>
    </form>
  )
}
