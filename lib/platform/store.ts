import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createDefaultConfig, createSeedEvent } from './defaults'
import { slugify, uid } from './ids'
import type {
  EventConfig,
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
    return parsed
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
  const base = slugify(desired) || `evento-${uid().slice(0, 6)}`
  let candidate = base
  let n = 2
  while (store.events.some((event) => event.slug === candidate && event.id !== ignoreId)) {
    candidate = `${base}-${n}`
    n += 1
  }
  return candidate
}

export async function createEvent(input: {
  honoreeName: string
  familyName: string
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
    if (patch.config) event.config = patch.config
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

export async function addGuest(
  eventId: string,
  guest: Omit<Guest, 'id' | 'createdAt'>,
): Promise<Guest | null> {
  return withLock(async () => {
    const store = await loadStore()
    const event = store.events.find((item) => item.id === eventId)
    if (!event) return null
    const record: Guest = {
      ...guest,
      id: uid(),
      createdAt: new Date().toISOString(),
    }
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
    event.guests = guests
    event.updatedAt = new Date().toISOString()
    await saveStore(store)
    return event
  })
}
