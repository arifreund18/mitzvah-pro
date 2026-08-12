import { LoginForm } from '@/components/dashboard/LoginForm'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isValidSession, SESSION_COOKIE } from '@/lib/platform/auth'

export default async function DashboardLoginPage() {
  const jar = await cookies()
  if (isValidSession(jar.get(SESSION_COOKIE)?.value)) {
    redirect('/dashboard')
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070b16] px-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Studio local</p>
        <h1 className="font-display mt-3 text-3xl">
          Mitzvah<span className="text-cyan-400">.pro</span>
        </h1>
        <p className="mt-2 mb-8 text-sm text-white/50">
          Dashboard para criar eventos, abrir o wizard e ver o site nascer ao vivo.
        </p>
        <LoginForm />
      </div>
    </div>
  )
}
