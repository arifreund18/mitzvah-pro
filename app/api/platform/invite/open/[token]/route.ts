import { getFamilyByToken, updateGuest } from '@/lib/platform/store'

const GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
)

type Ctx = { params: Promise<{ token: string }> }

export async function GET(_request: Request, ctx: Ctx) {
  const { token } = await ctx.params
  const found = await getFamilyByToken(token)
  if (found && !found.guest.invitationOpenedAt) {
    await updateGuest(found.event.id, found.guest.id, {
      invitationOpenedAt: new Date().toISOString(),
    })
  }
  return new Response(GIF, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
