'use client'

import { Field, TextArea, TextInput } from '@/components/wizard/fields'
import { uploadStudioImageFile } from '@/lib/platform/studio-image-upload'
import { fillTemplate, studioUi, type CardDesignUi } from '@/lib/platform/studio-ui'
import type { CardDesign, EventLocale } from '@/lib/platform/types'

const COLOR_KEYS = [
  'pageColor',
  'envelopeColor',
  'envelopeLiner',
  'envelopeExterior',
  'envelopeNameColor',
  'sealBg',
  'cardColor',
  'cardTextColor',
  'ctaRsvpColor',
  'greetingColor',
  'nameColor',
  'bodyColor',
  'introColor',
  'headingColor',
] as const

const TEXT_KEYS: { key: keyof CardDesign; placeholder?: string }[] = [
  { key: 'sealLabel' },
  { key: 'mapUrl', placeholder: 'https://maps…' },
  { key: 'openLabel' },
  { key: 'forLabel' },
  { key: 'title' },
  { key: 'eventName' },
  { key: 'heading' },
  { key: 'hosts' },
  { key: 'greeting' },
  { key: 'dateLabel' },
  { key: 'timeLabel' },
  { key: 'placeLabel' },
  { key: 'cityLabel' },
  { key: 'address1' },
  { key: 'address2' },
  { key: 'subject' },
  { key: 'ctaView' },
  { key: 'ctaCalendar' },
  { key: 'ctaMap' },
  { key: 'ctaRsvp' },
  { key: 'rsvpLabel' },
  { key: 'rsvpHint' },
  { key: 'suggestedPalette' },
]

const IMAGE_KEYS: { key: keyof CardDesign; placeholder?: string }[] = [
  { key: 'pageTexture', placeholder: 'https://…/texture.png' },
  { key: 'envelopeTexture', placeholder: 'https://…' },
  { key: 'sealUrl', placeholder: 'https://…' },
  { key: 'cardImageUrl', placeholder: 'https://…' },
  { key: 'panelPhotoUrl', placeholder: 'https://…' },
]

function parseFocal(value: string | undefined): { x: number; y: number } {
  const raw = (value || 'center').trim().toLowerCase()
  if (!raw || raw === 'center') return { x: 50, y: 50 }
  const match = raw.match(/^(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/)
  if (!match) return { x: 50, y: 50 }
  return {
    x: Math.max(0, Math.min(100, Number(match[1]))),
    y: Math.max(0, Math.min(100, Number(match[2]))),
  }
}

function formatFocal(x: number, y: number): string {
  return `${Math.round(x)}% ${Math.round(y)}%`
}

function PositionSliders({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (next: string) => void
}) {
  const focal = parseFocal(value)
  return (
    <Field label={label}>
      <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
        <label className="block text-xs text-white/50">
          X {Math.round(focal.x)}%
          <input
            type="range"
            min={0}
            max={100}
            value={focal.x}
            onChange={(e) => onChange(formatFocal(Number(e.target.value), focal.y))}
            className="mt-1 w-full"
          />
        </label>
        <label className="block text-xs text-white/50">
          Y {Math.round(focal.y)}%
          <input
            type="range"
            min={0}
            max={100}
            value={focal.y}
            onChange={(e) => onChange(formatFocal(focal.x, Number(e.target.value)))}
            className="mt-1 w-full"
          />
        </label>
        <button
          type="button"
          className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/70 hover:border-cyan-400/50"
          onClick={() => onChange('center')}
        >
          center
        </button>
      </div>
    </Field>
  )
}

function ImageUrlField({
  label,
  value,
  onChange,
  placeholder,
  eventId,
  kind,
  ui,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
  eventId?: string
  kind: string
  ui: CardDesignUi
}) {
  return (
    <Field label={label}>
      {value ? (
        <div className="mb-2 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="h-14 w-14 rounded-lg border border-white/20 bg-white/10 object-cover"
          />
          <button
            type="button"
            className="text-sm text-rose-200 hover:text-rose-100"
            onClick={() => onChange('')}
          >
            {ui.remove}
          </button>
        </div>
      ) : null}
      <TextInput
        value={value.startsWith('data:') ? '' : value}
        placeholder={placeholder || 'https://…'}
        onChange={(e) => onChange(e.target.value)}
      />
      <label className="mt-2 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 px-3 py-2 text-sm text-white/70 hover:border-cyan-400/50">
        {ui.importImage}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            if (!eventId) {
              alert(ui.saveBeforeUpload)
              return
            }
            try {
              onChange(await uploadStudioImageFile({ eventId, file, kind }))
            } catch (err) {
              alert(err instanceof Error ? err.message : ui.uploadFail)
            }
          }}
        />
      </label>
    </Field>
  )
}

export function CardDesignFields({
  design,
  onChange,
  eventId,
  locale = 'en',
  subjectPlaceholder,
}: {
  design: CardDesign
  /** Merge a partial into the latest design (parent should use a functional state update). */
  onChange: (patch: Partial<CardDesign>) => void
  eventId?: string
  locale?: EventLocale
  /** Shown only when Subject (email) is blank — never written into the field. */
  subjectPlaceholder?: string
}) {
  const ui = studioUi(locale).card
  const patch = (partial: Partial<CardDesign>) => onChange(partial)

  return (
    <details className="rounded-2xl border border-white/10 bg-white/5 p-4" open>
      <summary className="cursor-pointer select-none text-sm font-medium text-white/80">
        {fillTemplate(ui.summary, { n: Object.keys(design).length })}
      </summary>
      <div className="mt-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {COLOR_KEYS.map((key) => (
            <Field key={key} label={ui.colors[key] || key}>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={String(design[key] || '#000000').slice(0, 7)}
                  onChange={(e) => patch({ [key]: e.target.value })}
                  className="h-10 w-12 cursor-pointer rounded-lg border border-white/15 bg-transparent"
                />
                <TextInput
                  value={String(design[key] || '')}
                  onChange={(e) => patch({ [key]: e.target.value })}
                />
              </div>
            </Field>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {IMAGE_KEYS.map(({ key, placeholder }) => (
            <ImageUrlField
              key={key}
              label={ui.images[String(key)] || String(key)}
              placeholder={placeholder}
              value={String(design[key] || '')}
              onChange={(next) => patch({ [key]: next })}
              eventId={eventId}
              kind={String(key)}
              ui={ui}
            />
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={ui.photoShape}>
            <select
              value={design.panelPhotoShape || 'circle'}
              onChange={(e) =>
                patch({
                  panelPhotoShape: e.target.value === 'rectangle' ? 'rectangle' : 'circle',
                })
              }
              className="w-full rounded-xl border border-white/15 bg-[#12182a] px-3 py-2.5 text-sm"
            >
              <option value="circle">{ui.circle}</option>
              <option value="rectangle">{ui.rectangle}</option>
            </select>
          </Field>
          <Field label={ui.fontKey}>
            <TextInput
              value={design.fontKey}
              placeholder="georgia | playfair | cormorant | lato | montserrat"
              onChange={(e) => patch({ fontKey: e.target.value })}
            />
          </Field>
          <PositionSliders
            label={ui.panelPhotoPosition}
            value={design.panelPhotoPosition || 'center'}
            onChange={(panelPhotoPosition) => patch({ panelPhotoPosition })}
          />
          <PositionSliders
            label={ui.cardImagePosition}
            value={design.cardImagePosition || 'center'}
            onChange={(cardImagePosition) => patch({ cardImagePosition })}
          />
          <Field label={ui.introSize}>
            <TextInput
              type="number"
              min={10}
              max={28}
              value={design.introSizePx || 14}
              onChange={(e) =>
                patch({ introSizePx: Math.max(10, Math.min(28, Number(e.target.value) || 14)) })
              }
            />
          </Field>
          <Field label={ui.headingSize}>
            <TextInput
              type="number"
              min={14}
              max={48}
              value={design.headingSizePx || 28}
              onChange={(e) =>
                patch({ headingSizePx: Math.max(14, Math.min(48, Number(e.target.value) || 28)) })
              }
            />
          </Field>
          <Field label={ui.bodySize}>
            <TextInput
              type="number"
              min={10}
              max={32}
              value={design.bodySizePx || 16}
              onChange={(e) =>
                patch({ bodySizePx: Math.max(10, Math.min(32, Number(e.target.value) || 16)) })
              }
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(design.introBold)}
              onChange={(e) => patch({ introBold: e.target.checked })}
            />
            {ui.introBold}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={design.introItalic !== false}
              onChange={(e) => patch({ introItalic: e.target.checked })}
            />
            {ui.introItalic}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(design.headingBold)}
              onChange={(e) => patch({ headingBold: e.target.checked })}
            />
            {ui.headingBold}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(design.headingItalic)}
              onChange={(e) => patch({ headingItalic: e.target.checked })}
            />
            {ui.headingItalic}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(design.bodyBold)}
              onChange={(e) => patch({ bodyBold: e.target.checked })}
            />
            {ui.bodyBold}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(design.bodyItalic)}
              onChange={(e) => patch({ bodyItalic: e.target.checked })}
            />
            {ui.bodyItalic}
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {TEXT_KEYS.map(({ key, placeholder }) => (
            <Field
              key={key}
              label={ui.texts[String(key)] || String(key)}
              hint={key === 'subject' ? ui.subjectHint : undefined}
            >
              <TextInput
                value={String(design[key] || '')}
                placeholder={
                  key === 'subject' ? subjectPlaceholder || placeholder : placeholder
                }
                onChange={(e) => patch({ [key]: e.target.value })}
              />
            </Field>
          ))}
        </div>

        <Field label={ui.cardMessage}>
          <TextArea value={design.message} onChange={(e) => patch({ message: e.target.value })} />
        </Field>
        <Field label={ui.intro}>
          <TextArea value={design.intro} onChange={(e) => patch({ intro: e.target.value })} />
        </Field>
        <Field label={ui.tip}>
          <TextArea value={design.tip} onChange={(e) => patch({ tip: e.target.value })} />
        </Field>
      </div>
    </details>
  )
}
