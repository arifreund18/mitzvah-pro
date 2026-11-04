-- Relational multi-tenant schema for mitzvah-pro parity (BarBeni-inspired).
-- Safe to run repeatedly. Does not touch the bar-beni database.

CREATE TABLE IF NOT EXISTS platform_store (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 0,
  window_start BIGINT NOT NULL
);

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
CREATE INDEX IF NOT EXISTS events_preview_token_idx ON events(preview_token);
CREATE INDEX IF NOT EXISTS events_approval_token_idx ON events(approval_token);

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
  -- Dual-write mirror of Guest.people (+ RSVP aggregates). Separate `guests` rows optional.
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
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  family_id TEXT REFERENCES families(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  resend_id TEXT,
  to_email TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_logs_event_id_idx ON email_logs(event_id);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  blob_url TEXT NOT NULL,
  mime TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mail_jobs (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
