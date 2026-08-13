import { createDefaultConfig } from './defaults'
import { slugify, uid } from './ids'
import { loadPlatformStore, savePlatformStore } from './persistence'
import { isReservedSlug } from './site-url'
import { normalizeConfig, normalizeGuest } from './normalize'
import type {
  EventConfig,
  EventLocale,
  Guest,
  PlatformEvent,
  PlatformStore,
  WizardProgress,
  WizardStepId,
} from './types'

export { storageDriver } from './persistence'

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

export async function listEvents(): Promise<PlatformEvent[]> {
  const store = await loadStore()
  return [...store.events].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getEvent(id: string): Promise<PlatformEvent | null> {
  const store = await loadStore()
  return store.events.find((event) => event.id === id) ?? null
}

export async function getEventBySlug(slug: string): Promise<PlatformEvent | null> {
  const store = await loadStore()
  return store.events.find((event) => event.slug === slug) ?? null
}

export async function getEventByPreviewToken(token: string): Promise<PlatformEvent | null> {
  if (!token) return null
  const store = await loadStore()
  return store.events.find((event) => event.previewToken === token) ?? null
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
}): Promise<PlatformEvent> {
  return withLock(async () => {
    const store = await loadStore()
    const now = new Date().toISOString()
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
      slug,
      status: 'draft',
      templateId: 'barbeni',
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
      previewToken: uid(),
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
      slug,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
      previewToken: uid(),
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
