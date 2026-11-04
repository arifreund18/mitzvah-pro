import type { EventConfig, EventLocale } from '@/lib/platform/types'
import { formatEventDate, typeLabel } from '@/lib/platform/copy'
import { getLocalizedLegal, getLocalizedStory } from '@/lib/platform/i18n-content'
import { THEME_PRESETS } from '@/components/template/theme-presets'

export function ComingSoon({
  config,
  locale,
}: {
  config: EventConfig
  locale: EventLocale
}) {
  const theme = THEME_PRESETS[config.branding.theme]
  const accent = config.branding.accentColor || '#22d3ee'
  const story = getLocalizedStory(config, locale)
  const legal = getLocalizedLegal(config, locale)
  const name = config.basics.honoreeName || 'Mitzvah'
  const type = typeLabel(config.basics.type, locale)
  const dateLabel = formatEventDate(config.basics.date, locale, '')
  const message =
    legal.comingSoonMessage ||
    story.subtitle ||
    (locale === 'he'
      ? 'האתר יהיה זמין בקרוב'
      : locale === 'es'
        ? 'El sitio estará disponible pronto'
        : locale === 'en'
          ? 'The site will be available soon'
          : 'O site estará disponível em breve')

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-6 py-20 text-center"
      style={{ background: theme.bg, color: theme.text }}
      dir={locale === 'he' ? 'rtl' : 'ltr'}
    >
      <p className="text-xs tracking-[0.35em] uppercase" style={{ color: accent }}>
        Coming soon
      </p>
      <h1 className="font-display mt-6 max-w-2xl text-4xl sm:text-6xl">
        {story.headline || `${type} · ${name}`}
      </h1>
      {dateLabel ? <p className="mt-4 text-lg opacity-70">{dateLabel}</p> : null}
      <p className="mt-8 max-w-md text-base opacity-80">{message}</p>
    </main>
  )
}
