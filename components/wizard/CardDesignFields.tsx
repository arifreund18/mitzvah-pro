'use client'

import { Field, TextArea, TextInput } from '@/components/wizard/fields'
import { uploadStudioImageFile } from '@/lib/platform/studio-image-upload'
import type { CardDesign } from '@/lib/platform/types'

const COLOR_FIELDS: { key: keyof CardDesign; label: string }[] = [
  { key: 'pageColor', label: 'Cor da página' },
  { key: 'envelopeColor', label: 'Cor do envelope' },
  { key: 'envelopeLiner', label: 'Forro do envelope' },
  { key: 'envelopeExterior', label: 'Exterior do envelope' },
  { key: 'envelopeNameColor', label: 'Nome no envelope' },
  { key: 'sealBg', label: 'Fundo do selo' },
  { key: 'cardColor', label: 'Cor do cartão' },
  { key: 'cardTextColor', label: 'Texto do cartão' },
  { key: 'ctaRsvpColor', label: 'Texto do RSVP' },
  { key: 'greetingColor', label: 'Cor da saudação' },
  { key: 'nameColor', label: 'Cor do nome' },
  { key: 'bodyColor', label: 'Cor do corpo' },
  { key: 'introColor', label: 'Cor da intro' },
  { key: 'headingColor', label: 'Cor do heading' },
]

const TEXT_FIELDS: { key: keyof CardDesign; label: string; placeholder?: string }[] = [
  { key: 'sealLabel', label: 'Rótulo do selo' },
  { key: 'mapUrl', label: 'Map URL', placeholder: 'https://maps…' },
  { key: 'openLabel', label: 'Rótulo abrir envelope' },
  { key: 'forLabel', label: 'Rótulo "para:"' },
  { key: 'title', label: 'Título no cartão' },
  { key: 'eventName', label: 'Nome do evento no cartão' },
  { key: 'heading', label: 'Heading' },
  { key: 'hosts', label: 'Anfitriões' },
  { key: 'greeting', label: 'Saudação' },
  { key: 'dateLabel', label: 'Rótulo data' },
  { key: 'timeLabel', label: 'Rótulo horário' },
  { key: 'placeLabel', label: 'Rótulo local' },
  { key: 'cityLabel', label: 'Rótulo cidade' },
  { key: 'address1', label: 'Endereço linha 1' },
  { key: 'address2', label: 'Endereço linha 2' },
  { key: 'subject', label: 'Assunto (email)' },
  { key: 'ctaView', label: 'CTA ver' },
  { key: 'ctaCalendar', label: 'CTA calendário' },
  { key: 'ctaMap', label: 'CTA mapa' },
  { key: 'ctaRsvp', label: 'CTA RSVP' },
  { key: 'rsvpLabel', label: 'Rótulo RSVP' },
  { key: 'rsvpHint', label: 'Dica RSVP' },
  { key: 'suggestedPalette', label: 'Paleta sugerida (hex, vírgula)' },
]

const IMAGE_FIELDS: { key: keyof CardDesign; label: string; placeholder?: string }[] = [
  { key: 'pageTexture', label: 'Textura da página', placeholder: 'https://…/texture.png' },
  { key: 'envelopeTexture', label: 'Textura do envelope', placeholder: 'https://…' },
  { key: 'sealUrl', label: 'Selo / logo', placeholder: 'https://…' },
  { key: 'cardImageUrl', label: 'Imagem de fundo do cartão', placeholder: 'https://…' },
  { key: 'panelPhotoUrl', label: 'Foto do painel', placeholder: 'https://…' },
]

function parseFocal(value: string | undefined): { x: number; y: number } {
  const raw = (value || 'center').trim().toLowerCase()
  if (!raw || raw === 'center') return { x: 50, y: 50 }
  if (raw === 'top') return { x: 50, y: 0 }
  if (raw === 'bottom') return { x: 50, y: 100 }
  if (raw === 'left') return { x: 0, y: 50 }
  if (raw === 'right') return { x: 100, y: 50 }
  const parts = raw.split(/\s+/)
  const x = Number.parseFloat(parts[0] || '')
  const y = Number.parseFloat(parts[1] || parts[0] || '')
  return {
    x: Number.isFinite(x) ? Math.max(0, Math.min(100, x)) : 50,
    y: Number.isFinite(y) ? Math.max(0, Math.min(100, y)) : 50,
  }
}

function formatFocal(x: number, y: number): string {
  if (x === 50 && y === 50) return 'center'
  return `${Math.round(x)}% ${Math.round(y)}%`
}

function ImageUrlField({
  label,
  placeholder,
  value,
  onChange,
  eventId,
  kind,
}: {
  label: string
  placeholder?: string
  value: string
  onChange: (next: string) => void
  eventId?: string
  kind?: string
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
            Remover
          </button>
        </div>
      ) : null}
      <TextInput
        value={value.startsWith('data:') ? '' : value}
        placeholder={placeholder || 'https://…'}
        onChange={(e) => onChange(e.target.value)}
      />
      <label className="mt-2 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 px-3 py-2 text-sm text-white/70 hover:border-cyan-400/50">
        Importar imagem
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            if (!eventId) {
              alert('Salve o evento antes de importar imagens.')
              return
            }
            try {
              onChange(await uploadStudioImageFile({ eventId, file, kind }))
            } catch (err) {
              alert(err instanceof Error ? err.message : 'Falha no upload')
            }
          }}
        />
      </label>
      <p className="mt-1 text-xs text-white/40">Cole um link ou importe um arquivo (máx. 1.5 MB).</p>
    </Field>
  )
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
        <label className="block text-xs text-white/60">
          Horizontal {Math.round(focal.x)}%
          <input
            type="range"
            min={0}
            max={100}
            value={focal.x}
            onChange={(e) => onChange(formatFocal(Number(e.target.value), focal.y))}
            className="mt-1 w-full accent-cyan-400"
          />
        </label>
        <label className="block text-xs text-white/60">
          Vertical {Math.round(focal.y)}%
          <input
            type="range"
            min={0}
            max={100}
            value={focal.y}
            onChange={(e) => onChange(formatFocal(focal.x, Number(e.target.value)))}
            className="mt-1 w-full accent-cyan-400"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['center', 50, 50],
              ['top', 50, 0],
              ['bottom', 50, 100],
              ['left', 0, 50],
              ['right', 100, 50],
            ] as const
          ).map(([key, x, y]) => (
            <button
              key={key}
              type="button"
              className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/70 hover:border-cyan-400/50"
              onClick={() => onChange(formatFocal(x, y))}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
    </Field>
  )
}

export function CardDesignFields({
  design,
  onChange,
  eventId,
}: {
  design: CardDesign
  onChange: (next: CardDesign) => void
  eventId?: string
}) {
  const patch = (partial: Partial<CardDesign>) => onChange({ ...design, ...partial })

  return (
    <details className="rounded-2xl border border-white/10 bg-white/5 p-4" open>
      <summary className="cursor-pointer select-none text-sm font-medium text-white/80">
        Design do envelope ({Object.keys(design).length} parâmetros)
      </summary>
      <div className="mt-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {COLOR_FIELDS.map(({ key, label }) => (
            <Field key={key} label={label}>
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
          {IMAGE_FIELDS.map(({ key, label, placeholder }) => (
            <ImageUrlField
              key={key}
              label={label}
              placeholder={placeholder}
              value={String(design[key] || '')}
              onChange={(next) => patch({ [key]: next })}
              eventId={eventId}
              kind={String(key)}
            />
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Formato da foto">
            <select
              value={design.panelPhotoShape || 'circle'}
              onChange={(e) =>
                patch({
                  panelPhotoShape: e.target.value === 'rectangle' ? 'rectangle' : 'circle',
                })
              }
              className="w-full rounded-xl border border-white/15 bg-[#12182a] px-3 py-2.5 text-sm"
            >
              <option value="circle">Círculo</option>
              <option value="rectangle">Retângulo</option>
            </select>
          </Field>
          <Field label="Fonte (fontKey)">
            <TextInput
              value={design.fontKey}
              placeholder="georgia | playfair | cormorant | lato | montserrat"
              onChange={(e) => patch({ fontKey: e.target.value })}
            />
          </Field>
          <PositionSliders
            label="Posição da foto do painel"
            value={design.panelPhotoPosition || 'center'}
            onChange={(panelPhotoPosition) => patch({ panelPhotoPosition })}
          />
          <PositionSliders
            label="Posição da imagem de fundo"
            value={design.cardImagePosition || 'center'}
            onChange={(cardImagePosition) => patch({ cardImagePosition })}
          />
          <Field label="Tamanho da intro (px)">
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
          <Field label="Tamanho do heading (px)">
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
          <Field label="Tamanho do corpo (px)">
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
            Intro em negrito
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={design.introItalic !== false}
              onChange={(e) => patch({ introItalic: e.target.checked })}
            />
            Intro em itálico
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(design.headingBold)}
              onChange={(e) => patch({ headingBold: e.target.checked })}
            />
            Heading em negrito
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(design.headingItalic)}
              onChange={(e) => patch({ headingItalic: e.target.checked })}
            />
            Heading em itálico
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(design.bodyBold)}
              onChange={(e) => patch({ bodyBold: e.target.checked })}
            />
            Corpo em negrito
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(design.bodyItalic)}
              onChange={(e) => patch({ bodyItalic: e.target.checked })}
            />
            Corpo em itálico
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {TEXT_FIELDS.map(({ key, label, placeholder }) => (
            <Field key={key} label={label}>
              <TextInput
                value={String(design[key] || '')}
                placeholder={placeholder}
                onChange={(e) => patch({ [key]: e.target.value })}
              />
            </Field>
          ))}
        </div>

        <Field label="Mensagem no cartão">
          <TextArea value={design.message} onChange={(e) => patch({ message: e.target.value })} />
        </Field>
        <Field label="Intro">
          <TextArea value={design.intro} onChange={(e) => patch({ intro: e.target.value })} />
        </Field>
        <Field label="Dica / tip">
          <TextArea value={design.tip} onChange={(e) => patch({ tip: e.target.value })} />
        </Field>
      </div>
    </details>
  )
}
