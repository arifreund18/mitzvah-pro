'use client'

import { useCallback, useEffect, useState } from 'react'
import type { GalleryItem } from '@/lib/platform/types'

export function EventGalleryLightbox({
  items,
  accent,
}: {
  items: GalleryItem[]
  accent: string
}) {
  const [index, setIndex] = useState<number | null>(null)
  const open = index !== null
  const current = index !== null ? items[index] : null

  const close = useCallback(() => setIndex(null), [])
  const next = useCallback(() => {
    setIndex((i) => (i === null ? i : (i + 1) % items.length))
  }, [items.length])
  const prev = useCallback(() => {
    setIndex((i) => (i === null ? i : (i - 1 + items.length) % items.length))
  }, [items.length])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close, next, prev])

  if (!items.length) return null

  return (
    <>
      <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 md:grid-cols-3">
        {items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setIndex(i)}
            className="aspect-[4/3] overflow-hidden rounded-2xl bg-black/20 text-left"
            style={{
              backgroundImage: item.type === 'image' ? `url(${item.url})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {item.type === 'video' ? (
              <div className="flex h-full items-center justify-center text-sm opacity-80">▶ Video</div>
            ) : null}
            {item.caption ? (
              <span className="sr-only">{item.caption}</span>
            ) : null}
          </button>
        ))}
      </div>

      {open && current ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          onClick={close}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full px-3 py-1 text-sm text-white"
            style={{ background: accent }}
            onClick={close}
          >
            ✕
          </button>
          {items.length > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-white"
                onClick={(e) => {
                  e.stopPropagation()
                  prev()
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-white"
                onClick={(e) => {
                  e.stopPropagation()
                  next()
                }}
              >
                ›
              </button>
            </>
          ) : null}
          <div className="max-h-[85vh] max-w-4xl" onClick={(e) => e.stopPropagation()}>
            {current.type === 'video' ? (
              <video src={current.url} controls className="max-h-[80vh] w-full rounded-xl" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.url}
                alt={current.caption || ''}
                className="max-h-[80vh] w-full rounded-xl object-contain"
              />
            )}
            {current.caption ? (
              <p className="mt-3 text-center text-sm text-white/80">{current.caption}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
