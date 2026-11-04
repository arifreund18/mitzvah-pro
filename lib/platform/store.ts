import { createDefaultConfig } from './defaults'
import { DEFAULT_ORG_ID } from './auth'
import { slugify, uid } from './ids'
import { hashPassword } from './password'
import { loadPlatformStore, savePlatformStore } from './persistence'
import { isReservedSlug } from './site-url'
import { normalizeConfig, normalizeGuest } from './normalize'
import type {
  EventConfig,
  EventLocale,
  Guest,
  GuestPerson,
  GuestRsvp,
  Organization,
  PlatformEvent,
  PlatformStore,
  PlatformUser,
  UserRole,
  WizardProgress,
  WizardStepId,
} from './types'

export {
  EPHEMERAL_STORAGE_ERROR,
  isEphemeralServerStorage,
  storageDriver,
} from './persistence'

let writeChain: Promise<unknown> = Promise.resolve()

async function loadStore(): Promise<PlatformStore> {
  return loadPlatformStore()
}

async function saveStore(store: PlatformStore): Promise<void> {
  await savePlatformStore(store)
}

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn)
  writeChain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export async function listEvents(orgId?: string | null): Promise<PlatformEvent[]> {
  const store = await loadStore()
  const events = orgId ? store.events.filter((event) => event.orgId === orgId) : store.events
  return [...events].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function listOrgs(): Promise<Organization[]> {
  const store = await loadStore()
  return [...store.orgs].sort((a, b) => a.name.localeCompare(b.name))
}

export async function getOrg(id: string): Promise<Organization | null> {
  const store = await loadStore()
  return store.orgs.find((org) => org.id === id) ?? null
}

export async function createOrg(name: string): Promise<Organization> {
  return withLock(async () => {
    const store = await loadStore()
    const org: Organization = { id: uid(), name: name.trim(), createdAt: new Date().toISOString() }
    store.orgs.push(org)
    await saveStore(store)
    return org
  })
}

export async function listUsers(orgId: string): Promise<PlatformUser[]> {
  const store = await loadStore()
  return store.users.filter((user) => user.orgId === orgId)
}

export async function findUserByEmail(email: string): Promise<PlatformUser | null> {
  const store = await loadStore()
  const needle = email.trim().toLowerCase()
  return store.users.find((user) => user.email.toLowerCase() === needle) ?? null
}

export async function getUser(id: string): Promise<PlatformUser | null> {
  const store = await loadStore()
  return store.users.find((user) => user.id === id) ?? null
}

export async function createUser(input: {
  email: string
  name: string
  password: string
  role: UserRole
  orgId: string
}): Promise<PlatformUser> {
  return withLock(async () => {
    const store = await loadStore()
    const email = input.email.trim().toLowerCase()
    if (store.users.some((user) => user.email.toLowerCase() === email)) {
      throw new Error('Email já registado')
    }
    const user: PlatformUser = {
      id: uid(),
      email,
      name: input.name.trim(),
      passwordHash: hashPassword(input.password),
      role: input.role === 'platform_admin' ? 'org_owner' : input.role,
      orgId: input.orgId,
      createdAt: new Date().toISOString(),
    }
    store.users.push(user)
    await saveStore(store)
    return user
  })
}

export async function deleteUser(id: string): Promise<boolean> {
  return withLock(async () => {
    const store = await loadStore()
    const before = store.users.length
    store.users = store.users.filter((user) => user.id !== id)
    if (store.users.length === before) return false
    await saveStore(store)
    return true
  })
}

export async function getEvent(id: string): Promise<PlatformEvent | null> {
  const store = await loadStore()
  return store.events.find((event) => event.id === id) ?? null
}

export async function getEventBySlug(slug: string): Promise<PlatformEvent | null> {
  const store = await loadStore()
  return store.events.find((event) => event.slug === slug) ?? null
}

export async function getEventByCustomHost(host: string): Promise<PlatformEvent | null> {
  const needle = host.split(':')[0].toLowerCase().replace(/^www\./, '')
  if (!needle) return null
  const store = await loadStore()
  return (
    store.events.find((event) => {
      const custom = event.config.domain.customHost.replace(/^www\./, '')
      return custom && custom === needle && event.config.domain.customHostStatus === 'verified'
    }) ?? null
  )
}

export async function getEventByPreviewToken(token: string): Promise<PlatformEvent | null> {
  if (!token) return null
  const store = await loadStore()
  return store.events.find((event) => event.previewToken === token) ?? null
}

export async function getEventByApprovalToken(token: string): Promise<PlatformEvent | null> {
  if (!token) return null
  const store = await loadStore()
  return store.events.find((event) => event.approvalToken === token) ?? null
}

export async function updateGuest(
  eventId: string,
  guestId: string,
  patch: Partial<Guest>,
): Promise<{ event: PlatformEvent; guest: Guest } | null> {
  return withLock(async () => {
    const store = await loadStore()
    const event = store.events.find((item) => item.id === eventId)
    if (!event) return null
    const index = event.guests.findIndex((item) => item.id === guestId)
    if (index < 0) return null
    const guest = normalizeGuest({ ...event.guests[index], ...patch, id: guestId })
    event.guests[index] = guest
    event.updatedAt = new Date().toISOString()
    await saveStore(store)
    return { event, guest }
  })
}

export async function requestApproval(id: string): Promise<PlatformEvent | null> {
  return updateEvent(id, { status: 'pending_review' })
}

export async function approveEventByToken(token: string): Promise<PlatformEvent | null> {
  return withLock(async () => {
    const store = await loadStore()
    const event = store.events.find((item) => item.approvalToken === token)
    if (!event || event.status === 'archived') return null
    if (event.status === 'published') return event
    event.status = 'approved'
    event.updatedAt = new Date().toISOString()
    await saveStore(store)
    return event
  })
}

function uniqueSlug(store: PlatformStore, desired: string, ignoreId?: string): string {
  let base = slugify(desired) || `evento-${uid().slice(0, 6)}`
  const current = ignoreId ? store.events.find((event) => event.id === ignoreId)?.slug : undefined
  if (isReservedSlug(base) && base !== current) base = `evento-${base}`
  let candidate = base
  let n = 2
  while (
    (isReservedSlug(candidate) && candidate !== current) ||
    store.events.some((event) => event.slug === candidate && event.id !== ignoreId)
  ) {
    candidate = `${base}-${n}`
    n += 1
  }
  return candidate
}

export async function createEvent(input: {
  honoreeName: string
  familyName: string
  locale?: EventLocale
  enabled?: EventLocale[]
  orgId?: string
}): Promise<PlatformEvent> {
  return withLock(async () => {
    const store = await loadStore()
    const now = new Date().toISOString()
    const orgId = input.orgId || DEFAULT_ORG_ID
    const slug = uniqueSlug(
      store,
      slugify(input.familyName) || slugify(input.honoreeName) || 'evento',
    )
    const config = createDefaultConfig({
      honoreeName: input.honoreeName,
      familyName: input.familyName,
      locale: input.locale,
      enabled: input.enabled,
      slug,
    })
    const event: PlatformEvent = {
      id: uid(),
      orgId,
      slug,
      status: 'draft',
      templateId: 'barbeni',
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
      previewToken: uid(),
      approvalToken: uid(),
      config,
      guests: [],
      wizard: { currentStep: 'basics', completedSteps: [] },
    }
    store.events.push(event)
    await saveStore(store)
    return event
  })
}

export async function updateEvent(
  id: string,
  patch: {
    config?: EventConfig
    wizard?: Partial<WizardProgress>
    status?: PlatformEvent['status']
    slug?: string
  },
): Promise<PlatformEvent | null> {
  return withLock(async () => {
    const store = await loadStore()
    const event = store.events.find((item) => item.id === id)
    if (!event) return null
    if (patch.config) event.config = normalizeConfig(patch.config)
    if (patch.wizard) {
      event.wizard = {
        currentStep: (patch.wizard.currentStep ?? event.wizard.currentStep) as WizardStepId,
        completedSteps: patch.wizard.completedSteps ?? event.wizard.completedSteps,
      }
    }
    if (patch.slug || patch.config?.domain.slug) {
      const desired = patch.slug || patch.config?.domain.slug || event.slug
      event.slug = uniqueSlug(store, desired, event.id)
      event.config.domain.slug = event.slug
    }
    if (patch.status) {
      event.status = patch.status
      if (patch.status === 'published') event.publishedAt = new Date().toISOString()
    }
    event.updatedAt = new Date().toISOString()
    await saveStore(store)
    return event
  })
}

export async function duplicateEvent(id: string): Promise<PlatformEvent | null> {
  return withLock(async () => {
    const store = await loadStore()
    const source = store.events.find((item) => item.id === id)
    if (!source) return null
    const now = new Date().toISOString()
    const slug = uniqueSlug(store, `${source.slug}-copia`)
    const copy: PlatformEvent = {
      ...structuredClone(source),
      id: uid(),
      orgId: source.orgId,
      slug,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
      previewToken: uid(),
      approvalToken: uid(),
      guests: [],
      wizard: { currentStep: 'review', completedSteps: source.wizard.completedSteps },
    }
    copy.config.domain.slug = slug
    copy.config.story.headline = `${copy.config.story.headline} (cópia)`
    store.events.push(copy)
    await saveStore(store)
    return copy
  })
}

export async function deleteEvent(id: string): Promise<boolean> {
  return withLock(async () => {
    const store = await loadStore()
    const before = store.events.length
    store.events = store.events.filter((item) => item.id !== id)
    if (store.events.length === before) return false
    await saveStore(store)
    return true
  })
}

export async function addGuest(
  eventId: string,
  guest: Partial<Guest> & { familyName: string },
): Promise<Guest | null> {
  return withLock(async () => {
    const store = await loadStore()
    const event = store.events.find((item) => item.id === eventId)
    if (!event) return null
    const record = normalizeGuest({
      ...guest,
      id: uid(),
      createdAt: new Date().toISOString(),
    })
    event.guests.push(record)
    event.updatedAt = record.createdAt
    await saveStore(store)
    return record
  })
}

export async function addGuests(
  eventId: string,
  rows: Array<Partial<Guest> & { familyName: string }>,
): Promise<Guest[] | null> {
  return withLock(async () => {
    const store = await loadStore()
    const event = store.events.find((item) => item.id === eventId)
    if (!event) return null
    const now = new Date().toISOString()
    const added = rows
      .map((row) => row.familyName?.trim() && normalizeGuest({ ...row, id: uid(), createdAt: now }))
      .filter((row): row is Guest => Boolean(row))
    event.guests.push(...added)
    event.updatedAt = now
    await saveStore(store)
    return added
  })
}

export async function replaceGuests(eventId: string, guests: Guest[]): Promise<PlatformEvent | null> {
  return withLock(async () => {
    const store = await loadStore()
    const event = store.events.find((item) => item.id === eventId)
    if (!event) return null
    event.guests = guests.map((guest) => normalizeGuest(guest))
    event.updatedAt = new Date().toISOString()
    await saveStore(store)
    return event
  })
}

export async function markMailSent(
  eventId: string,
  kind: 'std' | 'invite',
  guestIds?: string[],
): Promise<{ event: PlatformEvent; sent: number } | null> {
  return withLock(async () => {
    const store = await loadStore()
    const event = store.events.find((item) => item.id === eventId)
    if (!event) return null
    const now = new Date().toISOString()
    const selected = new Set(guestIds || event.guests.map((guest) => guest.id))
    let sent = 0
    event.guests = event.guests.map((guest) => {
      if (!selected.has(guest.id) || !guest.email) return guest
      sent += 1
      return kind === 'std' ? { ...guest, stdSentAt: now } : { ...guest, inviteSentAt: now }
    })
    event.updatedAt = now
    await saveStore(store)
    return { event, sent }
  })
}

export async function markGuestOpened(
  eventId: string,
  guestId: string,
  kind: 'std' | 'invite',
): Promise<void> {
  await withLock(async () => {
    const store = await loadStore()
    const event = store.events.find((item) => item.id === eventId)
    if (!event) return
    const now = new Date().toISOString()
    event.guests = event.guests.map((guest) => {
      if (guest.id !== guestId) return guest
      return kind === 'std'
        ? { ...guest, stdOpenedAt: guest.stdOpenedAt || now }
        : { ...guest, invitationOpenedAt: guest.invitationOpenedAt || now }
    })
    event.updatedAt = now
    await saveStore(store)
  })
}

export async function listEmailLogs(eventId?: string) {
  const store = await loadStore()
  const logs = store.emailLogs || []
  return eventId ? logs.filter((log) => log.eventId === eventId) : logs
}

export async function appendEmailLog(input: {
  eventId: string
  familyId?: string | null
  type: string
  status: string
  toEmail: string
  resendId?: string | null
  error?: string
  id?: string
  sentAt?: string
}): Promise<void> {
  await withLock(async () => {
    const store = await loadStore()
    if (!store.emailLogs) store.emailLogs = []
    store.emailLogs.push({
      id: input.id || uid(),
      eventId: input.eventId,
      familyId: input.familyId ?? null,
      type: input.type,
      status: input.status,
      resendId: input.resendId ?? null,
      toEmail: input.toEmail,
      error: input.error || '',
      sentAt: input.sentAt || new Date().toISOString(),
    })
    await saveStore(store)
  })
}

/** Read-only store access for cron jobs (no durable-write assert). */
export async function loadPlatformStoreForCron(): Promise<PlatformStore> {
  return loadStore()
}

/** Scan all events for a family invite token. */
export async function getFamilyByToken(
  token: string,
): Promise<{ event: PlatformEvent; guest: Guest } | null> {
  const needle = token?.trim()
  if (!needle) return null
  const store = await loadStore()
  for (const event of store.events) {
    const guest = event.guests.find((item) => item.token === needle)
    if (guest) return { event, guest }
  }
  return null
}

export type GuestRsvpPatch = {
  people?: GuestPerson[]
  status?: GuestRsvp
  message?: string
  meal?: string
  dietary?: string
  partySize?: number
  invitationOpenedAt?: string | null
  stdOpenedAt?: string | null
}

export async function updateGuestRsvp(
  eventId: string,
  guestId: string,
  patch: GuestRsvpPatch,
): Promise<Guest | null> {
  return withLock(async () => {
    const store = await loadStore()
    const event = store.events.find((item) => item.id === eventId)
    if (!event) return null
    const index = event.guests.findIndex((guest) => guest.id === guestId)
    if (index < 0) return null
    const current = event.guests[index]!
    const next = normalizeGuest({
      ...current,
      ...patch,
      people: patch.people ?? current.people,
      status: patch.status ?? current.status,
      message: patch.message !== undefined ? patch.message : current.message,
      meal: patch.meal !== undefined ? patch.meal : current.meal,
      dietary: patch.dietary !== undefined ? patch.dietary : current.dietary,
      partySize: patch.partySize ?? current.partySize,
      invitationOpenedAt:
        patch.invitationOpenedAt !== undefined
          ? patch.invitationOpenedAt
          : current.invitationOpenedAt,
      stdOpenedAt: patch.stdOpenedAt !== undefined ? patch.stdOpenedAt : current.stdOpenedAt,
    })
    event.guests[index] = next
    event.updatedAt = new Date().toISOString()
    await saveStore(store)
    return next
  })
}
