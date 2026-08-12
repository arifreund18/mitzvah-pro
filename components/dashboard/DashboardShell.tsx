import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/components/dashboard/LogoutButton'
import { isValidSession, SESSION_COOKIE } from '@/lib/platform/auth'

export async function DashboardShell({ children }: { children: React.ReactNode }) {
  const jar = await cookies()
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value)) {
    redirect('/dashboard/login')
  }
  return (
    <div className="min-h-screen bg-[#070b16] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="font-display text-lg">
            Mitzvah<span className="text-cyan-400">.pro</span> Studio
          </Link>
          <nav className="flex items-center gap-4 text-sm text-white/60">
            <Link href="/dashboard" className="hover:text-white">
              Eventos
            </Link>
            <Link href="/" className="hover:text-white">
              Landing
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  )
}
