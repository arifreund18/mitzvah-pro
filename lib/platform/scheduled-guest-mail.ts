import type { ReminderAudience, ScheduledGuestMailConfig } from './types.ts'
import { isReminderAudience, resolveReminderAudience } from './reminder-audience.ts'

export const DEFAULT_FOLLOW_UP_SCHEDULE: ScheduledGuestMailConfig = {
  enabled: false,
  d30: true,
  d7: true,
  d2: true,
  audienceD30: 'all',
  audienceD7: 'yes',
  audienceD2: 'yes',
  message: '',
}

/** Prefer nearer windows for wizard email previews. */
export function previewScheduledDays(schedule: Pick<ScheduledGuestMailConfig, 'd30' | 'd7' | 'd2'>): number {
  if (schedule.d7) return 7
  if (schedule.d2) return 2
  if (schedule.d30) return 30
  return 7
}

export function normalizeScheduledGuestMail(
  raw: Partial<ScheduledGuestMailConfig> | null | undefined,
  base: ScheduledGuestMailConfig,
): ScheduledGuestMailConfig {
  const merged = { ...base, ...(raw || {}) }
  const legacy = {
    audienceD30: raw?.audienceD30,
    audienceD7: raw?.audienceD7,
    audienceD2: raw?.audienceD2,
  }
  const audienceD30: ReminderAudience = isReminderAudience(raw?.audienceD30)
    ? raw!.audienceD30
    : resolveReminderAudience(30, { ...legacy, audienceD30: undefined })
  const audienceD7: ReminderAudience = isReminderAudience(raw?.audienceD7)
    ? raw!.audienceD7
    : resolveReminderAudience(7, legacy)
  const audienceD2: ReminderAudience = isReminderAudience(raw?.audienceD2)
    ? raw!.audienceD2
    : resolveReminderAudience(2, legacy)
  return {
    enabled: Boolean(merged.enabled),
    d30: Boolean(merged.d30),
    d7: Boolean(merged.d7),
    d2: Boolean(merged.d2),
    audienceD30,
    audienceD7,
    audienceD2,
    message: String(merged.message || ''),
  }
}
