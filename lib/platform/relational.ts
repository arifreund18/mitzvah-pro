/**
 * Dual-write / dual-read helpers for Postgres relational tables.
 * Does not touch Bar-Beni. File/blob drivers skip this layer.
 */
import type { PlatformStore, PlatformEvent, Guest, EmailLog } from './types'
import { normalizeEvent, normalizeGuest } from './normalize'

type Sql = ReturnType<typeof import('postgres')>

export async function ensureRelationalSchema(db: Sql): Promise<void> {
  await db.unsafe(`
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
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
  `)
  // Upgrade older families tables created without people JSONB columns.
  await db.unsafe(`
    ALTER TABLE families ADD COLUMN IF NOT EXISTS people JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE families ADD COLUMN IF NOT EXISTS party_size INT NOT NULL DEFAULT 1;
    ALTER TABLE families ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE families ADD COLUMN IF NOT EXISTS meal TEXT NOT NULL DEFAULT '';
    ALTER TABLE families ADD COLUMN IF NOT EXISTS dietary TEXT NOT NULL DEFAULT '';
  `)
}

export async function relationalEventCount(db: Sql): Promise<number> {
  const rows = (await db`SELECT count(*)::int AS n FROM events`) as unknown as { n: number }[]
  return Number(rows[0]?.n || 0)
}

export async function syncStoreToRelational(db: Sql, store: PlatformStore): Promise<void> {
  await ensureRelationalSchema(db)

  for (const org of store.orgs) {
    await db`
      INSERT INTO orgs (id, name, created_at)
      VALUES (${org.id}, ${org.name}, ${org.createdAt})
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    `
  }

  for (const user of store.users) {
    await db`
      INSERT INTO users (id, org_id, email, name, password_hash, role, created_at)
      VALUES (${user.id}, ${user.orgId}, ${user.email}, ${user.name}, ${user.passwordHash}, ${user.role}, ${user.createdAt})
      ON CONFLICT (id) DO UPDATE SET
        org_id = EXCLUDED.org_id,
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role
    `
  }

  const keepEventIds = store.events.map((e) => e.id)
  if (keepEventIds.length) {
    await db`DELETE FROM events WHERE id <> ALL(${keepEventIds}::text[])`
  } else {
    await db`DELETE FROM events`
  }

  for (const event of store.events) {
    await db`
      INSERT INTO events (
        id, org_id, slug, status, template_id, config, wizard,
        preview_token, approval_token, published_at, created_at, updated_at
      ) VALUES (
        ${event.id}, ${event.orgId}, ${event.slug}, ${event.status}, ${event.templateId},
        ${db.json(event.config as never)}, ${db.json(event.wizard as never)},
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

    await db`DELETE FROM guests WHERE event_id = ${event.id}`
    await db`DELETE FROM families WHERE event_id = ${event.id}`
    for (const guest of event.guests) {
      await db`
        INSERT INTO families (
          id, event_id, family_name, emails, invite_locale, schedule_invite_mode,
          schedule_item_ids, open_rsvp, notes, message, token, people, party_size,
          status, meal, dietary, std_sent_at, invite_sent_at, std_opened_at,
          invitation_opened_at, created_at
        ) VALUES (
          ${guest.id}, ${event.id}, ${guest.familyName}, ${guest.emails},
          ${guest.inviteLocale}, ${guest.scheduleInviteMode}, ${guest.scheduleItemIds},
          ${guest.openRsvp}, ${guest.notes}, ${guest.message}, ${guest.token},
          ${db.json(guest.people as never)}, ${guest.partySize}, ${guest.status},
          ${guest.meal}, ${guest.dietary}, ${guest.stdSentAt}, ${guest.inviteSentAt},
          ${guest.stdOpenedAt}, ${guest.invitationOpenedAt}, ${guest.createdAt}
        )
      `
      for (let i = 0; i < guest.people.length; i += 1) {
        const person = guest.people[i]
        const personId = person.id || `${guest.id}-p${i}`
        await db`
          INSERT INTO guests (
            id, family_id, event_id, name, type, meal_choice, dietary_restrictions,
            rsvp_status, sort_order
          ) VALUES (
            ${personId}, ${guest.id}, ${event.id}, ${person.name}, ${person.type},
            ${person.meal || ''}, ${person.dietary || ''}, ${person.status || 'pending'}, ${i}
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            type = EXCLUDED.type,
            meal_choice = EXCLUDED.meal_choice,
            dietary_restrictions = EXCLUDED.dietary_restrictions,
            rsvp_status = EXCLUDED.rsvp_status,
            sort_order = EXCLUDED.sort_order
        `
      }
    }
  }

  for (const log of store.emailLogs || []) {
    await db`
      INSERT INTO email_logs (id, event_id, family_id, type, status, resend_id, to_email, error, sent_at)
      VALUES (
        ${log.id}, ${log.eventId}, ${log.familyId}, ${log.type}, ${log.status},
        ${log.resendId}, ${log.toEmail}, ${log.error}, ${log.sentAt}
      )
      ON CONFLICT (id) DO NOTHING
    `
  }
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
    SELECT id, org_id, email, name, password_hash, role, created_at FROM users
  `) as unknown as {
    id: string
    org_id: string
    email: string
    name: string
    password_hash: string
    role: string
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

  const emailLogs: EmailLog[] = logRows.map((row) => ({
    id: String(row.id),
    eventId: String(row.event_id),
    familyId: row.family_id ? String(row.family_id) : null,
    type: String(row.type),
    status: String(row.status),
    resendId: row.resend_id ? String(row.resend_id) : null,
    toEmail: String(row.to_email || ''),
    error: String(row.error || ''),
    sentAt: String(row.sent_at),
  }))

  return {
    orgs: orgs.map((o) => ({ id: o.id, name: o.name, createdAt: String(o.created_at) })),
    users: users.map((u) => ({
      id: u.id,
      orgId: u.org_id,
      email: u.email,
      name: u.name,
      passwordHash: u.password_hash,
      role: u.role as PlatformStore['users'][number]['role'],
      createdAt: String(u.created_at),
    })),
    events,
    emailLogs,
  }
}
