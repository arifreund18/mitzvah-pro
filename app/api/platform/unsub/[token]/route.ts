import { NextResponse } from 'next/server'
import { getFamilyByToken } from '@/lib/platform/store'

type Ctx = { params: Promise<{ token: string }> }

/**
 * M6 stub: public unsubscribe landing. Full bounce/complaint suppression is still pending;
 * this page exists so mail footers can link a real URL (CAN-SPAM / SES expectations).
 */
export async function GET(_request: Request, ctx: Ctx) {
  const { token } = await ctx.params
  const found = await getFamilyByToken(token)
  const family = found?.guest.familyName || 'convidado'
  const host = found?.event.config.basics.familyName || found?.event.config.basics.honoreeName || 'anfitrião'

  const html = `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Descadastro</title></head>
<body style="font-family:Georgia,serif;max-width:32rem;margin:3rem auto;padding:0 1.25rem;line-height:1.5;color:#1a1a1a;">
  <h1 style="font-size:1.5rem;">Pedidos de email</h1>
  <p>Olá${family ? `, família ${escapeHtml(family)}` : ''}.</p>
  <p>
    Para deixar de receber convites deste evento, responda ao anfitrião
    (${escapeHtml(host)}) pedindo para remover o seu email da lista.
  </p>
  <p style="color:#666;font-size:0.9rem;">
    A supressão automática de bounce/complaint ainda está em implementação (M6).
  </p>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
