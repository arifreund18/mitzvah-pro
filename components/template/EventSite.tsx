import type { EventConfig, ThemeId, WizardStepId } from '@/lib/platform/types'
import { formatEventDate, typeLabel, wizardUi } from '@/lib/platform/copy'

export const THEME_PRESETS: Record<
  ThemeId,
  { bg: string; text: string; muted: string; card: string; inviteBg: string; inviteText: string }
> = {
  navy: {
    bg: '#0b1020',
    text: '#ffffff',
    muted: 'rgba(255,255,255,0.68)',
    card: 'rgba(255,255,255,0.07)',
    inviteBg: '#f7f1e4',
    inviteText: '#1c1630',
  },
  ivory: {
    bg: '#f6f0e4',
    text: '#241c14',
    muted: '#6a5b4c',
    card: '#ffffff',
    inviteBg: '#fffaf2',
    inviteText: '#3b2418',
  },
  forest: {
    bg: '#102018',
    text: '#f4efe4',
    muted: 'rgba(244,239,228,0.72)',
    card: 'rgba(255,255,255,0.07)',
    inviteBg: '#f3ead6',
    inviteText: '#142018',
  },
  burgundy: {
    bg: '#1a0b12',
    text: '#f7e7d0',
    muted: 'rgba(247,231,208,0.72)',
    card: 'rgba(255,255,255,0.07)',
    inviteBg: '#f8ecd8',
    inviteText: '#3a121c',
  },
}

export function EventSite({
  config,
  highlight,
  mode = 'live',
}: {
  config: EventConfig
  highlight?: WizardStepId | string
  mode?: 'live' | 'preview'
}) {
  const theme = THEME_PRESETS[config.branding.theme]
  const accent = config.branding.accentColor || '#22d3ee'
  const locale = config.locales.default
  const ui = wizardUi(locale).site
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  const type = typeLabel(config.basics.type, locale)
  const name = config.basics.honoreeName || ui.honoreeFallback
  const dateLabel = formatEventDate(config.basics.date, locale, ui.dateTbd)
  const place = [config.basics.city, config.basics.country].filter(Boolean).join(', ')
  const interactive = mode === 'live'

  const mark = (id: string) =>
    highlight === id ||
    (highlight === 'basics' && id === 'hero') ||
    (highlight === 'branding' && id === 'hero') ||
    (highlight === 'locales' && id === 'hero') ||
    (highlight === 'domain' && id === 'hero') ||
    (highlight === 'review' && id === 'hero') ||
    (highlight === 'guestsBootstrap' && id === 'rsvp')
      ? 'ring-2 ring-offset-2 ring-offset-transparent'
      : ''

  return (
    <div
      lang={locale}
      dir={dir}
      className="min-h-full"
      style={{ background: theme.bg, color: theme.text, ['--accent' as string]: accent }}
    >
      <section
        id="preview-hero"
        data-preview="hero"
        className={`relative overflow-hidden px-6 py-20 text-center ${mark('hero')}`}
        style={{ outlineColor: accent }}
      >
        {config.media.heroUrl ? (
          <div
            className="pointer-events-none absolute inset-0 opacity-35"
            style={{
              backgroundImage: `url(${config.media.heroUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        ) : (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at top, ${accent}33, transparent 55%)`,
            }}
          />
        )}
        {config.invitation.sealImageUrl ? (
          <img
            src={config.invitation.sealImageUrl}
            alt={config.invitation.sealLabel || ''}
            className="relative mx-auto mb-6 h-16 w-16 rounded-full bg-white/10 object-contain p-1"
          />
        ) : null}
        <p className="relative text-xs uppercase tracking-[0.35em]" style={{ color: accent }}>
          {type}
        </p>
        <h1 className="font-display relative mt-4 text-4xl font-bold md:text-6xl">{name}</h1>
        <p className="relative mt-4 text-lg" style={{ color: theme.muted }}>
          {dateLabel}
          {place ? ` · ${place}` : ''}
        </p>
        {config.story.headline ? (
          <p className="font-display relative mx-auto mt-8 max-w-2xl text-2xl">{config.story.headline}</p>
        ) : null}
        {config.story.subtitle ? (
          <p className="relative mx-auto mt-3 max-w-xl" style={{ color: theme.muted }}>
            {config.story.subtitle}
          </p>
        ) : null}
      </section>

      {(config.story.parentsMessage || config.story.about) && (
        <section
          id="preview-story"
          data-preview="story"
          className={`mx-auto max-w-3xl px-6 py-16 text-center ${mark('story')}`}
        >
          {config.story.parentsMessage ? (
            <p className="font-display text-xl leading-relaxed">{config.story.parentsMessage}</p>
          ) : null}
          {config.story.about ? (
            <p className="mt-6 leading-relaxed" style={{ color: theme.muted }}>
              {config.story.about}
            </p>
          ) : null}
        </section>
      )}

      {config.saveTheDate.enabled && (
        <section id="preview-std" data-preview="std" className={`px-6 py-12 ${mark('saveTheDate')}`}>
          <EnvelopeCard config={config} accent={accent} theme={theme} />
        </section>
      )}

      <section id="preview-invite" data-preview="invite" className={`px-6 py-12 ${mark('invitation')}`}>
        <InvitationCard config={config} accent={accent} theme={theme} />
      </section>

      <section id="preview-schedule" data-preview="schedule" className={`px-6 py-16 ${mark('schedule')}`}>
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-center text-3xl">{ui.schedule}</h2>
          <div className="mt-10 space-y-4">
            {config.schedule.items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/10 p-5"
                style={{ background: theme.card }}
              >
                <p className="text-sm font-semibold" style={{ color: accent }}>
                  {item.time || ui.timeTbd}
                </p>
                <h3 className="mt-1 text-lg font-semibold">{item.title || ui.moment}</h3>
                <p className="mt-1 text-sm" style={{ color: theme.muted }}>
                  {[item.place, item.address].filter(Boolean).join(' · ') || ui.placeTbd}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {(config.venues.dressCode || config.venues.parking || config.venues.hotels.length > 0) && (
        <section id="preview-venues" data-preview="venues" className={`px-6 py-16 ${mark('venues')}`}>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            <div className="rounded-2xl p-6" style={{ background: theme.card }}>
              <h3 className="font-display text-xl">Dress code</h3>
              <p className="mt-2" style={{ color: theme.muted }}>
                {config.venues.dressCode || 'A definir'}
              </p>
              {config.venues.parking ? (
                <>
                  <h3 className="font-display mt-6 text-xl">Estacionamento</h3>
                  <p className="mt-2" style={{ color: theme.muted }}>
                    {config.venues.parking}
                  </p>
                </>
              ) : null}
            </div>
            <div className="rounded-2xl p-6" style={{ background: theme.card }}>
              <h3 className="font-display text-xl">Hotéis</h3>
                  {config.venues.hotels.length === 0 ? (
                <p className="mt-2" style={{ color: theme.muted }}>
                  {ui.hotelsEmpty}
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {config.venues.hotels.map((hotel) => (
                    <li key={hotel.id}>
                      <p className="font-semibold">{hotel.name}</p>
                      <p className="text-sm" style={{ color: theme.muted }}>
                        {hotel.notes}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      {config.media.gallery.length > 0 && (
        <section id="preview-gallery" data-preview="gallery" className={`px-6 py-16 ${mark('media')}`}>
          <h2 className="font-display mb-8 text-center text-3xl">Galeria</h2>
          <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 md:grid-cols-3">
            {config.media.gallery.map((src, i) => (
              <div
                key={`${src}-${i}`}
                className="aspect-[4/3] overflow-hidden rounded-2xl bg-black/20"
                style={{
                  backgroundImage: `url(${src})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            ))}
          </div>
        </section>
      )}

      {config.faq.items.length > 0 && (
        <section id="preview-faq" data-preview="faq" className={`px-6 py-16 ${mark('faq')}`}>
          <div className="mx-auto max-w-3xl">
            <h2 className="font-display text-center text-3xl">{ui.faq}</h2>
            <div className="mt-8 space-y-4">
              {config.faq.items.map((item) => (
                <div key={item.id} className="rounded-2xl p-5" style={{ background: theme.card }}>
                  <h3 className="font-semibold">{item.question || ui.question}</h3>
                  <p className="mt-2 text-sm" style={{ color: theme.muted }}>
                    {item.answer || ui.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="preview-rsvp" data-preview="rsvp" className={`px-6 py-20 ${mark('rsvp')}`}>
        <div
          className="mx-auto max-w-xl rounded-3xl border border-white/10 p-8 text-center"
          style={{ background: theme.card }}
        >
          <h2 className="font-display text-3xl">RSVP</h2>
          <p className="mt-3" style={{ color: theme.muted }}>
            {ui.rsvpUntil}{' '}
            {config.rsvp.deadline ? formatEventDate(config.rsvp.deadline, locale) : ui.deadlineTbd}.
          </p>
          {config.rsvp.notes ? (
            <p className="mt-2 text-sm" style={{ color: theme.muted }}>
              {config.rsvp.notes}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {config.rsvp.meals.filter(Boolean).map((meal) => (
              <span
                key={meal}
                className="rounded-full px-3 py-1 text-xs font-semibold"
                style={{ background: `${accent}22`, color: accent }}
              >
                {meal}
              </span>
            ))}
          </div>
          {interactive ? (
            <a
              href="#rsvp-form"
              className="mt-8 inline-block rounded-full px-8 py-3 font-semibold text-black"
              style={{ background: accent }}
            >
              {ui.confirm}
            </a>
          ) : (
            <span
              className="mt-8 inline-block rounded-full px-8 py-3 font-semibold text-black"
              style={{ background: accent }}
            >
              {ui.confirm}
            </span>
          )}
        </div>
      </section>
    </div>
  )
}

function EnvelopeCard({
  config,
  accent,
  theme,
}: {
  config: EventConfig
  accent: string
  theme: (typeof THEME_PRESETS)[ThemeId]
}) {
  return (
    <div className="mx-auto max-w-md">
      <div
        className="relative overflow-hidden rounded-2xl border border-white/10 p-8 text-center shadow-2xl"
        style={{ background: theme.inviteBg, color: theme.inviteText }}
      >
        <div
          className="absolute inset-x-0 top-0 h-16"
          style={{
            background: `linear-gradient(135deg, transparent 49%, ${accent} 50%, transparent 51%), linear-gradient(-135deg, transparent 49%, ${accent} 50%, transparent 51%)`,
            backgroundSize: '100% 100%',
            opacity: 0.25,
          }}
        />
        <p className="text-xs uppercase tracking-[0.3em]" style={{ color: accent }}>
          Save the Date
        </p>
        <p className="font-display mt-4 text-3xl">{config.basics.honoreeName || wizardUi(config.locales.default).site.honoreeFallback}</p>
        <p className="mt-3 text-sm leading-relaxed">{config.saveTheDate.message}</p>
        <p className="mt-6 text-xs uppercase tracking-widest opacity-70">
          {config.saveTheDate.envelopeLabel}
        </p>
      </div>
    </div>
  )
}

function InvitationCard({
  config,
  accent,
  theme,
}: {
  config: EventConfig
  accent: string
  theme: (typeof THEME_PRESETS)[ThemeId]
}) {
  return (
    <div
      className="relative mx-auto max-w-lg rounded-[2rem] px-10 py-12 text-center shadow-2xl"
      style={{ background: theme.inviteBg, color: theme.inviteText }}
    >
      <div
        className="absolute left-1/2 top-0 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full text-[10px] font-bold uppercase tracking-wider text-black shadow-lg"
        style={{ background: config.invitation.sealImageUrl ? theme.inviteBg : accent }}
      >
        {config.invitation.sealImageUrl ? (
          <img
            src={config.invitation.sealImageUrl}
            alt={config.invitation.sealLabel || ''}
            className="h-full w-full object-contain p-1"
          />
        ) : (
          config.invitation.sealLabel || 'Mitzvah'
        )}
      </div>
      <p className="mt-4 text-sm italic opacity-80">{config.invitation.greeting}</p>
      <h2 className="font-display mt-4 text-4xl">{config.basics.honoreeName || wizardUi(config.locales.default).site.honoreeFallback}</h2>
      <p className="mt-4 leading-relaxed">{config.invitation.body}</p>
      <p className="mt-8 text-sm font-semibold">{config.invitation.hostLine}</p>
    </div>
  )
}
