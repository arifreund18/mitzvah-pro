/** Deterministic claim id for cron idempotency (N4). */
export function emailSendClaimId(input: {
  eventId: string
  familyId: string
  type: string
  toEmail: string
}): string {
  const to = input.toEmail.trim().toLowerCase()
  return `claim:${input.eventId}:${input.familyId}:${input.type}:${to}`
}
