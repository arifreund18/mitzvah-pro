'use client'

import { useEffect, useRef, useState } from 'react'

export function EventAmbientAudio({ url, accent }: { url: string; accent: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const audio = new Audio(url)
    audio.loop = true
    audio.volume = 0.35
    audioRef.current = audio
    return () => {
      audio.pause()
      audioRef.current = null
    }
  }, [url])

  async function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }
    try {
      await audio.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="fixed bottom-4 right-4 z-30 rounded-full px-4 py-2 text-xs font-semibold text-black shadow-lg"
      style={{ background: accent }}
      aria-pressed={playing}
    >
      {playing ? '♪ Pause' : '♪ Music'}
    </button>
  )
}
