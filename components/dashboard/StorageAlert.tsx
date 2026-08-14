import { isEphemeralServerStorage } from '@/lib/platform/store'

export function StorageAlert() {
  if (!isEphemeralServerStorage()) return null
  return (
    <div
      role="alert"
      className="mb-8 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-4 text-sm text-amber-50"
    >
      <p className="font-semibold text-amber-100">Persistência não configurada na Vercel</p>
      <p className="mt-2 text-amber-50/80">
        O studio está a gravar eventos em armazenamento local efémero. Em produção isso some entre
        pedidos — criar um evento parece funcionar e o wizard responde 404.
      </p>
      <p className="mt-2 text-amber-50/80">
        Defina <code className="text-amber-100">DATABASE_URL</code> (Postgres/Neon) ou{' '}
        <code className="text-amber-100">BLOB_READ_WRITE_TOKEN</code> no projeto Vercel e faça
        redeploy. Até lá, a criação de eventos fica bloqueada.
      </p>
    </div>
  )
}
