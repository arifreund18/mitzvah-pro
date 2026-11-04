'use client'

import { Field, TextArea, TextInput } from '@/components/wizard/fields'
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
  { key: 'greetingColor', label: 'Cor da saudação' },
  { key: 'nameColor', label: 'Cor do nome' },
  { key: 'bodyColor', label: 'Cor do corpo' },
  { key: 'introColor', label: 'Cor da intro' },
  { key: 'headingColor', label: 'Cor do heading' },
]

const TEXT_FIELDS: { key: keyof CardDesign; label: string; placeholder?: string }[] = [
  { key: 'pageTexture', label: 'Textura da página (URL)', placeholder: 'https://…/texture.png' },
  { key: 'envelopeTexture', label: 'Textura do envelope (URL)', placeholder: 'https://…' },
  { key: 'sealUrl', label: 'URL do selo', placeholder: 'https://…' },
  { key: 'sealLabel', label: 'Rótulo do selo' },
  { key: 'cardImageUrl', label: 'Imagem de fundo do cartão', placeholder: 'https://…' },
  { key: 'panelPhotoUrl', label: 'Foto do painel', placeholder: 'https://…' },
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

export function CardDesignFields({
  design,
  onChange,
}: {
  design: CardDesign
  onChange: (next: CardDesign) => void
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
          <Field label="Fonte (fontKey)">
            <TextInput
              value={design.fontKey}
              placeholder="georgia | playfair | cormorant | lato | montserrat"
              onChange={(e) => patch({ fontKey: e.target.value })}
            />
          </Field>
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
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
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
              checked={Boolean(design.introBold)}
              onChange={(e) => patch({ introBold: e.target.checked })}
            />
            Intro em negrito
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(design.headingBold)}
              onChange={(e) => patch({ headingBold: e.target.checked })}
            />
            Heading em negrito
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
