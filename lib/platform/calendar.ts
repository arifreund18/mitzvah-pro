import type { EventConfig } from './types'

export function googleCalendarUrl(config: EventConfig): string {
  const title = config.domain.seoTitle || config.story.headline || config.basics.honoreeName
  const date = config.basics.date.replace(/-/g, '')
  if (!date) return ''
  const location = [config.basics.city, config.basics.country].filter(Boolean).join(', ')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${date}/${date}`,
    details: config.story.subtitle || config.invitation.body || '',
    location,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
