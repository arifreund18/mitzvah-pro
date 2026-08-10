'use client'

import { cn } from '@/lib/utils'
import { localeHref, type Locale } from '@/lib/i18n'

const locales: { code: Locale; label: string; Flag: typeof FlagUs }[] = [
  { code: 'en', label: 'English', Flag: FlagUs },
  { code: 'pt', label: 'Português', Flag: FlagBr },
  { code: 'es', label: 'Español', Flag: FlagMx },
  { code: 'he', label: 'עברית', Flag: FlagIl },
]

export function PlatformLanguageSwitcher({
  locale,
  className,
}: {
  locale: Locale
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-xl border border-white/20 bg-white/5 p-1',
        className,
      )}
    >
      {locales.map(({ code, label, Flag }) => {
        const active = locale === code
        return (
          <a
            key={code}
            href={localeHref(code)}
            title={label}
            aria-label={label}
            aria-current={active ? 'true' : undefined}
            className={cn(
              'flex h-8 w-10 items-center justify-center rounded-lg transition',
              active
                ? 'bg-white/15 ring-1 ring-cyan-400/60'
                : 'opacity-70 hover:bg-white/10 hover:opacity-100',
            )}
          >
            <Flag className="h-4 w-6 rounded-sm" />
          </a>
        )
      })}
    </div>
  )
}

function FlagUs({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 7410 3900" className={className} aria-hidden>
      <path fill="#b22234" d="M0 0h7410v3900H0z" />
      <path
        stroke="#fff"
        strokeWidth="300"
        d="M0 450h7410M0 1050h7410M0 1650h7410M0 2250h7410M0 2850h7410M0 3450h7410"
      />
      <path fill="#3c3b6e" d="M0 0h2964v2100H0z" />
      <g fill="#fff">
        {[
          [247, 210],
          [494, 420],
          [741, 210],
          [988, 420],
          [1235, 210],
          [1482, 420],
          [1729, 210],
          [1976, 420],
          [2223, 210],
          [2470, 420],
          [2717, 210],
          [370, 630],
          [617, 840],
          [864, 630],
          [1111, 840],
          [1358, 630],
          [1605, 840],
          [1852, 630],
          [2099, 840],
          [2346, 630],
          [2593, 840],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="180" />
        ))}
      </g>
    </svg>
  )
}

function FlagBr({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 720 504" className={className} aria-hidden>
      <path fill="#009b3a" d="M0 0h720v504H0z" />
      <path fill="#fedf00" d="M360 42 680 252 360 462 40 252z" />
      <circle cx="360" cy="252" r="110" fill="#002776" />
      <path
        fill="#fff"
        d="M280 252c0-44 36-80 80-80 28 0 53 14 68 36-18-8-38-12-58-12-66 0-120 54-120 120s54 120 120 120c20 0 40-4 58-12-15 22-40 36-68 36-44 0-80-36-80-80z"
      />
    </svg>
  )
}

function FlagMx({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 21 14" className={className} aria-hidden>
      <path fill="#006847" d="M0 0h7v14H0z" />
      <path fill="#fff" d="M7 0h7v14H7z" />
      <path fill="#ce1126" d="M14 0h7v14h-7z" />
      <circle cx="10.5" cy="7" r="2.2" fill="#8b4513" />
      <path
        fill="#006847"
        d="M10.5 5.2c.7.4 1.1 1.1 1.1 1.8s-.4 1.4-1.1 1.8c-.7-.4-1.1-1.1-1.1-1.8s.4-1.4 1.1-1.8z"
      />
    </svg>
  )
}

function FlagIl({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 22 16" className={className} aria-hidden>
      <path fill="#fff" d="M0 0h22v16H0z" />
      <path fill="#0038b8" d="M0 2.2h22v1.8H0zm0 9.8h22v1.8H0z" />
      <path
        fill="none"
        stroke="#0038b8"
        strokeWidth="0.7"
        d="M11 4.6 12.7 9.6H8.3L11 4.6zM11 11.4 9.3 6.4h4.4L11 11.4z"
      />
    </svg>
  )
}
