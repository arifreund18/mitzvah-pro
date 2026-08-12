'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export function DarkSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const current = options.find((item) => item.value === value)?.label ?? value

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-[#12182a] px-3 py-2.5 text-start text-sm text-white outline-none focus:border-cyan-400/60"
      >
        <span>{current}</span>
        <span className="text-white/50">▾</span>
      </button>
      {open ? (
        <ul className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-white/15 bg-[#12182a] py-1 shadow-2xl">
          {options.map((item) => (
            <li key={item.value}>
              <button
                type="button"
                onClick={() => {
                  onChange(item.value)
                  setOpen(false)
                }}
                className={cn(
                  'w-full px-3 py-2.5 text-start text-sm text-white hover:bg-cyan-400/15',
                  item.value === value && 'bg-cyan-400/20 text-cyan-100',
                )}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
