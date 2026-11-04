'use client'

import { useState, type ReactNode } from 'react'

export type EnvelopeConfig = {
  pageColor?: string
  pageTexture?: string
  envelopeColor?: string
  envelopeLiner?: string
  linerColor?: string
  sealUrl?: string
  sealBg?: string
  sealLabel?: string
  openLabel?: string
  label?: string
}

export function EnvelopeCard({
  children,
  pageColor,
  envelopeColor,
  linerColor,
  label,
  config,
}: {
  children: ReactNode
  pageColor?: string
  envelopeColor?: string
  linerColor?: string
  label?: string
  config?: EnvelopeConfig
}) {
  const [open, setOpen] = useState(false)
  const bg = config?.pageColor || pageColor || '#1a2033'
  const env = config?.envelopeColor || envelopeColor || '#c4a574'
  const liner = config?.envelopeLiner || config?.linerColor || linerColor || '#f7f1e4'
  const openLabel = config?.openLabel || config?.label || label || 'Open'
  const seal = config?.sealUrl
  const pageTexture = config?.pageTexture
  const pageStyle = pageTexture
    ? { backgroundColor: bg, backgroundImage: `url(${pageTexture})`, backgroundSize: 'cover' as const }
    : { background: bg }

  return (
    <div className="flex min-h-screen items-center justify-center p-6" style={pageStyle}>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative h-56 w-80 max-w-full overflow-hidden rounded-md shadow-xl transition hover:scale-[1.02]"
          style={{ background: env }}
          aria-label={openLabel}
        >
          <span
            className="absolute inset-x-0 top-0 h-28 origin-top"
            style={{
              background: liner,
              clipPath: 'polygon(0 0, 50% 70%, 100% 0)',
            }}
          />
          {seal ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={seal}
              alt=""
              className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full object-contain"
              style={{ background: config?.sealBg || '#fff' }}
            />
          ) : null}
          <span className="absolute inset-x-0 bottom-0 flex h-32 items-end justify-center pb-6 text-sm font-semibold tracking-widest text-black/70 uppercase">
            {openLabel}
          </span>
        </button>
      ) : (
        <div className="w-full max-w-lg rounded-[2rem] p-4 shadow-2xl" style={{ background: liner }}>
          {children}
        </div>
      )}
    </div>
  )
}

export const EnvelopeClient = EnvelopeCard
