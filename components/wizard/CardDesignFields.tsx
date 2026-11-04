'use client'

import { Field, TextInput } from '@/components/wizard/fields'
import type { CardDesign } from '@/lib/platform/types'

const COLOR_FIELDS: { key: keyof CardDesign; label: string }[] = [
  { key: 'pageColor', label: 'Cor da página' },
  { key: 'envelopeColor', label: 'Cor do envelope' },
  { key: 'envelopeLiner', label: 'Forro do envelope' },
  { key: 'sealBg', label: 'Fundo do selo' },
  { key: 'cardColor', label: 'Cor do cartão' },
  { key: 'cardTextColor', label: 'Texto do cartão' },
  { key: 'greetingColor', label: 'Cor da saudação' },
  { key: 'nameColor', label: 'Cor do nome' },
  { key: 'bodyColor', label: 'Cor do corpo' },
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
    <details className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <summary className="cursor-pointer select-none text-sm font-medium text-white/80">
        Design do envelope
      </summary>
      <div className="mt-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {COLOR_FIELDS.map(({ key, label }) => (
            <Field key={key} label={label}>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={String(design[key] || '#000000')}
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
              placeholder="georgia"
              onChange={(e) => patch({ fontKey: e.target.value })}
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

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(design.bodyBold)}
            onChange={(e) => patch({ bodyBold: e.target.checked })}
          />
          Corpo em negrito
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="URL do selo">
            <TextInput
              value={design.sealUrl}
              placeholder="https://…"
              onChange={(e) => patch({ sealUrl: e.target.value })}
            />
          </Field>
          <Field label="Foto do painel">
            <TextInput
              value={design.panelPhotoUrl}
              placeholder="https://…"
              onChange={(e) => patch({ panelPhotoUrl: e.target.value })}
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
          <Field label="Map URL">
            <TextInput
              value={design.mapUrl}
              placeholder="https://maps…"
              onChange={(e) => patch({ mapUrl: e.target.value })}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Endereço linha 1">
            <TextInput value={design.address1} onChange={(e) => patch({ address1: e.target.value })} />
          </Field>
          <Field label="Endereço linha 2">
            <TextInput value={design.address2} onChange={(e) => patch({ address2: e.target.value })} />
          </Field>
          <Field label="Rótulo horário">
            <TextInput
              value={design.timeLabel}
              onChange={(e) => patch({ timeLabel: e.target.value })}
            />
          </Field>
          <Field label="Rótulo local">
            <TextInput
              value={design.placeLabel}
              onChange={(e) => patch({ placeLabel: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Assunto (email)">
          <TextInput value={design.subject} onChange={(e) => patch({ subject: e.target.value })} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="CTA ver">
            <TextInput value={design.ctaView} onChange={(e) => patch({ ctaView: e.target.value })} />
          </Field>
          <Field label="CTA calendário">
            <TextInput
              value={design.ctaCalendar}
              onChange={(e) => patch({ ctaCalendar: e.target.value })}
            />
          </Field>
          <Field label="CTA mapa">
            <TextInput value={design.ctaMap} onChange={(e) => patch({ ctaMap: e.target.value })} />
          </Field>
        </div>
      </div>
    </details>
  )
}
