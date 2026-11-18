'use client'

import { useRouter } from 'next/navigation'

export function LogoutButton({ label = 'Log out' }: { label?: string }) {
  const router = useRouter()
  return (
    <button
      type="button"
      className="text-sm text-white/50 hover:text-white"
      onClick={async () => {
        await fetch('/api/platform/logout', { method: 'POST' })
        router.push('/dashboard/login')
        router.refresh()
      }}
    >
      {label}
    </button>
  )
}
