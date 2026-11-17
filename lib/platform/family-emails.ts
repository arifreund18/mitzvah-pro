const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

/** Split "a@x.com, b@y.com" / ";" / whitespace into unique emails (lowercase). */
export function parseEmailsInput(value: string | null | undefined): string[] {
  if (!value?.trim()) return []
  const parts = value
    .split(/[,;]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
  return Array.from(new Set(parts))
}

export function formatEmails(emails: string[]): string {
  return emails.join(', ')
}

export function guestMailRecipients(guest: {
  email?: string
  emails?: string[]
}): string[] {
  const fromList = Array.isArray(guest.emails) ? guest.emails : []
  const primary = (guest.email || '').trim()
  return Array.from(
    new Set(
      [...fromList, primary]
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item && isValidEmail(item)),
    ),
  )
}
