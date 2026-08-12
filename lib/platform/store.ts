import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createDefaultConfig, createSeedEvent } from './defaults'
import { slugify, uid } from './ids'
import { isReservedSlug } from './site-url'
import { normalizeConfig, normalizeEvent, normalizeGuest } from './normalize'
import type {
  EventConfig,
  EventLocale,
  Guest,
  PlatformEvent,
  PlatformStore,
  WizardProgress,
  WizardStepId,
} from './types'

const LOCAL_PATH = path.join(process.cwd(), 'data', 'platform.json')
const TMP_PATH = path.join('/tmp', 'mitzvah-platform.json')

let resolvedPath: string | null = null
let writeChain: Promise<unknown> = Promise.resolve()

function emptyStore(): PlatformStore {
  return { events: [createSeedEvent()] }
}

async function tryRead(file: string): Promise<PlatformStore | null> {
  try {
    const raw = await readFile(file, 'utf8')
    const parsed = JSON.parse(raw) as PlatformStore
    if (!parsed || !Array.isArray(parsed.events)) return emptyStore()
    return { events: parsed.events.map((event) => normalizeEvent(event)) }
  } catch {
    return null
  }
}

async function persist(file: string, store: PlatformStore): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, JSON.stringify(store, null, 2), 'utf8')
}

async function loadStore(): Promise<PlatformStore> {
  if (resolvedPath) {
    return (await tryRead(resolvedPath)) ?? emptyStore()
  }
  const local = await tryRead(LOCAL_PATH)
  if (local) {
    resolvedPath = LOCAL_PATH
    return local
  }
  const tmp = await tryRead(TMP_PATH)
  if (tmp) {
    resolvedPath = TMP_PATH
    return tmp
  }
  const initial = emptyStore()
  try {
    await persist(LOCAL_PATH, initial)
    resolvedPath = LOCAL_PATH
  } catch {
    await persist(TMP_PATH, initial)
    resolvedPath = TMP_PATH
  }
  return initial
}

async function saveStore(store: PlatformStore): Promise<void> {
  const file = resolvedPath ?? LOCAL_PATH
  try {
    await persist(file, store)
    resolvedPath = file
  } catch {
    await persist(TMP_PATH, store)
    resolvedPath = TMP_PATH
  }
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

function uniqueSlug(store: PlatformStore, desired: string, ignoreId?: string): string {
  let base = slugify(desired) || `evento-${uid().slice(0, 6)}`
  if (isReservedSlug(base)) base = `evento-${base}`
  let candidate = base
  let n = 2
  while (
    isReservedSlug(candidate) ||
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
