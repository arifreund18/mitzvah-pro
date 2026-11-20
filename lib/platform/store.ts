import { createDefaultConfig } from './defaults'
import { DEFAULT_ORG_ID } from './constants'
import { slugify, uid } from './ids'
import { hashPassword } from './password'
import {
  claimEmailSend,
  deletePlatformEventRelational,
  deletePlatformUserRelational,
  eventScopedReadsEnabled,
  finalizeEmailSend,
  loadPlatformStore,
  loadScopedEventByApprovalToken,
  loadScopedEventByCustomHost,
  loadScopedEventByPreviewToken,
  loadScopedEventBySlug,
  loadScopedFamilyByToken,
  queryHasSentEmailLog,
  retirePlatformSlug,
  savePlatformStore,
  savePlatformStoreScopedEvent,
  saveScopedEmailLog,
  saveScopedFamilyUpdate,
  storageDriver,
} from './persistence'
import { configHasDataUrl, externalizeConfigDataUrls } from './media-blob'
import { isReservedSlug } from './site-url'
import { coerceGuestInviteLocale, primaryEventLocale } from './guest-locale'
import { normalizeConfig, normalizeGuest } from './normalize'
import { applyProducts, parseProductsInput } from './products'
import { applyScheduleItemInvitations } from './schedule-invite'
import { normalizeFollowUp } from './follow-up'
import { emptyMailDomain } from './mail-domain'
import type {
  EventConfig,
  EventLocale,
  EventProducts,
  Guest,
  GuestPerson,
  GuestRsvp,
  HostFollowUp,
  HostFollowUpAudience,
  HostFollowUpType,
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

/** Uncached load — dashboard, auth, cron, and all write paths. */
async function loadStore(): Promise<PlatformStore> {
  return loadPlatformStore()
}

/**
 * Short-lived cache for public read paths (site, RSVP GET, design-asset, preview).
 * Never use inside withLock / save paths.
 */
async function loadStorePublic(): Promise<PlatformStore> {
  return loadPlatformStore({ cache: true })
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

export async function listEvents(
  orgId?: string | null,
  eventIds?: string[] | null,
): Promise<PlatformEvent[]> {
  const store = await loadStore()
  let events = orgId ? store.events.filter((event) => event.orgId === orgId) : store.events
  if (eventIds) {
    const allowed = new Set(eventIds)
    events = events.filter((event) => allowed.has(event.id))
  }
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

function withEventIds(user: PlatformUser): PlatformUser {
  return {
    ...user,
    eventIds: Array.isArray(user.eventIds) ? user.eventIds : [],
  }
}

export async function listUsers(orgId: string): Promise<PlatformUser[]> {
  const store = await loadStore()
  return store.users.filter((user) => user.orgId === orgId).map(withEventIds)
}

export async function findUserByEmail(email: string): Promise<PlatformUser | null> {
  const store = await loadStore()
  const needle = email.trim().toLowerCase()
  const user = store.users.find((row) => row.email.toLowerCase() === needle) ?? null
  return user ? withEventIds(user) : null
}

export async function getUser(id: string): Promise<PlatformUser | null> {
  const store = await loadStore()
  const user = store.users.find((row) => row.id === id) ?? null
  return user ? withEventIds(user) : null
}

export async function createUser(input: {
  email: string
  name: string
  password: string
  role: UserRole
  orgId: string
  eventIds?: string[]
}): Promise<PlatformUser> {
  return withLock(async () => {
    const store = await loadStore()
    const email = input.email.trim().toLowerCase()
    if (store.users.some((user) => user.email.toLowerCase() === email)) {
      throw new Error('Email já registado')
    }
    const role = input.role === 'platform_admin' ? 'org_owner' : input.role
    const requestedIds = [...new Set((input.eventIds || []).map((id) => id.trim()).filter(Boolean))]
    const eventIds =
      role === 'org_member'
        ? requestedIds.filter((id) => store.events.some((event) => event.id === id && event.orgId === input.orgId))
        : []
    if (role === 'org_member' && eventIds.length === 0) {
      throw new Error('Escolha pelo menos um evento para o membro')
    }
    const user: PlatformUser = {
      id: uid(),
      email,
      name: input.name.trim(),
      passwordHash: hashPassword(input.password),
      role,
      orgId: input.orgId,
      eventIds,
      createdAt: new Date().toISOString(),
    }
    store.users.push(user)
    await saveStore(store)
    return user
  })
}

export async function updateUser(
  id: string,
  patch: { name?: string; role?: UserRole; eventIds?: string[] },
): Promise<PlatformUser | null> {
  return withLock(async () => {
    const store = await loadStore()
    const user = store.users.find((row) => row.id === id)
    if (!user) return null
    if (patch.name !== undefined) user.name = patch.name.trim() || user.name
    if (patch.role === 'org_owner' || patch.role === 'org_member') user.role = patch.role
    if (patch.eventIds !== undefined || user.role === 'org_member') {
      const requested =
        patch.eventIds !== undefined
          ? [...new Set(patch.eventIds.map((eventId) => eventId.trim()).filter(Boolean))]
          : user.eventIds || []
      user.eventIds =
        user.role === 'org_member'
          ? requested.filter((eventId) =>
              store.events.some((event) => event.id === eventId && event.orgId === user.orgId),
            )
          : []
      if (user.role === 'org_member' && user.eventIds.length === 0) {
        throw new Error('Escolha pelo menos um evento para o membro')
      }
    } else if (user.role === 'org_owner') {
      user.eventIds = []
    }
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
    // N1: relational tables are the read source — hard-delete the user row.
    await deletePlatformUserRelational(id)
    return true
  })
}

export async function getEvent(id: string): Promise<PlatformEvent | null> {
  const store = await loadStore()
  return store.events.find((event) => event.id === id) ?? null
}

export async function getEventBySlug(slug: string): Promise<PlatformEvent | null> {
  if (eventScopedReadsEnabled()) {
    try {
      const scoped = await loadScopedEventBySlug(slug)
      if (scoped) return scoped
    } catch {
      // fall through to full store
    }
  }
  const store = await loadStorePublic()
  return store.events.find((event) => event.slug === slug) ?? null
}

function normalizeCustomHostNeedle(host: string): string {
  return host.split(':')[0].toLowerCase().replace(/^www\./, '').replace(/\.$/, '')
}

/** True when another event already claimed this custom host (any status). */
export async function isCustomHostTaken(
  host: string,
  exceptEventId?: string,
): Promise<boolean> {
  const needle = normalizeCustomHostNeedle(host)
  if (!needle) return false
  const store = await loadStore()
  return store.events.some((event) => {
    if (exceptEventId && event.id === exceptEventId) return false
    const custom = normalizeCustomHostNeedle(event.config.domain.customHost || '')
    return Boolean(custom && custom === needle)
  })
}

export async function getEventByCustomHost(host: string): Promise<PlatformEvent | null> {
  const needle = normalizeCustomHostNeedle(host)
  if (!needle) return null
  if (eventScopedReadsEnabled()) {
    try {
      const scoped = await loadScopedEventByCustomHost(needle)
      if (scoped) return scoped
    } catch {
      // fall through
    }
  }
  const store = await loadStorePublic()
  // Deterministic: published only, oldest id wins (avoid "last edited" takeover).
  const matches = store.events
    .filter((event) => {
      if (event.status !== 'published') return false
      const custom = normalizeCustomHostNeedle(event.config.domain.customHost || '')
      return custom && custom === needle && event.config.domain.customHostStatus === 'verified'
    })
    .sort((a, b) => a.id.localeCompare(b.id))
  return matches[0] ?? null
}

export async function getEventByPreviewToken(token: string): Promise<PlatformEvent | null> {
  if (!token) return null
  if (eventScopedReadsEnabled()) {
    try {
      const scoped = await loadScopedEventByPreviewToken(token)
      if (scoped) return scoped
    } catch {
      // fall through
    }
  }
  const store = await loadStorePublic()
  return store.events.find((event) => event.previewToken === token) ?? null
}

export async function getEventByApprovalToken(token: string): Promise<PlatformEvent | null> {
  if (!token) return null
  if (eventScopedReadsEnabled()) {
    try {
      const scoped = await loadScopedEventByApprovalToken(token)
      if (scoped) return scoped
    } catch {
      // fall through
    }
  }
  const store = await loadStorePublic()
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
    const guest = coerceGuestInviteLocale(
      normalizeGuest({ ...event.guests[index], ...patch, id: guestId }),
      event.config,
    )
    event.guests[index] = guest
    event.updatedAt = new Date().toISOString()
    if (eventScopedReadsEnabled() && storageDriver() === 'postgres') {
      await saveScopedFamilyUpdate(eventId, guest)
      return { event, guest }
    }
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
  const retired = new Set(store.retiredSlugs || [])
  if (isReservedSlug(base) && base !== current) base = `evento-${base}`
  let candidate = base
  let n = 2
  while (
    (isReservedSlug(candidate) && candidate !== current) ||
    (retired.has(candidate) && candidate !== current) ||
    store.events.some((event) => event.slug === candidate && event.id !== ignoreId)
  ) {
    candidate = `${base}-${n}`
    n += 1
  }
  return candidate
}

function retireSlug(store: PlatformStore, slug: string | undefined) {
  if (!slug) return
  if (!store.retiredSlugs) store.retiredSlugs = []
  if (!store.retiredSlugs.includes(slug)) store.retiredSlugs.push(slug)
}

export async function createEvent(input: {
  honoreeName: string
  familyName: string
  locale?: EventLocale
  enabled?: EventLocale[]
  orgId?: string
  productMode?: 'site' | 'invite_only'
  products?: Partial<EventProducts>
}): Promise<PlatformEvent> {
  return withLock(async () => {
    const store = await loadStore()
    const now = new Date().toISOString()
    const orgId = input.orgId || DEFAULT_ORG_ID
    const slug = uniqueSlug(
      store,
      slugify(input.familyName) || slugify(input.honoreeName) || 'evento',
    )
    let config = createDefaultConfig({
      honoreeName: input.honoreeName,
      familyName: input.familyName,
      locale: input.locale,
      enabled: input.enabled,
      slug,
    })
    config = applyProducts(
      config,
      parseProductsInput(input.products, input.productMode),
    )
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

export class StaleWriteError extends Error {
  readonly code = 'stale_write' as const
  readonly current: PlatformEvent
  constructor(current: PlatformEvent) {
    super('stale_write')
    this.name = 'StaleWriteError'
    this.current = current
  }
}

export async function updateEvent(
  id: string,
  patch: {
    config?: EventConfig
    wizard?: Partial<WizardProgress>
    status?: PlatformEvent['status']
    slug?: string
    /** M4: client must echo last known updatedAt; mismatch → StaleWriteError. */
    expectedUpdatedAt?: string
  },
): Promise<PlatformEvent | null> {
  return withLock(async () => {
    const store = await loadStore()
    const event = store.events.find((item) => item.id === id)
    if (!event) return null
    if (patch.expectedUpdatedAt && patch.expectedUpdatedAt !== event.updatedAt) {
      throw new StaleWriteError(structuredClone(event))
    }
    if (patch.config) {
      let nextConfig = normalizeConfig(patch.config)
      // Phase 2: move any remaining data: uploads to public Blob before persisting.
      if (configHasDataUrl(nextConfig)) {
        try {
          const migrated = await externalizeConfigDataUrls(nextConfig, event.id)
          nextConfig = normalizeConfig(migrated.config)
        } catch {
          // Keep original config if Blob is unavailable; upload API still enforces Blob for new files.
        }
      }
      event.config = nextConfig
    }
    if (patch.wizard) {
      event.wizard = {
        currentStep: (patch.wizard.currentStep ?? event.wizard.currentStep) as WizardStepId,
        completedSteps: patch.wizard.completedSteps ?? event.wizard.completedSteps,
      }
    }
    if (patch.slug || patch.config?.domain.slug) {
      const desired = patch.slug || patch.config?.domain.slug || event.slug
      const previousSlug = event.slug
      const nextSlug = uniqueSlug(store, desired, event.id)
      if (previousSlug && nextSlug !== previousSlug) retireSlug(store, previousSlug)
      event.slug = nextSlug
      event.config.domain.slug = event.slug
    }
    if (patch.status) {
      event.status = patch.status
      if (patch.status === 'published') event.publishedAt = new Date().toISOString()
    }
    event.updatedAt = new Date().toISOString()
    // N2: wizard autosave must not rewrite every event's families.
    await savePlatformStoreScopedEvent(store, event.id, { syncFamilies: false })
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
    // E3: do not inherit mail identity / custom host from the source event.
    copy.config.domain.mail = emptyMailDomain()
    copy.config.domain.customHost = ''
    copy.config.domain.customHostStatus = 'none'
    copy.config.domain.customHostToken = uid()
    copy.config.story.headline = `${copy.config.story.headline} (cópia)`
    store.events.push(copy)
    await saveStore(store)
    return copy
  })
}

export async function deleteEvent(id: string): Promise<boolean> {
  return withLock(async () => {
    const store = await loadStore()
    const existing = store.events.find((item) => item.id === id)
    if (!existing) return false
    // E8: keep slug retired so mail identity / config set names are not reused.
    retireSlug(store, existing.slug)
    store.events = store.events.filter((item) => item.id !== id)
    await saveStore(store)
    // N1: DELETE FROM events (cascade families/guests) — JSON sync alone is not enough.
    await deletePlatformEventRelational(id)
    if (existing.slug) await retirePlatformSlug(existing.slug)
    return true
  })
}

function guestEmailsMatch(guest: Guest, email: string): boolean {
  const needle = email.trim().toLowerCase()
  if (!needle) return false
  if (guest.email.trim().toLowerCase() === needle) return true
  return (guest.emails || []).some((item) => item.trim().toLowerCase() === needle)
}

function mergePeople(existing: GuestPerson[], incoming: GuestPerson[]): GuestPerson[] {
  const people = [...existing]
  for (const person of incoming) {
    const name = person.name.trim().toLowerCase()
    if (!name) {
      people.push(person)
      continue
    }
    const dup = people.find((item) => item.name.trim().toLowerCase() === name)
    if (dup) {
      dup.type = person.type === 'child' ? 'child' : dup.type
      continue
    }
    people.push(person)
  }
  return people
}

export async function addGuest(
  eventId: string,
  guest: Partial<Guest> & { familyName: string },
): Promise<Guest | null> {
  return withLock(async () => {
    const store = await loadStore()
    const event = store.events.find((item) => item.id === eventId)
    if (!event) return null
    const now = new Date().toISOString()
    const localeDefault = primaryEventLocale(event.config)
    const incoming = coerceGuestInviteLocale(
      normalizeGuest(
        {
          ...guest,
          id: uid(),
          createdAt: now,
          inviteLocale: guest.inviteLocale || localeDefault,
        },
        { inviteLocale: localeDefault },
      ),
      event.config,
    )
    const incomingEmails = Array.from(
      new Set([incoming.email, ...(incoming.emails || [])].map((item) => item.trim()).filter(Boolean)),
    )
    const index = incomingEmails.length
      ? event.guests.findIndex((item) =>
          incomingEmails.some((email) => guestEmailsMatch(item, email)),
        )
      : -1
    if (index >= 0) {
      const current = event.guests[index]
      const people = mergePeople(current.people || [], incoming.people || [])
      const merged = normalizeGuest({
        ...current,
        familyName: guest.familyName?.trim() || current.familyName,
        email: current.email || incomingEmails[0] || '',
        emails: Array.from(
          new Set([...(current.emails || []), ...(incoming.emails || []), ...incomingEmails]),
        ),
        people,
        partySize: people.length,
      })
      event.guests[index] = merged
      event.updatedAt = now
      await savePlatformStoreScopedEvent(store, eventId, { syncFamilies: true })
      return merged
    }
    event.guests.push(incoming)
    event.updatedAt = now
    await savePlatformStoreScopedEvent(store, eventId, { syncFamilies: true })
    return incoming
  })
}

export async function deleteGuest(
  eventId: string,
  guestId: string,
): Promise<{ event: PlatformEvent; deleted: 'family' | 'person'; guest?: Guest } | null> {
  return deleteGuestPerson(eventId, guestId, null)
}

/** Remove one person from a family; if last person (or personId null), remove the family. */
export async function deleteGuestPerson(
  eventId: string,
  guestId: string,
  personId: string | null,
): Promise<{ event: PlatformEvent; deleted: 'family' | 'person'; guest?: Guest } | null> {
  return withLock(async () => {
    const store = await loadStore()
    const event = store.events.find((item) => item.id === eventId)
    if (!event) return null
    const index = event.guests.findIndex((item) => item.id === guestId)
    if (index < 0) return null

    if (!personId) {
      event.guests.splice(index, 1)
      event.updatedAt = new Date().toISOString()
      await savePlatformStoreScopedEvent(store, eventId, { syncFamilies: true })
      return { event, deleted: 'family' }
    }

    const current = event.guests[index]
    const people = (current.people || []).filter((person) => person.id !== personId)
    if (people.length === 0) {
      event.guests.splice(index, 1)
      event.updatedAt = new Date().toISOString()
      await savePlatformStoreScopedEvent(store, eventId, { syncFamilies: true })
      return { event, deleted: 'family' }
    }

    const guest = normalizeGuest({ ...current, people, partySize: people.length })
    event.guests[index] = guest
    event.updatedAt = new Date().toISOString()
    await savePlatformStoreScopedEvent(store, eventId, { syncFamilies: true })
    return { event, deleted: 'person', guest }
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
    const added: Guest[] = []
    for (const row of rows) {
      if (!row.familyName?.trim()) continue
      const localeDefault = primaryEventLocale(event.config)
      const incoming = coerceGuestInviteLocale(
        normalizeGuest(
          {
            ...row,
            id: uid(),
            createdAt: now,
            inviteLocale: row.inviteLocale || localeDefault,
          },
          { inviteLocale: localeDefault },
        ),
        event.config,
      )
      const incomingEmails = Array.from(
        new Set(
          [incoming.email, ...(incoming.emails || [])].map((item) => item.trim()).filter(Boolean),
        ),
      )
      const index = incomingEmails.length
        ? event.guests.findIndex((item) =>
            incomingEmails.some((email) => guestEmailsMatch(item, email)),
          )
        : -1
      if (index >= 0) {
        const current = event.guests[index]
        const people = mergePeople(current.people || [], incoming.people || [])
        const merged = coerceGuestInviteLocale(
          normalizeGuest(
            {
              ...current,
              familyName: incoming.familyName || current.familyName,
              email: current.email || incomingEmails[0] || '',
              emails: Array.from(
                new Set([...(current.emails || []), ...(incoming.emails || []), ...incomingEmails]),
              ),
              people,
              partySize: people.length,
              notes: incoming.notes || current.notes,
            },
            { inviteLocale: localeDefault },
          ),
          event.config,
        )
        event.guests[index] = merged
        added.push(merged)
      } else {
        event.guests.push(incoming)
        added.push(incoming)
      }
    }
    event.updatedAt = now
    await savePlatformStoreScopedEvent(store, eventId, { syncFamilies: true })
    return added
  })
}

/** M5/E10: keep server ids/tokens for known families; mint new ones for newcomers. */
function reconcileGuestList(existing: Guest[], incoming: Guest[], config: EventConfig): Guest[] {
  const byId = new Map(existing.map((guest) => [guest.id, guest]))
  return incoming.map((raw) => {
    const prev = raw.id?.trim() ? byId.get(raw.id.trim()) : undefined
    if (prev) {
      const existingPersonIds = new Set(prev.people.map((person) => person.id))
      const people = (raw.people || []).map((person) => {
        if (person.id && existingPersonIds.has(person.id)) return person
        // Drop foreign / client-invented person ids (E10: avoid cross-family ON CONFLICT).
        return { ...person, id: '' }
      })
      return coerceGuestInviteLocale(
        normalizeGuest(
          {
            ...raw,
            id: prev.id,
            token: prev.token,
            createdAt: prev.createdAt,
            people,
            stdSentAt: raw.stdSentAt ?? prev.stdSentAt,
            inviteSentAt: raw.inviteSentAt ?? prev.inviteSentAt,
            stdOpenedAt: raw.stdOpenedAt ?? prev.stdOpenedAt,
            invitationOpenedAt: raw.invitationOpenedAt ?? prev.invitationOpenedAt,
          },
          { inviteLocale: prev.inviteLocale },
        ),
        config,
      )
    }
    // New family: never trust client id/token (global token lookup is first-match).
    return coerceGuestInviteLocale(
      normalizeGuest(
        {
          ...raw,
          id: '',
          token: '',
          people: (raw.people || []).map((person) => ({ ...person, id: '' })),
        },
        { inviteLocale: config.locales.default },
      ),
      config,
    )
  })
}

export async function replaceGuests(
  eventId: string,
  guests: Guest[],
  opts?: { allowEmpty?: boolean; allowDrop?: boolean },
): Promise<
  PlatformEvent | null | { error: 'empty_wipe' | 'stale_drop'; dropped: number }
> {
  return withLock(async () => {
    const store = await loadStore()
    const event = store.events.find((item) => item.id === eventId)
    if (!event) return null
    // Guard against stale wizard/section PUT wiping a real guest list (Adissi).
    if (!opts?.allowEmpty && guests.length === 0 && event.guests.length > 0) {
      return { error: 'empty_wipe' as const, dropped: event.guests.length }
    }
    // Guard against stale non-empty PUT that silently drops families added elsewhere.
    if (!opts?.allowDrop) {
      const incomingIds = new Set(
        guests.map((guest) => guest.id).filter((id): id is string => Boolean(id?.trim())),
      )
      const dropped = event.guests.filter((guest) => !incomingIds.has(guest.id))
      if (dropped.length > 0) {
        return { error: 'stale_drop' as const, dropped: dropped.length }
      }
    }
    event.guests = reconcileGuestList(event.guests, guests, event.config)
    event.updatedAt = new Date().toISOString()
    // N2: reconcile families for this event only (DELETE missing ids scoped to event).
    await savePlatformStoreScopedEvent(store, event.id, { syncFamilies: true })
    return event
  })
}

/** Replace which guests are invited to one schedule item (BarBeni-style bulk picker). */
export async function replaceScheduleItemInvitations(
  eventId: string,
  scheduleItemId: string,
  invitedGuestIds: string[],
): Promise<{ event: PlatformEvent; invitedCount: number } | null> {
  return withLock(async () => {
    const store = await loadStore()
    const event = store.events.find((item) => item.id === eventId)
    if (!event) return null
    const allItemIds = event.config.schedule.items.map((item) => item.id)
    if (!allItemIds.includes(scheduleItemId)) return null
    const allowedGuests = new Set(event.guests.map((guest) => guest.id))
    const invited = [...new Set(invitedGuestIds.filter((id) => allowedGuests.has(id)))]
    event.guests = applyScheduleItemInvitations(
      event.guests,
      scheduleItemId,
      allItemIds,
      invited,
    ).map((guest) => coerceGuestInviteLocale(normalizeGuest(guest), event.config))
    event.updatedAt = new Date().toISOString()
    await savePlatformStoreScopedEvent(store, eventId, { syncFamilies: true })
    return { event, invitedCount: invited.length }
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
    const updated: Guest[] = []
    event.guests = event.guests.map((guest) => {
      if (!selected.has(guest.id)) return guest
      const recipients = guest.email || (guest.emails || []).length
      if (!recipients) return guest
      sent += 1
      const next =
        kind === 'std' ? { ...guest, stdSentAt: now } : { ...guest, inviteSentAt: now }
      updated.push(next)
      return next
    })
    event.updatedAt = now
    // C3.1: scoped family updates avoid full-store sync (and cross-event wipe risk).
    if (eventScopedReadsEnabled() && storageDriver() === 'postgres' && updated.length) {
      for (const guest of updated) {
        await saveScopedFamilyUpdate(eventId, guest)
      }
      return { event, sent }
    }
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
    const index = event.guests.findIndex((guest) => guest.id === guestId)
    if (index < 0) return
    const current = event.guests[index]!
    const next =
      kind === 'std'
        ? { ...current, stdOpenedAt: current.stdOpenedAt || now }
        : { ...current, invitationOpenedAt: current.invitationOpenedAt || now }
    event.guests[index] = next
    event.updatedAt = now
    if (eventScopedReadsEnabled() && storageDriver() === 'postgres') {
      await saveScopedFamilyUpdate(eventId, next)
      return
    }
    await saveStore(store)
  })
}

export async function listEmailLogs(eventId?: string) {
  const store = await loadStore()
  const logs = store.emailLogs || []
  const filtered = eventId ? logs.filter((log) => log.eventId === eventId) : logs
  return filtered.slice().sort((a, b) => {
    const ta = Date.parse(a.sentAt) || 0
    const tb = Date.parse(b.sentAt) || 0
    return tb - ta
  })
}

export async function createFollowUp(
  eventId: string,
  input: {
    type: HostFollowUpType
    body: string
    subject?: string
    audience?: HostFollowUpAudience
    guestIds?: string[]
    clientRequestId?: string
  },
): Promise<
  | { event: PlatformEvent; followUp: HostFollowUp; replayed: false }
  | { event: PlatformEvent; followUp: HostFollowUp; replayed: true }
  | null
> {
  return withLock(async () => {
    const store = await loadStore()
    const event = store.events.find((item) => item.id === eventId)
    if (!event) return null
    const key = String(input.clientRequestId || '').trim()
    if (key) {
      const existing = (event.config.followUps || []).find(
        (item) => item.clientRequestId && item.clientRequestId === key,
      )
      if (existing) return { event, followUp: existing, replayed: true as const }
    }
    const followUp = normalizeFollowUp({
      type: input.type,
      body: input.body,
      subject: input.subject || '',
      audience: input.audience || 'all',
      guestIds: input.guestIds || [],
      clientRequestId: key || undefined,
      createdAt: new Date().toISOString(),
      sentAt: null,
      sentCount: 0,
      failedCount: 0,
      deferredCount: 0,
    })
    event.config.followUps = [...(event.config.followUps || []), followUp]
    event.updatedAt = new Date().toISOString()
    await saveStore(store)
    return { event, followUp, replayed: false as const }
  })
}

export async function updateFollowUpStats(
  eventId: string,
  followUpId: string,
  patch: {
    sentAt?: string | null
    sentCount?: number
    failedCount?: number
    deferredCount?: number
  },
): Promise<HostFollowUp | null> {
  return withLock(async () => {
    const store = await loadStore()
    const event = store.events.find((item) => item.id === eventId)
    if (!event) return null
    const list = event.config.followUps || []
    const index = list.findIndex((item) => item.id === followUpId)
    if (index < 0) return null
    const current = list[index]!
    const next = normalizeFollowUp({
      ...current,
      sentAt: patch.sentAt !== undefined ? patch.sentAt : current.sentAt,
      sentCount: patch.sentCount !== undefined ? patch.sentCount : current.sentCount,
      failedCount: patch.failedCount !== undefined ? patch.failedCount : current.failedCount,
      deferredCount:
        patch.deferredCount !== undefined ? patch.deferredCount : current.deferredCount,
    })
    list[index] = next
    event.config.followUps = list
    event.updatedAt = new Date().toISOString()
    await saveStore(store)
    return next
  })
}

export async function appendEmailLog(input: {
  eventId: string
  familyId?: string | null
  type: string
  status: string
  toEmail: string
  messageId?: string | null
  /** @deprecated use messageId */
  resendId?: string | null
  error?: string
  id?: string
  sentAt?: string
}): Promise<void> {
  const messageId = input.messageId ?? input.resendId ?? null
  const log = {
    id: input.id || uid(),
    eventId: input.eventId,
    familyId: input.familyId ?? null,
    type: input.type,
    status: input.status,
    messageId,
    resendId: messageId,
    toEmail: input.toEmail,
    error: input.error || '',
    sentAt: input.sentAt || new Date().toISOString(),
  }
  // C3.1: hot path — INSERT only (no full-store rewrite / sync).
  if (storageDriver() === 'postgres') {
    try {
      await saveScopedEmailLog(log)
      return
    } catch (error) {
      console.error('[store] saveScopedEmailLog failed; falling back to full save', error)
    }
  }
  await withLock(async () => {
    const store = await loadStore()
    if (!store.emailLogs) store.emailLogs = []
    store.emailLogs.push(log)
    await saveStore(store)
  })
}

/**
 * N4: claim a deterministic send slot before calling the provider.
 * Returns null when already claimed/sent (skip send).
 */
export async function claimOutboundEmail(input: {
  eventId: string
  familyId: string
  type: string
  toEmail: string
}): Promise<{ id: string } | null> {
  const result = await claimEmailSend(input)
  if (!result?.claimed) return null
  return { id: result.id }
}

export async function finalizeOutboundEmail(
  claimId: string,
  result: { status: string; messageId?: string | null; error?: string },
): Promise<void> {
  await finalizeEmailSend(claimId, result)
}

/** E5: precise “already sent?” check — avoids the global 5000-log window. */
export async function hasSentEmailLog(input: {
  eventId: string
  familyId: string
  type: string
  toEmail: string
}): Promise<boolean> {
  if (storageDriver() === 'postgres') {
    try {
      return await queryHasSentEmailLog(input)
    } catch (error) {
      console.error('[store] queryHasSentEmailLog failed; falling back to JSON', error)
    }
  }
  const store = await loadStore()
  const to = input.toEmail.trim().toLowerCase()
  return (store.emailLogs || []).some(
    (log) =>
      log.eventId === input.eventId &&
      log.familyId === input.familyId &&
      log.type === input.type &&
      log.toEmail.trim().toLowerCase() === to &&
      log.status === 'sent',
  )
}

/** Read-only store access for cron jobs (no durable-write assert). */
export async function loadPlatformStoreForCron(): Promise<PlatformStore> {
  return loadStore()
}

/** Scan all events for a family invite token (public GET; writes re-load uncached). */
export async function getFamilyByToken(
  token: string,
): Promise<{ event: PlatformEvent; guest: Guest } | null> {
  const needle = token?.trim()
  if (!needle) return null
  if (eventScopedReadsEnabled()) {
    try {
      const scoped = await loadScopedFamilyByToken(needle)
      if (scoped) return scoped
    } catch {
      // fall through
    }
  }
  const store = await loadStorePublic()
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
    if (eventScopedReadsEnabled() && storageDriver() === 'postgres') {
      await saveScopedFamilyUpdate(eventId, next)
      return next
    }
    await saveStore(store)
    return next
  })
}
