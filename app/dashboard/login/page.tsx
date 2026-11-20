import { LoginForm } from '@/components/dashboard/LoginForm'
import { redirect } from 'next/navigation'
import { currentActor } from '@/lib/platform/session'

export default async function DashboardLoginPage() {
  if (await currentActor()) {
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
          Entre como admin da plataforma (só senha) ou como utilizador de uma organização (email +
          senha).
        </p>
        <LoginForm />
      </div>
    </div>
  )
}
