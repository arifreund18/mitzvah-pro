function vercelToken(): string {
  return process.env.VERCEL_DNS_TOKEN || process.env.VERCEL_TOKEN || ''
}

export function vercelProjectTeamQuery(): string {
  const team = process.env.VERCEL_TEAM_ID || ''
  if (team.startsWith('team_')) return `?teamId=${encodeURIComponent(team)}`
  if (team) return `?slug=${encodeURIComponent(team)}`
  return ''
}

/** Registers a hostname on the Vercel project. Empty string = success. */
export async function addDomainToVercelProject(host: string): Promise<string> {
  const token = vercelToken()
  if (!token) return 'Configure VERCEL_TOKEN para registar o subdomínio no projeto.'
  const project = process.env.VERCEL_PROJECT_ID || 'mitzvah-pro'
  const res = await fetch(`https://api.vercel.com/v10/projects/${project}/domains${vercelProjectTeamQuery()}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: host }),
  })
  const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
  if (res.status === 409) return ''
  if (!res.ok) return body?.error?.message || `Vercel domains HTTP ${res.status}`
  return ''
}
