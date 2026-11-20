/**
 * Dual-write / dual-read helpers for Postgres relational tables.
 * Does not touch Bar-Beni. File/blob drivers skip this layer.
 */
import type { PlatformStore, PlatformEvent, Guest, EmailLog } from './types'
import { emailSendClaimId } from './email-claim'
import { normalizeEvent, normalizeGuest } from './normalize'
import { oncePerProcess } from './once'

export { emailSendClaimId }

type Sql = ReturnType<typeof import('postgres')>

let schemaDb: Sql | null = null
let ensureRelationalSchemaOnce: (() => Promise<void>) | null = null

export async function ensureRelationalSchema(db: Sql): Promise<void> {
  schemaDb = db
  if (!ensureRelationalSchemaOnce) {
    ensureRelationalSchemaOnce = oncePerProcess(async () => {
      const active = schemaDb
      if (!active) throw new Error('Postgres client ausente para schema relacional')
      await active.unsafe(`
    CREATE TABLE IF NOT EXISTS orgs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      event_ids TEXT[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS event_ids TEXT[] NOT NULL DEFAULT '{}';
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
      slug TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      template_id TEXT NOT NULL DEFAULT 'barbeni',
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      wizard JSONB NOT NULL DEFAULT '{}'::jsonb,
      preview_token TEXT NOT NULL,
      approval_token TEXT NOT NULL,
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS events_org_id_idx ON events(org_id);
    CREATE TABLE IF NOT EXISTS families (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      family_name TEXT NOT NULL,
      emails TEXT[] NOT NULL DEFAULT '{}',
      invite_locale TEXT NOT NULL DEFAULT 'pt',
      schedule_invite_mode TEXT NOT NULL DEFAULT 'all',
      schedule_item_ids TEXT[] NOT NULL DEFAULT '{}',
      open_rsvp BOOLEAN NOT NULL DEFAULT false,
      notes TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL DEFAULT '',
      token TEXT NOT NULL UNIQUE,
      people JSONB NOT NULL DEFAULT '[]'::jsonb,
      party_size INT NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'pending',
      meal TEXT NOT NULL DEFAULT '',
      dietary TEXT NOT NULL DEFAULT '',
      std_sent_at TIMESTAMPTZ,
      invite_sent_at TIMESTAMPTZ,
      std_opened_at TIMESTAMPTZ,
      invitation_opened_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS families_event_id_idx ON families(event_id);
    CREATE INDEX IF NOT EXISTS families_token_idx ON families(token);
    CREATE TABLE IF NOT EXISTS guests (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'adult',
      meal_choice TEXT NOT NULL DEFAULT '',
      dietary_restrictions TEXT NOT NULL DEFAULT '',
      rsvp_status TEXT NOT NULL DEFAULT 'pending',
      rsvp_submitted_at TIMESTAMPTZ,
      sort_order INT NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS guests_family_id_idx ON guests(family_id);
    CREATE INDEX IF NOT EXISTS guests_event_id_idx ON guests(event_id);
    CREATE TABLE IF NOT EXISTS email_logs (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      family_id TEXT,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      resend_id TEXT,
      to_email TEXT,
      error TEXT,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS mail_jobs (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INT NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS retired_slugs (
      slug TEXT PRIMARY KEY,
      retired_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
      // Upgrade older families tables created without people JSONB columns.
      await active.unsafe(`
    ALTER TABLE families ADD COLUMN IF NOT EXISTS people JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE families ADD COLUMN IF NOT EXISTS party_size INT NOT NULL DEFAULT 1;
    ALTER TABLE families ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE families ADD COLUMN IF NOT EXISTS meal TEXT NOT NULL DEFAULT '';
    ALTER TABLE families ADD COLUMN IF NOT EXISTS dietary TEXT NOT NULL DEFAULT '';
  `)
    })
  }
  await ensureRelationalSchemaOnce()
}

/** Test-only: allow schema ensure to run again after a simulated failure. */
export function resetRelationalSchemaEnsureForTests(): void {
  ensureRelationalSchemaOnce = null
  schemaDb = null
}

export async function relationalEventCount(db: Sql): Promise<number> {
  const rows = (await db`SELECT count(*)::int AS n FROM events`) as unknown as { n: number }[]
  return Number(rows[0]?.n || 0)
}

async function upsertEventRow(tx: Sql, event: PlatformEvent): Promise<void> {
  await tx`
    INSERT INTO events (
      id, org_id, slug, status, template_id, config, wizard,
      preview_token, approval_token, published_at, created_at, updated_at
    ) VALUES (
      ${event.id}, ${event.orgId}, ${event.slug}, ${event.status}, ${event.templateId},
      ${tx.json(event.config as never)}, ${tx.json(event.wizard as never)},
      ${event.previewToken}, ${event.approvalToken}, ${event.publishedAt},
      ${event.createdAt}, ${event.updatedAt}
    )
    ON CONFLICT (id) DO UPDATE SET
      org_id = EXCLUDED.org_id,
      slug = EXCLUDED.slug,
      status = EXCLUDED.status,
      config = EXCLUDED.config,
      wizard = EXCLUDED.wizard,
      preview_token = EXCLUDED.preview_token,
      approval_token = EXCLUDED.approval_token,
      published_at = EXCLUDED.published_at,
      updated_at = EXCLUDED.updated_at
  `
}

async function syncEventFamilies(tx: Sql, event: PlatformEvent, usedTokens: Set<string>): Promise<void> {
  const keepFamilyIds = event.guests.map((guest) => guest.id)
  if (keepFamilyIds.length) {
    await tx`
      DELETE FROM families
      WHERE event_id = ${event.id}
        AND id <> ALL(${keepFamilyIds}::text[])
    `
  } else {
    await tx`DELETE FROM families WHERE event_id = ${event.id}`
  }

  for (const guest of event.guests) {
    let token = String(guest.token || '').trim()
    if (!token || usedTokens.has(token)) {
      token = `t${guest.id.replace(/-/g, '').slice(0, 10)}${Math.random().toString(36).slice(2, 8)}`
      guest.token = token
    }
    const clash = (await tx`
      SELECT id FROM families WHERE token = ${token} AND id <> ${guest.id} LIMIT 1
    `) as unknown as { id: string }[]
    if (clash.length) {
      token = `t${guest.id.replace(/-/g, '').slice(0, 10)}${Date.now().toString(36)}`
      guest.token = token
    }
    usedTokens.add(token)
    await upsertFamilyToRelational(tx as unknown as Sql, event.id, { ...guest, token })
  }
}

/**
 * N2: sync one event only. `syncFamilies: false` updates the events row without
 * touching families (safe for wizard autosave). `true` reconciles that event's guests.
 */
export async function syncEventToRelational(
  db: Sql,
  event: PlatformEvent,
  opts?: { syncFamilies?: boolean },
): Promise<void> {
  await ensureRelationalSchema(db)
  await db.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(${879_314_201})`
    await upsertEventRow(tx as unknown as Sql, event)
    if (opts?.syncFamilies) {
      await syncEventFamilies(tx as unknown as Sql, event, new Set())
    }
  })
}

/** N1: hard-delete event (+ cascade families/guests). */
export async function deleteEventFromRelational(db: Sql, eventId: string): Promise<void> {
  await ensureRelationalSchema(db)
  await db`DELETE FROM events WHERE id = ${eventId}`
}

/** N1: hard-delete user so revoked accounts cannot log in. */
export async function deleteUserFromRelational(db: Sql, userId: string): Promise<void> {
  await ensureRelationalSchema(db)
  await db`DELETE FROM users WHERE id = ${userId}`
}

/** N3: persist retired slugs so E8 survives relational reads. */
export async function retireSlugInRelational(db: Sql, slug: string): Promise<void> {
  if (!slug) return
  await ensureRelationalSchema(db)
  await db`
    INSERT INTO retired_slugs (slug, retired_at)
    VALUES (${slug}, now())
    ON CONFLICT (slug) DO NOTHING
  `
}

export async function loadRetiredSlugs(db: Sql): Promise<string[]> {
  await ensureRelationalSchema(db)
  const rows = (await db`SELECT slug FROM retired_slugs`) as unknown as { slug: string }[]
  return rows.map((row) => row.slug)
}

/**
 * Full-store sync for migrate / rare paths.
 * N2: never DELETE families from a whole-store snapshot (stale writers wipe other
 * instances' guests). Family reconcile goes through syncEventToRelational.
 * Hard deletes of events/users go through delete*FromRelational.
 */
export async function syncStoreToRelational(db: Sql, store: PlatformStore): Promise<void> {
  await ensureRelationalSchema(db)

  await db.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(${879_314_201})`

    for (const org of store.orgs) {
      await tx`
        INSERT INTO orgs (id, name, created_at)
        VALUES (${org.id}, ${org.name}, ${org.createdAt})
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
      `
    }

    for (const user of store.users) {
      await tx`
        INSERT INTO users (id, org_id, email, name, password_hash, role, event_ids, created_at)
        VALUES (
          ${user.id}, ${user.orgId}, ${user.email}, ${user.name}, ${user.passwordHash}, ${user.role},
          ${user.eventIds || []}, ${user.createdAt}
        )
        ON CONFLICT (id) DO UPDATE SET
          org_id = EXCLUDED.org_id,
          email = EXCLUDED.email,
          name = EXCLUDED.name,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          event_ids = EXCLUDED.event_ids
      `
    }

    for (const event of store.events) {
      await upsertEventRow(tx as unknown as Sql, event)
      // Upsert families without deleting unknowns (N2).
      for (const guest of event.guests) {
        await upsertFamilyToRelational(tx as unknown as Sql, event.id, guest)
      }
    }

    for (const slug of store.retiredSlugs || []) {
      await tx`
        INSERT INTO retired_slugs (slug, retired_at)
        VALUES (${slug}, now())
        ON CONFLICT (slug) DO NOTHING
      `
    }

    for (const log of store.emailLogs || []) {
      await tx`
        INSERT INTO email_logs (id, event_id, family_id, type, status, resend_id, to_email, error, sent_at)
        VALUES (
          ${log.id}, ${log.eventId}, ${log.familyId}, ${log.type}, ${log.status},
          ${log.messageId ?? log.resendId}, ${log.toEmail}, ${log.error}, ${log.sentAt}
        )
        ON CONFLICT (id) DO NOTHING
      `
    }
  })
}

export async function insertEmailLogRow(
  db: Sql,
  log: {
    id: string
    eventId: string
    familyId?: string | null
    type: string
    status: string
    messageId?: string | null
    toEmail: string
    error?: string
    sentAt: string
  },
): Promise<void> {
  await ensureRelationalSchema(db)
  await db`
    INSERT INTO email_logs (id, event_id, family_id, type, status, resend_id, to_email, error, sent_at)
    VALUES (
      ${log.id}, ${log.eventId}, ${log.familyId ?? null}, ${log.type}, ${log.status},
      ${log.messageId ?? null}, ${log.toEmail}, ${log.error || ''}, ${log.sentAt}
    )
    ON CONFLICT (id) DO NOTHING
  `
}

/**
 * N4: insert a claim row before sending. Returns false if already claimed/sent.
 */
export async function claimEmailSendRow(
  db: Sql,
  input: { eventId: string; familyId: string; type: string; toEmail: string },
): Promise<{ claimed: boolean; id: string }> {
  await ensureRelationalSchema(db)
  const id = emailSendClaimId(input)
  const to = input.toEmail.trim().toLowerCase()
  const inserted = (await db`
    INSERT INTO email_logs (id, event_id, family_id, type, status, resend_id, to_email, error, sent_at)
    VALUES (
      ${id}, ${input.eventId}, ${input.familyId}, ${input.type}, 'claimed',
      null, ${to}, '', ${new Date().toISOString()}
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  `) as unknown as { id: string }[]
  return { claimed: inserted.length > 0, id }
}

export async function finalizeEmailSendClaim(
  db: Sql,
  claimId: string,
  result: {
    status: string
    messageId?: string | null
    error?: string
  },
): Promise<void> {
  await ensureRelationalSchema(db)
  await db`
    UPDATE email_logs
    SET
      status = ${result.status},
      resend_id = ${result.messageId ?? null},
      error = ${result.error || ''},
      sent_at = ${new Date().toISOString()}
    WHERE id = ${claimId}
  `
}

export async function hasSentEmailLogRow(
  db: Sql,
  input: { eventId: string; familyId: string; type: string; toEmail: string },
): Promise<boolean> {
  await ensureRelationalSchema(db)
  const to = input.toEmail.trim().toLowerCase()
  const rows = (await db`
    SELECT 1
    FROM email_logs
    WHERE event_id = ${input.eventId}
      AND family_id = ${input.familyId}
      AND type = ${input.type}
      AND lower(to_email) = ${to}
      AND status IN ('sent', 'claimed')
    LIMIT 1
  `) as unknown as { '?column?'?: number }[]
  return rows.length > 0
}

export async function loadStoreFromRelational(db: Sql): Promise<PlatformStore | null> {
  await ensureRelationalSchema(db)
  const n = await relationalEventCount(db)
  if (!n) return null

  const orgs = (await db`SELECT id, name, created_at FROM orgs ORDER BY name`) as unknown as {
    id: string
    name: string
    created_at: string
  }[]
  const users = (await db`
    SELECT id, org_id, email, name, password_hash, role, event_ids, created_at FROM users
  `) as unknown as {
    id: string
    org_id: string
    email: string
    name: string
    password_hash: string
    role: string
    event_ids: string[] | null
    created_at: string
  }[]
  const eventRows = (await db`SELECT * FROM events ORDER BY updated_at DESC`) as unknown as Record<
    string,
    unknown
  >[]
  const familyRows = (await db`SELECT * FROM families`) as unknown as Record<string, unknown>[]
  const guestRows = (await db`
    SELECT id, family_id, event_id, name, type, meal_choice, dietary_restrictions,
           rsvp_status, sort_order
    FROM guests ORDER BY sort_order ASC
  `) as unknown as Record<string, unknown>[]
  const logRows = (await db`
    SELECT id, event_id, family_id, type, status, resend_id, to_email, error, sent_at
    FROM email_logs ORDER BY sent_at DESC LIMIT 5000
  `) as unknown as Record<string, unknown>[]

  const peopleByFamily = new Map<string, Guest['people']>()
  for (const row of guestRows) {
    const familyId = String(row.family_id)
    const list = peopleByFamily.get(familyId) || []
    list.push({
      id: String(row.id),
      name: String(row.name || ''),
      type: row.type === 'child' ? 'child' : 'adult',
      status: (row.rsvp_status as Guest['status']) || 'pending',
      meal: String(row.meal_choice || ''),
      dietary: String(row.dietary_restrictions || ''),
    })
    peopleByFamily.set(familyId, list)
  }

  const familiesByEvent = new Map<string, Guest[]>()
  for (const row of familyRows) {
    const eventId = String(row.event_id)
    const familyId = String(row.id)
    const peopleFromTable = peopleByFamily.get(familyId)
    const guest = normalizeGuest({
      id: familyId,
      familyName: String(row.family_name || ''),
      emails: (row.emails as string[]) || [],
      email: ((row.emails as string[]) || [])[0] || '',
      inviteLocale: row.invite_locale as Guest['inviteLocale'],
      scheduleInviteMode: row.schedule_invite_mode as Guest['scheduleInviteMode'],
      scheduleItemIds: (row.schedule_item_ids as string[]) || [],
      openRsvp: Boolean(row.open_rsvp),
      notes: String(row.notes || ''),
      message: String(row.message || ''),
      token: String(row.token),
      // Prefer normalized guests rows when present (relational SoT for people).
      people: peopleFromTable?.length ? peopleFromTable : (row.people as Guest['people']) || [],
      partySize: Number(row.party_size) || 1,
      status: row.status as Guest['status'],
      meal: String(row.meal || ''),
      dietary: String(row.dietary || ''),
      stdSentAt: (row.std_sent_at as string) || null,
      inviteSentAt: (row.invite_sent_at as string) || null,
      stdOpenedAt: (row.std_opened_at as string) || null,
      invitationOpenedAt: (row.invitation_opened_at as string) || null,
      createdAt: String(row.created_at),
    })
    const list = familiesByEvent.get(eventId) || []
    list.push(guest)
    familiesByEvent.set(eventId, list)
  }

  const events: PlatformEvent[] = eventRows.map((row) =>
    normalizeEvent({
      id: String(row.id),
      orgId: String(row.org_id),
      slug: String(row.slug),
      status: row.status as PlatformEvent['status'],
      templateId: 'barbeni',
      config: row.config as PlatformEvent['config'],
      wizard: row.wizard as PlatformEvent['wizard'],
      previewToken: String(row.preview_token),
      approvalToken: String(row.approval_token),
      publishedAt: (row.published_at as string) || null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      guests: familiesByEvent.get(String(row.id)) || [],
    }),
  )

  const emailLogs: EmailLog[] = logRows.map((row) => {
    const messageId = row.resend_id ? String(row.resend_id) : null
    // Always ISO — String(Date) from the driver breaks localeCompare sorts in the UI.
    const sentRaw = row.sent_at
    const sentAt =
      sentRaw instanceof Date
        ? sentRaw.toISOString()
        : new Date(String(sentRaw || '')).toISOString()
    return {
      id: String(row.id),
      eventId: String(row.event_id),
      familyId: row.family_id ? String(row.family_id) : null,
      type: String(row.type),
      status: String(row.status),
      messageId,
      resendId: messageId,
      toEmail: String(row.to_email || ''),
      error: String(row.error || ''),
      sentAt: Number.isNaN(Date.parse(sentAt)) ? new Date().toISOString() : sentAt,
    }
  })

  const retiredSlugs = await loadRetiredSlugs(db)

  return {
    orgs: orgs.map((o) => ({ id: o.id, name: o.name, createdAt: String(o.created_at) })),
    users: users.map((u) => ({
      id: u.id,
      orgId: u.org_id,
      email: u.email,
      name: u.name,
      passwordHash: u.password_hash,
      role: u.role as PlatformStore['users'][number]['role'],
      eventIds: Array.isArray(u.event_ids) ? u.event_ids.map(String) : [],
      createdAt: String(u.created_at),
    })),
    events,
    emailLogs,
    retiredSlugs,
  }
}

function mapEventRow(
  row: Record<string, unknown>,
  guests: Guest[],
): PlatformEvent {
  return normalizeEvent({
    id: String(row.id),
    orgId: String(row.org_id),
    slug: String(row.slug),
    status: row.status as PlatformEvent['status'],
    templateId: 'barbeni',
    config: row.config as PlatformEvent['config'],
    wizard: row.wizard as PlatformEvent['wizard'],
    previewToken: String(row.preview_token),
    approvalToken: String(row.approval_token),
    publishedAt: (row.published_at as string) || null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    guests,
  })
}

async function loadFamiliesForEvent(db: Sql, eventId: string): Promise<Guest[]> {
  const familyRows = (await db`
    SELECT * FROM families WHERE event_id = ${eventId} ORDER BY created_at ASC
  `) as unknown as Record<string, unknown>[]
  const guestRows = (await db`
    SELECT id, family_id, event_id, name, type, meal_choice, dietary_restrictions,
           rsvp_status, sort_order
    FROM guests WHERE event_id = ${eventId} ORDER BY sort_order ASC
  `) as unknown as Record<string, unknown>[]

  const peopleByFamily = new Map<string, Guest['people']>()
  for (const row of guestRows) {
    const familyId = String(row.family_id)
    const list = peopleByFamily.get(familyId) || []
    list.push({
      id: String(row.id),
      name: String(row.name || ''),
      type: row.type === 'child' ? 'child' : 'adult',
      status: (row.rsvp_status as Guest['status']) || 'pending',
      meal: String(row.meal_choice || ''),
      dietary: String(row.dietary_restrictions || ''),
    })
    peopleByFamily.set(familyId, list)
  }

  return familyRows.map((row) => {
    const familyId = String(row.id)
    const peopleFromTable = peopleByFamily.get(familyId)
    return normalizeGuest({
      id: familyId,
      familyName: String(row.family_name || ''),
      emails: (row.emails as string[]) || [],
      email: ((row.emails as string[]) || [])[0] || '',
      inviteLocale: row.invite_locale as Guest['inviteLocale'],
      scheduleInviteMode: row.schedule_invite_mode as Guest['scheduleInviteMode'],
      scheduleItemIds: (row.schedule_item_ids as string[]) || [],
      openRsvp: Boolean(row.open_rsvp),
      notes: String(row.notes || ''),
      message: String(row.message || ''),
      token: String(row.token),
      people: peopleFromTable?.length ? peopleFromTable : (row.people as Guest['people']) || [],
      partySize: Number(row.party_size) || 1,
      status: row.status as Guest['status'],
      meal: String(row.meal || ''),
      dietary: String(row.dietary || ''),
      stdSentAt: (row.std_sent_at as string) || null,
      inviteSentAt: (row.invite_sent_at as string) || null,
      stdOpenedAt: (row.std_opened_at as string) || null,
      invitationOpenedAt: (row.invitation_opened_at as string) || null,
      createdAt: String(row.created_at),
    })
  })
}

async function loadEventFromRow(
  db: Sql,
  row: Record<string, unknown> | undefined,
): Promise<PlatformEvent | null> {
  if (!row) return null
  const guests = await loadFamiliesForEvent(db, String(row.id))
  return mapEventRow(row, guests)
}

/** Public/hot-path: one event by slug (+ its families/guests only). */
export async function loadEventBySlug(db: Sql, slug: string): Promise<PlatformEvent | null> {
  await ensureRelationalSchema(db)
  const needle = slug.trim()
  if (!needle) return null
  const rows = (await db`
    SELECT * FROM events WHERE slug = ${needle} LIMIT 1
  `) as unknown as Record<string, unknown>[]
  return loadEventFromRow(db, rows[0])
}

export async function loadEventById(db: Sql, id: string): Promise<PlatformEvent | null> {
  await ensureRelationalSchema(db)
  if (!id) return null
  const rows = (await db`
    SELECT * FROM events WHERE id = ${id} LIMIT 1
  `) as unknown as Record<string, unknown>[]
  return loadEventFromRow(db, rows[0])
}

export async function loadEventByPreviewToken(
  db: Sql,
  token: string,
): Promise<PlatformEvent | null> {
  await ensureRelationalSchema(db)
  if (!token) return null
  const rows = (await db`
    SELECT * FROM events WHERE preview_token = ${token} LIMIT 1
  `) as unknown as Record<string, unknown>[]
  return loadEventFromRow(db, rows[0])
}

export async function loadEventByApprovalToken(
  db: Sql,
  token: string,
): Promise<PlatformEvent | null> {
  await ensureRelationalSchema(db)
  if (!token) return null
  const rows = (await db`
    SELECT * FROM events WHERE approval_token = ${token} LIMIT 1
  `) as unknown as Record<string, unknown>[]
  return loadEventFromRow(db, rows[0])
}

/** Verified custom host lookup via JSONB path (no full store). */
export async function loadEventByCustomHost(
  db: Sql,
  host: string,
): Promise<PlatformEvent | null> {
  await ensureRelationalSchema(db)
  const needle = host.split(':')[0].toLowerCase().replace(/^www\./, '')
  if (!needle) return null
  const rows = (await db`
    SELECT * FROM events
    WHERE lower(regexp_replace(coalesce(config->'domain'->>'customHost', ''), '^www\\.', '')) = ${needle}
      AND coalesce(config->'domain'->>'customHostStatus', '') = 'verified'
      AND status = 'published'
    ORDER BY id ASC
    LIMIT 1
  `) as unknown as Record<string, unknown>[]
  return loadEventFromRow(db, rows[0])
}

export async function loadFamilyByToken(
  db: Sql,
  token: string,
): Promise<{ event: PlatformEvent; guest: Guest } | null> {
  await ensureRelationalSchema(db)
  const needle = token?.trim()
  if (!needle) return null
  const familyRows = (await db`
    SELECT * FROM families WHERE token = ${needle} LIMIT 1
  `) as unknown as Record<string, unknown>[]
  const family = familyRows[0]
  if (!family) return null
  const event = await loadEventById(db, String(family.event_id))
  if (!event) return null
  const guest = event.guests.find((item) => item.id === String(family.id))
  if (!guest) return null
  return { event, guest }
}

/** Upsert one family (+ people) without deleting other families. */
export async function upsertFamilyToRelational(
  db: Sql,
  eventId: string,
  guest: Guest,
): Promise<void> {
  await ensureRelationalSchema(db)
  await db`
    INSERT INTO families (
      id, event_id, family_name, emails, invite_locale, schedule_invite_mode,
      schedule_item_ids, open_rsvp, notes, message, token, people, party_size,
      status, meal, dietary, std_sent_at, invite_sent_at, std_opened_at,
      invitation_opened_at, created_at
    ) VALUES (
      ${guest.id}, ${eventId}, ${guest.familyName}, ${guest.emails},
      ${guest.inviteLocale}, ${guest.scheduleInviteMode}, ${guest.scheduleItemIds},
      ${guest.openRsvp}, ${guest.notes}, ${guest.message}, ${guest.token},
      ${db.json(guest.people as never)}, ${guest.partySize}, ${guest.status},
      ${guest.meal}, ${guest.dietary}, ${guest.stdSentAt}, ${guest.inviteSentAt},
      ${guest.stdOpenedAt}, ${guest.invitationOpenedAt}, ${guest.createdAt}
    )
    ON CONFLICT (id) DO UPDATE SET
      family_name = EXCLUDED.family_name,
      emails = EXCLUDED.emails,
      invite_locale = EXCLUDED.invite_locale,
      schedule_invite_mode = EXCLUDED.schedule_invite_mode,
      schedule_item_ids = EXCLUDED.schedule_item_ids,
      open_rsvp = EXCLUDED.open_rsvp,
      notes = EXCLUDED.notes,
      message = EXCLUDED.message,
      token = EXCLUDED.token,
      people = EXCLUDED.people,
      party_size = EXCLUDED.party_size,
      status = EXCLUDED.status,
      meal = EXCLUDED.meal,
      dietary = EXCLUDED.dietary,
      std_sent_at = EXCLUDED.std_sent_at,
      invite_sent_at = EXCLUDED.invite_sent_at,
      std_opened_at = EXCLUDED.std_opened_at,
      invitation_opened_at = EXCLUDED.invitation_opened_at
  `
  await db`DELETE FROM guests WHERE family_id = ${guest.id}`
  for (let i = 0; i < guest.people.length; i += 1) {
    const person = guest.people[i]
    let personId = person.id || `${guest.id}-p${i}`
    // E10: never ON CONFLICT-update a person that belongs to another family.
    const clash = (await db`
      SELECT family_id FROM guests WHERE id = ${personId} AND family_id <> ${guest.id} LIMIT 1
    `) as unknown as Array<{ family_id: string }>
    if (clash[0]) {
      personId = `${guest.id}-p${i}`
    }
    await db`
      INSERT INTO guests (
        id, family_id, event_id, name, type, meal_choice, dietary_restrictions,
        rsvp_status, sort_order
      ) VALUES (
        ${personId}, ${guest.id}, ${eventId}, ${person.name}, ${person.type},
        ${person.meal || ''}, ${person.dietary || ''}, ${person.status || 'pending'}, ${i}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        meal_choice = EXCLUDED.meal_choice,
        dietary_restrictions = EXCLUDED.dietary_restrictions,
        rsvp_status = EXCLUDED.rsvp_status,
        sort_order = EXCLUDED.sort_order
      WHERE guests.family_id = ${guest.id}
    `
  }
  await db`UPDATE events SET updated_at = ${new Date().toISOString()} WHERE id = ${eventId}`
}
