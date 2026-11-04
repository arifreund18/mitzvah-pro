'use client'

import { forwardRef, useImperativeHandle, useRef } from 'react'
import { DatePicker } from '@/components/wizard/DatePicker'
import { Field, TextArea, TextInput } from '@/components/wizard/fields'
import { applyGeneratedPatch, typeLabel, wizardUi } from '@/lib/platform/copy'
import { uid } from '@/lib/platform/ids'
import {
  EVENT_TYPES,
  NOTIFY_MODES,
  PLACE_CATEGORIES,
  THEMES,
  type EventConfig,
  type EventLocale,
  type Guest,
  type NotifyMode,
} from '@/lib/platform/types'
import { LOCALE_OPTIONS } from '@/lib/platform/locales'
import { normalizeGuest } from '@/lib/platform/normalize'
import { eventPublicHostLabel } from '@/lib/platform/site-url'
import { reviewIssues } from '@/lib/platform/wizard'
import { GuestCsvImport } from '@/components/dashboard/GuestCsvImport'

function readFileAsDataUrl(file: File, tooBig: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 1_500_000) {
      reject(new Error(tooBig))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('upload'))
    reader.readAsDataURL(file)
  })
}

export type WizardStepFormHandle = {
  flushPending: () => void
}

export const WizardStepForm = forwardRef<
  WizardStepFormHandle,
  {
    step: string
    config: EventConfig
    guests: Guest[]
    onChange: (next: EventConfig) => void
    onGuests: (next: Guest[]) => void
  }
>(function WizardStepForm({ step, config, guests, onChange, onGuests }, ref) {
  const ui = wizardUi(config.locales.default)
  const set = (next: EventConfig) => onChange(next)
  const patch = (fn: (draft: EventConfig) => EventConfig) => onChange(applyGeneratedPatch(config, fn))
  const draftGuestForm = useRef<HTMLFormElement>(null)

  function commitDraftGuest(form: HTMLFormElement) {
    const data = new FormData(form)
    const familyName = String(data.get('familyName') || '').trim()
    if (!familyName) return
    onGuests([
      ...guests,
      normalizeGuest({
        familyName,
        email: String(data.get('email') || '').trim(),
        partySize: Number(data.get('partySize') || 1) || 1,
        status: 'pending',
        openRsvp: config.rsvp.openRsvpDefault,
        inviteLocale: config.locales.default,
      }),
    ])
    form.reset()
  }

  useImperativeHandle(ref, () => ({
    flushPending() {
      if (draftGuestForm.current) commitDraftGuest(draftGuestForm.current)
    },
  }))

  if (step === 'basics') {
    const wizardLocales = config.locales.enabled.length
      ? config.locales.enabled
      : LOCALE_OPTIONS.map((item) => item.value)
    return (
      <div className="space-y-5">
        <Field label={ui.language} hint={ui.languageHint}>
          <div className="grid grid-cols-2 gap-2">
            {LOCALE_OPTIONS.filter((option) => wizardLocales.includes(option.value)).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  patch((draft) => ({
                    ...draft,
                    locales: { ...draft.locales, default: option.value as EventLocale },
                  }))
                }
                className={`rounded-xl border px-3 py-3 text-start text-sm ${
                  config.locales.default === option.value
                    ? 'border-cyan-400 bg-cyan-400/10 text-cyan-100'
                    : 'border-white/15 bg-white/5 text-white/80'
                }`}
              >
                <span className="block font-medium">{option.label}</span>
                <span className="text-xs text-white/40">{option.hint}</span>
              </button>
            ))}
          </div>
        </Field>
        <Field label={ui.type}>
          <div className="grid grid-cols-2 gap-2">
            {EVENT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() =>
                  patch((draft) => ({
                    ...draft,
                    basics: { ...draft.basics, type },
                  }))
                }
                className={`rounded-xl border px-3 py-3 text-start text-sm ${
                  config.basics.type === type
                    ? 'border-cyan-400 bg-cyan-400/10 text-cyan-100'
                    : 'border-white/15 bg-[#12182a] text-white hover:border-white/30'
                }`}
              >
                {typeLabel(type, config.locales.default)}
              </button>
            ))}
          </div>
        </Field>
        <Field label={ui.honoree}>
          <TextInput
            value={config.basics.honoreeName}
            onChange={(e) =>
              patch((draft) => ({
                ...draft,
                basics: { ...draft.basics, honoreeName: e.target.value },
              }))
            }
            placeholder={ui.honoreePlaceholder}
          />
        </Field>
        <Field label={ui.family}>
          <TextInput
            value={config.basics.familyName}
            onChange={(e) =>
              patch((draft) => ({
                ...draft,
                basics: { ...draft.basics, familyName: e.target.value },
              }))
            }
          />
        </Field>
        <Field label={ui.date}>
          <DatePicker
            value={config.basics.date}
            locale={config.locales.default}
            placeholder={ui.pickDate}
            onChange={(iso) => set({ ...config, basics: { ...config.basics, date: iso } })}
          />
        </Field>
        <Field label={ui.time}>
          <TextInput
            value={config.basics.startTime}
            placeholder="10:00"
            onChange={(e) =>
              set({ ...config, basics: { ...config.basics, startTime: e.target.value } })
            }
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={ui.city}>
            <TextInput
              value={config.basics.city}
              onChange={(e) => set({ ...config, basics: { ...config.basics, city: e.target.value } })}
            />
          </Field>
          <Field label={ui.country}>
            <TextInput
              value={config.basics.country}
              onChange={(e) =>
                set({ ...config, basics: { ...config.basics, country: e.target.value } })
              }
            />
          </Field>
        </div>
      </div>
    )
  }

  if (step === 'branding') {
    return (
      <div className="space-y-4">
        <Field label={ui.theme}>
          <div className="grid grid-cols-2 gap-2">
            {THEMES.map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => set({ ...config, branding: { ...config.branding, theme } })}
                className={`rounded-xl border px-3 py-3 text-sm capitalize ${
                  config.branding.theme === theme
                    ? 'border-cyan-400 bg-cyan-400/10'
                    : 'border-white/15 bg-white/5'
                }`}
              >
                {theme}
              </button>
            ))}
          </div>
        </Field>
        <Field label={ui.accent}>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={config.branding.accentColor}
              onChange={(e) =>
                set({ ...config, branding: { ...config.branding, accentColor: e.target.value } })
              }
              className="h-10 w-14 cursor-pointer rounded-lg border border-white/15 bg-transparent"
            />
            <TextInput
              value={config.branding.accentColor}
              onChange={(e) =>
                set({ ...config, branding: { ...config.branding, accentColor: e.target.value } })
              }
            />
          </div>
        </Field>
      </div>
    )
  }

  if (step === 'story') {
    return (
      <div className="space-y-4">
        <Field label={ui.headline}>
          <TextInput
            value={config.story.headline}
            onChange={(e) => set({ ...config, story: { ...config.story, headline: e.target.value } })}
          />
        </Field>
        <Field label={ui.subtitle}>
          <TextInput
            value={config.story.subtitle}
            onChange={(e) => set({ ...config, story: { ...config.story, subtitle: e.target.value } })}
          />
        </Field>
        <Field label={ui.parentsMessage}>
          <TextArea
            value={config.story.parentsMessage}
            onChange={(e) =>
              set({ ...config, story: { ...config.story, parentsMessage: e.target.value } })
            }
          />
        </Field>
        <Field label={ui.about}>
          <TextArea
            value={config.story.about}
            onChange={(e) => set({ ...config, story: { ...config.story, about: e.target.value } })}
          />
        </Field>
        <Field label={ui.honoreeBio}>
          <TextArea
            value={config.story.honoreeBio}
            onChange={(e) =>
              set({ ...config, story: { ...config.story, honoreeBio: e.target.value } })
            }
          />
        </Field>
      </div>
    )
  }

  if (step === 'schedule') {
    const patchItem = (id: string, next: Partial<(typeof config.schedule.items)[number]>) =>
      set({
        ...config,
        schedule: {
          items: config.schedule.items.map((row) => (row.id === id ? { ...row, ...next } : row)),
        },
      })
    return (
      <div className="space-y-4">
        {config.schedule.items.map((item, index) => (
          <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between text-xs text-white/40">
              <span>
                {ui.moment} {index + 1}
              </span>
              <button
                type="button"
                className="text-rose-300"
                onClick={() =>
                  set({
                    ...config,
                    schedule: { items: config.schedule.items.filter((row) => row.id !== item.id) },
                  })
                }
              >
                {ui.remove}
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput
                placeholder={ui.title}
                value={item.title}
                onChange={(e) => patchItem(item.id, { title: e.target.value })}
              />
              <TextInput
                placeholder="Day label"
                value={item.dayLabel}
                onChange={(e) => patchItem(item.id, { dayLabel: e.target.value })}
              />
              <TextInput
                placeholder={ui.time}
                value={item.time}
                onChange={(e) => patchItem(item.id, { time: e.target.value })}
              />
              <TextInput
                placeholder="End time"
                value={item.timeEnd}
                onChange={(e) => patchItem(item.id, { timeEnd: e.target.value })}
              />
              <DatePicker
                value={item.date}
                locale={config.locales.default}
                placeholder={ui.pickDate}
                onChange={(iso) => patchItem(item.id, { date: iso })}
              />
              <TextInput
                placeholder={ui.place}
                value={item.place}
                onChange={(e) => patchItem(item.id, { place: e.target.value })}
              />
              <TextInput
                placeholder={ui.address}
                value={item.address}
                onChange={(e) => patchItem(item.id, { address: e.target.value })}
              />
              <TextInput
                placeholder={ui.mapUrl}
                value={item.mapUrl}
                onChange={(e) => patchItem(item.id, { mapUrl: e.target.value })}
              />
              <TextInput
                placeholder="Dress code"
                value={item.dressCode}
                onChange={(e) => patchItem(item.id, { dressCode: e.target.value })}
              />
              <TextInput
                placeholder={ui.notes}
                value={item.notes}
                onChange={(e) => patchItem(item.id, { notes: e.target.value })}
              />
              <select
                value={item.visibility}
                onChange={(e) =>
                  patchItem(item.id, {
                    visibility: e.target.value === 'invite' ? 'invite' : 'public',
                  })
                }
                className="w-full rounded-xl border border-white/15 bg-[#12182a] px-3 py-2.5 text-sm"
              >
                <option value="public">Public</option>
                <option value="invite">Invite only</option>
              </select>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="rounded-full border border-white/20 px-4 py-2 text-sm"
          onClick={() =>
            set({
              ...config,
              schedule: {
                items: [
                  ...config.schedule.items,
                  {
                    id: uid(),
                    title: '',
                    time: '',
                    timeEnd: '',
                    date: '',
                    place: '',
                    address: '',
                    mapUrl: '',
                    dressCode: '',
                    notes: '',
                    dayLabel: '',
                    visibility: 'public',
                  },
                ],
              },
            })
          }
        >
          {ui.addMoment}
        </button>
      </div>
    )
  }

  if (step === 'venues') {
    const patchHotel = (id: string, next: Partial<(typeof config.venues.hotels)[number]>) =>
      set({
        ...config,
        venues: {
          ...config.venues,
          hotels: config.venues.hotels.map((row) => (row.id === id ? { ...row, ...next } : row)),
        },
      })
    return (
      <div className="space-y-4">
        <Field label="Dress code">
          <TextInput
            value={config.venues.dressCode}
            onChange={(e) =>
              set({ ...config, venues: { ...config.venues, dressCode: e.target.value } })
            }
          />
        </Field>
        <Field label={ui.parking}>
          <TextInput
            value={config.venues.parking}
            onChange={(e) =>
              set({ ...config, venues: { ...config.venues, parking: e.target.value } })
            }
          />
        </Field>
        {config.venues.hotels.map((hotel) => (
          <div key={hotel.id} className="space-y-2 rounded-2xl border border-white/10 p-4">
            <TextInput
              placeholder={ui.hotels}
              value={hotel.name}
              onChange={(e) => patchHotel(hotel.id, { name: e.target.value })}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <TextInput
                placeholder={ui.walking}
                value={hotel.walking}
                onChange={(e) => patchHotel(hotel.id, { walking: e.target.value })}
              />
              <TextInput
                placeholder="URL"
                value={hotel.url}
                onChange={(e) => patchHotel(hotel.id, { url: e.target.value })}
              />
              <TextInput
                placeholder="Photo URL"
                value={hotel.photoUrl}
                onChange={(e) => patchHotel(hotel.id, { photoUrl: e.target.value })}
              />
              <TextInput
                placeholder="Book URL"
                value={hotel.bookUrl}
                onChange={(e) => patchHotel(hotel.id, { bookUrl: e.target.value })}
              />
              <TextInput
                placeholder={ui.mapUrl}
                value={hotel.mapUrl}
                onChange={(e) => patchHotel(hotel.id, { mapUrl: e.target.value })}
              />
              <TextInput
                type="number"
                min={0}
                max={5}
                placeholder="Stars"
                value={hotel.stars || ''}
                onChange={(e) =>
                  patchHotel(hotel.id, { stars: Math.max(0, Math.min(5, Number(e.target.value) || 0)) })
                }
              />
            </div>
            <TextInput
              placeholder={ui.notes}
              value={hotel.notes}
              onChange={(e) => patchHotel(hotel.id, { notes: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hotel.featured}
                onChange={(e) => patchHotel(hotel.id, { featured: e.target.checked })}
              />
              Featured
            </label>
          </div>
        ))}
        <button
          type="button"
          className="rounded-full border border-white/20 px-4 py-2 text-sm"
          onClick={() =>
            set({
              ...config,
              venues: {
                ...config.venues,
                hotels: [
                  ...config.venues.hotels,
                  {
                    id: uid(),
                    name: '',
                    url: '',
                    notes: '',
                    walking: '',
                    mapUrl: '',
                    photoUrl: '',
                    stars: 0,
                    featured: false,
                    bookUrl: '',
                  },
                ],
              },
            })
          }
        >
          {ui.addHotel}
        </button>
      </div>
    )
  }

  if (step === 'places') {
    const patchPlace = (id: string, next: Partial<(typeof config.places)[number]>) =>
      set({
        ...config,
        places: config.places.map((row) => (row.id === id ? { ...row, ...next } : row)),
      })
    return (
      <div className="space-y-4">
        {config.places.map((item) => (
          <div key={item.id} className="space-y-2 rounded-2xl border border-white/10 p-4">
            <TextInput
              placeholder={ui.place}
              value={item.name}
              onChange={(e) => patchPlace(item.id, { name: e.target.value })}
            />
            <select
              value={item.category}
              onChange={(e) =>
                patchPlace(item.id, {
                  category: e.target.value as (typeof PLACE_CATEGORIES)[number],
                })
              }
              className="w-full rounded-xl border border-white/15 bg-[#12182a] px-3 py-2.5 text-sm"
            >
              {PLACE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <TextInput
              placeholder="Photo URL"
              value={item.photoUrl}
              onChange={(e) => patchPlace(item.id, { photoUrl: e.target.value })}
            />
            <TextInput
              placeholder="URL"
              value={item.url}
              onChange={(e) => patchPlace(item.id, { url: e.target.value })}
            />
            <TextInput
              placeholder={ui.mapUrl}
              value={item.mapUrl}
              onChange={(e) => patchPlace(item.id, { mapUrl: e.target.value })}
            />
            <TextInput
              placeholder={ui.notes}
              value={item.notes}
              onChange={(e) => patchPlace(item.id, { notes: e.target.value })}
            />
          </div>
        ))}
        <button
          type="button"
          className="rounded-full border border-white/20 px-4 py-2 text-sm"
          onClick={() =>
            set({
              ...config,
              places: [
                ...config.places,
                {
                  id: uid(),
                  name: '',
                  category: 'restaurant',
                  url: '',
                  mapUrl: '',
                  notes: '',
                  photoUrl: '',
                },
              ],
            })
          }
        >
          {ui.addPlace}
        </button>
      </div>
    )
  }

  if (step === 'contact') {
    const patchPerson = (
      id: string,
      next: Partial<(typeof config.contact.people)[number]>,
    ) =>
      set({
        ...config,
        contact: {
          ...config.contact,
          people: config.contact.people.map((row) => (row.id === id ? { ...row, ...next } : row)),
        },
      })
    return (
      <div className="space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.contact.formEnabled}
            onChange={(e) =>
              set({ ...config, contact: { ...config.contact, formEnabled: e.target.checked } })
            }
          />
          Enable contact form on site
        </label>
        <Field label="Legacy phone">
          <TextInput
            value={config.contact.phone}
            onChange={(e) => set({ ...config, contact: { ...config.contact, phone: e.target.value } })}
          />
        </Field>
        <Field label="Legacy email">
          <TextInput
            value={config.contact.email}
            onChange={(e) => set({ ...config, contact: { ...config.contact, email: e.target.value } })}
          />
        </Field>
        <Field label="Legacy WhatsApp">
          <TextInput
            value={config.contact.whatsapp}
            onChange={(e) =>
              set({ ...config, contact: { ...config.contact, whatsapp: e.target.value } })
            }
          />
        </Field>
        {config.contact.people.map((person) => (
          <div key={person.id} className="space-y-2 rounded-2xl border border-white/10 p-4">
            <TextInput
              placeholder="Name"
              value={person.name}
              onChange={(e) => patchPerson(person.id, { name: e.target.value })}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <TextInput
                placeholder="Phone"
                value={person.phone}
                onChange={(e) => patchPerson(person.id, { phone: e.target.value })}
              />
              <TextInput
                placeholder="Email"
                value={person.email}
                onChange={(e) => patchPerson(person.id, { email: e.target.value })}
              />
              <TextInput
                placeholder="WhatsApp"
                value={person.whatsapp}
                onChange={(e) => patchPerson(person.id, { whatsapp: e.target.value })}
              />
              <TextInput
                placeholder="WhatsApp label"
                value={person.whatsappLabel}
                onChange={(e) => patchPerson(person.id, { whatsappLabel: e.target.value })}
              />
            </div>
            <button
              type="button"
              className="text-sm text-rose-300"
              onClick={() =>
                set({
                  ...config,
                  contact: {
                    ...config.contact,
                    people: config.contact.people.filter((row) => row.id !== person.id),
                  },
                })
              }
            >
              {ui.remove}
            </button>
          </div>
        ))}
        <button
          type="button"
          className="rounded-full border border-white/20 px-4 py-2 text-sm"
          onClick={() =>
            set({
              ...config,
              contact: {
                ...config.contact,
                people: [
                  ...config.contact.people,
                  { id: uid(), name: '', phone: '', email: '', whatsapp: '', whatsappLabel: '' },
                ],
              },
            })
          }
        >
          + Contact person
        </button>
        <Field label="Travel">
          <label className="mb-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.travel.enabled}
              onChange={(e) =>
                set({ ...config, travel: { ...config.travel, enabled: e.target.checked } })
              }
            />
            Show travel section
          </label>
          <TextArea
            placeholder="Airports"
            value={config.travel.airports}
            onChange={(e) =>
              set({ ...config, travel: { ...config.travel, airports: e.target.value } })
            }
          />
          <TextInput
            className="mt-2"
            placeholder="Currency"
            value={config.travel.currency}
            onChange={(e) =>
              set({ ...config, travel: { ...config.travel, currency: e.target.value } })
            }
          />
          <TextArea
            className="mt-2"
            placeholder="Transport"
            value={config.travel.transport}
            onChange={(e) =>
              set({ ...config, travel: { ...config.travel, transport: e.target.value } })
            }
          />
          <TextInput
            className="mt-2"
            placeholder="Emergency"
            value={config.travel.emergency}
            onChange={(e) =>
              set({ ...config, travel: { ...config.travel, emergency: e.target.value } })
            }
          />
        </Field>
      </div>
    )
  }

  if (step === 'media') {
    return (
      <div className="space-y-4">
        <Field label={ui.heroUrl}>
          <TextInput
            value={config.media.heroUrl}
            onChange={(e) => set({ ...config, media: { ...config.media, heroUrl: e.target.value } })}
            placeholder="https://…"
          />
        </Field>
        <Field label={ui.heroUpload}>
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                const url = await readFileAsDataUrl(file, ui.imageTooBig)
                set({ ...config, media: { ...config.media, heroUrl: url } })
              } catch (err) {
                alert(err instanceof Error ? err.message : ui.uploadFail)
              }
            }}
          />
        </Field>
        <Field label={ui.gallery}>
          <TextArea
            value={config.media.gallery.join('\n')}
            onChange={(e) => {
              const urls = e.target.value.split('\n').map((line) => line.trim()).filter(Boolean)
              set({
                ...config,
                media: {
                  ...config.media,
                  gallery: urls,
                  galleryItems: urls.map((url, i) => ({
                    id: config.media.galleryItems[i]?.id || uid(),
                    url,
                    type: 'image' as const,
                    caption: config.media.galleryItems[i]?.caption || '',
                    approved: true,
                    showOnSite: true,
                    sortOrder: i,
                  })),
                },
              })
            }}
          />
        </Field>
        <Field label="Ambient audio URL">
          <TextInput
            value={config.media.ambientAudioUrl}
            placeholder="https://…/ambient.mp3"
            onChange={(e) =>
              set({ ...config, media: { ...config.media, ambientAudioUrl: e.target.value } })
            }
          />
        </Field>
      </div>
    )
  }

  if (step === 'saveTheDate') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-white/50">{ui.stdEmailHint}</p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.saveTheDate.enabled}
            onChange={(e) =>
              set({ ...config, saveTheDate: { ...config.saveTheDate, enabled: e.target.checked } })
            }
          />
          {ui.showStd}
        </label>
        <Field label={ui.message}>
          <TextArea
            value={config.saveTheDate.message}
            onChange={(e) =>
              set({ ...config, saveTheDate: { ...config.saveTheDate, message: e.target.value } })
            }
          />
        </Field>
        <Field label={ui.envelopeLabel}>
          <TextInput
            value={config.saveTheDate.envelopeLabel}
            onChange={(e) =>
              set({
                ...config,
                saveTheDate: { ...config.saveTheDate, envelopeLabel: e.target.value },
              })
            }
          />
        </Field>
      </div>
    )
  }

  if (step === 'invitation') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-white/50">{ui.inviteEmailHint}</p>
        <Field label={ui.greeting}>
          <TextInput
            value={config.invitation.greeting}
            onChange={(e) =>
              set({ ...config, invitation: { ...config.invitation, greeting: e.target.value } })
            }
          />
        </Field>
        <Field label={ui.inviteBody}>
          <TextArea
            value={config.invitation.body}
            onChange={(e) =>
              set({ ...config, invitation: { ...config.invitation, body: e.target.value } })
            }
          />
        </Field>
        <Field label={ui.hostLine}>
          <TextInput
            value={config.invitation.hostLine}
            onChange={(e) =>
              set({ ...config, invitation: { ...config.invitation, hostLine: e.target.value } })
            }
          />
        </Field>
        <Field label={ui.seal} hint={ui.sealHint}>
          {config.invitation.sealImageUrl ? (
            <div className="mb-3 flex items-center gap-3">
              <img
                src={config.invitation.sealImageUrl}
                alt=""
                className="h-16 w-16 rounded-full border border-white/20 bg-white object-contain p-1"
              />
              <button
                type="button"
                className="text-sm text-rose-200 hover:text-rose-100"
                onClick={() =>
                  set({ ...config, invitation: { ...config.invitation, sealImageUrl: '' } })
                }
              >
                {ui.remove}
              </button>
            </div>
          ) : null}
          <label className="mb-3 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 px-4 py-3 text-sm text-white/80 hover:border-cyan-400/50">
            {ui.sealUpload}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                try {
                  const url = await readFileAsDataUrl(file, ui.imageTooBig)
                  set({ ...config, invitation: { ...config.invitation, sealImageUrl: url } })
                } catch (err) {
                  alert(err instanceof Error ? err.message : ui.uploadFail)
                }
              }}
            />
          </label>
          <TextInput
            value={config.invitation.sealLabel}
            onChange={(e) =>
              set({ ...config, invitation: { ...config.invitation, sealLabel: e.target.value } })
            }
          />
        </Field>
      </div>
    )
  }

  if (step === 'rsvp') {
    return (
      <div className="space-y-4">
        <Field label={ui.deadline}>
          <DatePicker
            value={config.rsvp.deadline}
            locale={config.locales.default}
            placeholder={ui.pickDate}
            onChange={(iso) => set({ ...config, rsvp: { ...config.rsvp, deadline: iso } })}
          />
        </Field>
        <Field label={ui.meals}>
          <TextArea
            value={config.rsvp.meals.join('\n')}
            onChange={(e) =>
              set({
                ...config,
                rsvp: {
                  ...config.rsvp,
                  meals: e.target.value.split('\n').map((line) => line.trim()).filter(Boolean),
                },
              })
            }
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.rsvp.allowPlusOne}
            onChange={(e) =>
              set({ ...config, rsvp: { ...config.rsvp, allowPlusOne: e.target.checked } })
            }
          />
          {ui.plusOne}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.rsvp.collectDietary}
            onChange={(e) =>
              set({ ...config, rsvp: { ...config.rsvp, collectDietary: e.target.checked } })
            }
          />
          {ui.dietary}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.rsvp.collectMeal}
            onChange={(e) =>
              set({ ...config, rsvp: { ...config.rsvp, collectMeal: e.target.checked } })
            }
          />
          Collect meal choice
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.rsvp.publicFormEnabled}
            onChange={(e) =>
              set({ ...config, rsvp: { ...config.rsvp, publicFormEnabled: e.target.checked } })
            }
          />
          Public RSVP form on site
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.rsvp.openRsvpDefault}
            onChange={(e) =>
              set({ ...config, rsvp: { ...config.rsvp, openRsvpDefault: e.target.checked } })
            }
          />
          Open RSVP by default for new guests
        </label>
        <Field label="Notify mode">
          <select
            value={config.rsvp.notifyMode}
            onChange={(e) =>
              set({
                ...config,
                rsvp: { ...config.rsvp, notifyMode: e.target.value as NotifyMode },
              })
            }
            className="w-full rounded-xl border border-white/15 bg-[#12182a] px-3 py-2.5 text-sm"
          >
            {NOTIFY_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Notify emails (one per line)">
          <TextArea
            value={config.rsvp.notifyEmails.join('\n')}
            onChange={(e) =>
              set({
                ...config,
                rsvp: {
                  ...config.rsvp,
                  notifyEmails: e.target.value
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean),
                },
              })
            }
          />
        </Field>
        <Field label={ui.rsvpNotes}>
          <TextArea
            value={config.rsvp.notes}
            onChange={(e) => set({ ...config, rsvp: { ...config.rsvp, notes: e.target.value } })}
          />
        </Field>
      </div>
    )
  }

  if (step === 'faq') {
    return (
      <div className="space-y-4">
        {config.faq.items.map((item) => (
          <div key={item.id} className="space-y-2 rounded-2xl border border-white/10 p-4">
            <TextInput
              placeholder={ui.question}
              value={item.question}
              onChange={(e) =>
                set({
                  ...config,
                  faq: {
                    items: config.faq.items.map((row) =>
                      row.id === item.id ? { ...row, question: e.target.value } : row,
                    ),
                  },
                })
              }
            />
            <TextArea
              placeholder={ui.answer}
              value={item.answer}
              onChange={(e) =>
                set({
                  ...config,
                  faq: {
                    items: config.faq.items.map((row) =>
                      row.id === item.id ? { ...row, answer: e.target.value } : row,
                    ),
                  },
                })
              }
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={item.published !== false}
                onChange={(e) =>
                  set({
                    ...config,
                    faq: {
                      items: config.faq.items.map((row) =>
                        row.id === item.id ? { ...row, published: e.target.checked } : row,
                      ),
                    },
                  })
                }
              />
              Published
            </label>
          </div>
        ))}
        <button
          type="button"
          className="rounded-full border border-white/20 px-4 py-2 text-sm"
          onClick={() =>
            set({
              ...config,
              faq: {
                items: [
                  ...config.faq.items,
                  { id: uid(), question: '', answer: '', published: true },
                ],
              },
            })
          }
        >
          {ui.addQuestion}
        </button>
      </div>
    )
  }

  if (step === 'reminders') {
    return (
      <div className="space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.reminders.enabled}
            onChange={(e) =>
              set({ ...config, reminders: { ...config.reminders, enabled: e.target.checked } })
            }
          />
          Enable reminder emails
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.reminders.d30}
            onChange={(e) =>
              set({ ...config, reminders: { ...config.reminders, d30: e.target.checked } })
            }
          />
          30 days before
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.reminders.d7}
            onChange={(e) =>
              set({ ...config, reminders: { ...config.reminders, d7: e.target.checked } })
            }
          />
          7 days before
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.reminders.d2}
            onChange={(e) =>
              set({ ...config, reminders: { ...config.reminders, d2: e.target.checked } })
            }
          />
          2 days before
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.reminders.onlyConfirmedForD7D2}
            onChange={(e) =>
              set({
                ...config,
                reminders: { ...config.reminders, onlyConfirmedForD7D2: e.target.checked },
              })
            }
          />
          Only confirmed guests for D-7 / D-2
        </label>
        <Field label={ui.message}>
          <TextArea
            value={config.reminders.message}
            onChange={(e) =>
              set({ ...config, reminders: { ...config.reminders, message: e.target.value } })
            }
          />
        </Field>
      </div>
    )
  }

  if (step === 'legal') {
    return (
      <div className="space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.legal.comingSoon}
            onChange={(e) =>
              set({ ...config, legal: { ...config.legal, comingSoon: e.target.checked } })
            }
          />
          Coming soon mode
        </label>
        <Field label="Privacy HTML">
          <TextArea
            value={config.legal.privacyHtml}
            onChange={(e) =>
              set({ ...config, legal: { ...config.legal, privacyHtml: e.target.value } })
            }
          />
        </Field>
        <Field label="Terms HTML">
          <TextArea
            value={config.legal.termsHtml}
            onChange={(e) =>
              set({ ...config, legal: { ...config.legal, termsHtml: e.target.value } })
            }
          />
        </Field>
      </div>
    )
  }

  if (step === 'guestsBootstrap') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-white/50">{ui.guestsHint}</p>
        <GuestCsvImport
          onImported={(rows) => {
            if (!rows.length) return
            onGuests([...guests, ...rows])
          }}
        />
        {guests.map((guest) => (
          <div key={guest.id} className="grid gap-2 rounded-2xl border border-white/10 p-3 sm:grid-cols-2">
            <TextInput value={guest.familyName} readOnly />
            <TextInput value={guest.email} readOnly />
          </div>
        ))}
        <form
          ref={draftGuestForm}
          className="space-y-2 rounded-2xl border border-dashed border-white/20 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            commitDraftGuest(e.currentTarget)
          }}
        >
          <TextInput name="familyName" placeholder={ui.family} required />
          <TextInput name="email" type="email" placeholder="Email" />
          <TextInput name="partySize" type="number" min={1} defaultValue={1} />
          <button type="submit" className="rounded-full bg-white/10 px-4 py-2 text-sm">
            {ui.addGuest}
          </button>
        </form>
      </div>
    )
  }

  if (step === 'domain') {
    return (
      <div className="space-y-4">
        <Field label={ui.slug} hint={ui.slugHint}>
          <TextInput
            value={config.domain.slug}
            onChange={(e) =>
              set({
                ...config,
                domain: {
                  ...config.domain,
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                },
              })
            }
          />
          {config.domain.slug ? (
            <p className="mt-2 text-sm text-cyan-200/80">{eventPublicHostLabel(config.domain.slug)}</p>
          ) : null}
        </Field>
        <p className="text-xs text-white/40">{ui.mailHint}</p>
        <Field label={ui.seoTitle}>
          <TextInput
            value={config.domain.seoTitle}
            onChange={(e) =>
              set({ ...config, domain: { ...config.domain, seoTitle: e.target.value } })
            }
          />
        </Field>
        <Field label={ui.seoDescription}>
          <TextArea
            value={config.domain.seoDescription}
            onChange={(e) =>
              set({ ...config, domain: { ...config.domain, seoDescription: e.target.value } })
            }
          />
        </Field>
        <Field
          label="Domínio próprio (Signature)"
          hint="CNAME para cname.vercel-dns.com. Verifique no dashboard do evento."
        >
          <TextInput
            value={config.domain.customHost}
            placeholder="www.familia.com"
            onChange={(e) =>
              set({
                ...config,
                domain: {
                  ...config.domain,
                  customHost: e.target.value.toLowerCase().trim(),
                  customHostStatus:
                    config.domain.customHostStatus === 'verified'
                      ? 'pending'
                      : config.domain.customHostStatus,
                },
              })
            }
          />
        </Field>
      </div>
    )
  }

  const issues = reviewIssues(config)
  return (
    <div className="space-y-4">
      {issues.length === 0 ? (
        <p className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
          {ui.reviewReady}
        </p>
      ) : (
        <ul className="space-y-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
          {issues.map((issue) => (
            <li key={issue.message}>
              {ui.missing}: {issue.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
})
