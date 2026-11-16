'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import type { CardDesign } from '@/lib/platform/types'
import './envelope.css'

export type EnvelopeConfig = Partial<CardDesign> & {
  sealLabel?: string
  openLabel?: string
  label?: string
  linerColor?: string
}

function fontStack(fontKey?: string): string {
  const map: Record<string, string> = {
    georgia: 'Georgia, "Times New Roman", serif',
    playfair: '"Playfair Display", Georgia, serif',
    cormorant: '"Cormorant Garamond", Georgia, serif',
    lato: 'Lato, Helvetica, Arial, sans-serif',
    montserrat: 'Montserrat, Helvetica, Arial, sans-serif',
    hebrew: '"Noto Sans Hebrew", Arial, sans-serif',
  }
  return map[fontKey || ''] || map.georgia
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
  const exterior = config?.envelopeExterior || env
  const liner = config?.envelopeLiner || config?.linerColor || linerColor || '#f7f1e4'
  const openLabel = config?.openLabel || config?.label || label || 'Open'
  const seal = config?.sealUrl
  const sealBg = config?.sealBg || '#fff'
  const nameColor = config?.envelopeNameColor || config?.nameColor || '#1c1630'
  const pageTexture = config?.pageTexture
  const envelopeTexture = config?.envelopeTexture

  const stageStyle: CSSProperties = pageTexture
    ? {
        backgroundColor: bg,
        backgroundImage: `url(${pageTexture})`,
        backgroundSize: '160px auto',
        backgroundPosition: 'top center',
        backgroundRepeat: 'repeat',
      }
    : { background: bg }

  const envelopeFace: CSSProperties = envelopeTexture
    ? { backgroundColor: exterior, backgroundImage: `url(${envelopeTexture})`, backgroundSize: 'cover' }
    : { background: exterior }

  return (
    <div className="mp-envelope-stage" style={stageStyle}>
      <div
        className={`mp-envelope${open ? ' is-open' : ''}`}
        role={open ? 'presentation' : 'button'}
        tabIndex={open ? -1 : 0}
        aria-label={open ? undefined : openLabel}
        onClick={() => {
          if (!open) setOpen(true)
        }}
        onKeyDown={(e) => {
          if (!open && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            setOpen(true)
          }
        }}
      >
        <div className="mp-envelope-back" style={envelopeFace} />
        <div className="mp-envelope-liner" style={{ background: liner }} />
        {/* Stacked flaps: sides → bottom → top (soft shadows = natural seams). */}
        <div className="mp-envelope-side mp-envelope-side-left" style={envelopeFace} />
        <div className="mp-envelope-side mp-envelope-side-right" style={envelopeFace} />
        <div className="mp-envelope-front" style={envelopeFace} />
        <div className="mp-envelope-flap" style={envelopeFace} />
        {/* Soft top-flap seam only — reads as paper shadow, not a drawn X. */}
        <svg
          className="mp-envelope-folds"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <filter id="mp-fold-soft" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="0.25" />
            </filter>
          </defs>
          {/* Soft top-flap seams only — bottom is implied by layered flaps. */}
          <line
            x1="0"
            y1="0"
            x2="50"
            y2="58"
            stroke="rgba(40,25,10,0.18)"
            strokeWidth="1.25"
            filter="url(#mp-fold-soft)"
          />
          <line
            x1="100"
            y1="0"
            x2="50"
            y2="58"
            stroke="rgba(40,25,10,0.18)"
            strokeWidth="1.25"
            filter="url(#mp-fold-soft)"
          />
        </svg>
        {/* Card above flaps in open state so invitation text is never covered. */}
        <div className="mp-envelope-card" style={{ fontFamily: fontStack(config?.fontKey) }}>
          {children}
        </div>
        <div className="mp-envelope-seal" style={{ background: sealBg }}>
          {seal ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={seal} alt={config?.sealLabel || ''} />
          ) : (
            <span style={{ fontSize: 10, fontWeight: 700, color: nameColor }}>
              {(config?.sealLabel || '●').slice(0, 8)}
            </span>
          )}
        </div>
        <div className="mp-envelope-label" style={{ color: nameColor }}>
          {openLabel}
        </div>
      </div>
    </div>
  )
}

export const EnvelopeClient = EnvelopeCard
