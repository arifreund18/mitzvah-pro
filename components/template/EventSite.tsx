import type { EventConfig, ThemeId, WizardStepId } from '@/lib/platform/types'
import { formatEventDate, typeLabel, wizardUi } from '@/lib/platform/copy'
import { templateUi } from '@/lib/platform/template-copy'
import { googleCalendarUrl } from '@/lib/platform/calendar'
import { EventCountdown } from '@/components/template/EventCountdown'
import { EventFaq } from '@/components/template/EventFaq'
import { EventPlaces } from '@/components/template/EventPlaces'

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
  const site = wizardUi(locale).site
  const ui = templateUi(locale)
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  const type = typeLabel(config.basics.type, locale)
  const name = config.basics.honoreeName || site.honoreeFallback
  const dateLabel = formatEventDate(config.basics.date, locale, site.dateTbd)
  const place = [config.basics.city, config.basics.country].filter(Boolean).join(', ')
  const calendar = googleCalendarUrl(config)
  const interactive = mode === 'live'
  const hasContact = Boolean(config.contact.phone || config.contact.email || config.contact.whatsapp)

  const mark = (id: string) =>
    highlight === id ||
    (highlight === 'basics' && id === 'hero') ||
    (highlight === 'branding' && id === 'hero') ||
    (highlight === 'domain' && id === 'hero') ||
    (highlight === 'review' && id === 'hero') ||
    (highlight === 'guestsBootstrap' && id === 'rsvp')
      ? 'ring-2 ring-offset-2 ring-offset-transparent'
      : ''

  const nav = [
    { href: '#welcome', label: ui.welcome, show: Boolean(config.story.parentsMessage) },
    { href: '#about', label: ui.about, show: Boolean(config.story.about || config.story.honoreeBio) },
    { href: '#schedule', label: ui.schedule, show: config.schedule.items.length > 0 },
    { href: '#faq', label: ui.faq, show: config.faq.items.length > 0 },
    { href: '#hotels', label: ui.hotels, show: config.venues.hotels.length > 0 },
    { href: '#places', label: ui.thingsToDo, show: config.places.length > 0 },
    { href: '#gallery', label: ui.gallery, show: config.media.gallery.length > 0 },
    { href: '#rsvp', label: 'RSVP', show: true },
    { href: '#contact', label: ui.contact, show: hasContact },
  ].filter((item) => item.show)

  return (
    <div
      lang={locale}
      dir={dir}
      className="min-h-full"
      style={{ background: theme.bg, color: theme.text, ['--accent' as string]: accent }}
    >
      <nav className="sticky top-0 z-20 hidden border-b border-white/10 bg-[inherit]/90 px-4 py-3 text-xs uppercase tracking-widest backdrop-blur md:block">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-4 opacity-80">
          {nav.map((item) => (
            <a key={item.href} href={item.href} className="hover:opacity-100">
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      <section
        id="preview-hero"
        data-preview="hero"
        className={`relative overflow-hidden px-6 py-20 text-center ${mark('hero')}`}
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
            style={{ background: `radial-gradient(ellipse at top, ${accent}33, transparent 55%)` }}
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
          ✦ {ui.joinUs} ✦
        </p>
        <h1 className="font-display relative mt-4 text-4xl font-bold md:text-6xl">
          {config.story.headline || `${type} · ${name}`}
        </h1>
        <p className="relative mt-4 text-lg" style={{ color: theme.muted }}>
          {dateLabel}
          {place ? ` · ${place}` : ''}
        </p>
        {config.story.subtitle ? (
          <p className="relative mx-auto mt-3 max-w-xl" style={{ color: theme.muted }}>
            {config.story.subtitle}
          </p>
        ) : null}
        <EventCountdown
          date={config.basics.date}
          accent={accent}
          labels={{ days: ui.days, hours: ui.hours, minutes: ui.minutes, seconds: ui.seconds }}
        />
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <a
            href="#rsvp"
            className="inline-block rounded-full px-8 py-3 font-semibold text-black"
            style={{ background: accent }}
          >
            {ui.rsvpNow}
          </a>
          {calendar ? (
            <a
              href={calendar}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-full border border-white/20 px-6 py-3 text-sm"
            >
              {ui.addToCalendar}
            </a>
          ) : null}
        </div>
      </section>

      {config.story.parentsMessage ? (
        <section
          id="welcome"
          data-preview="story"
          className={`mx-auto max-w-3xl px-6 py-16 text-center ${mark('story')}`}
        >
          <p className="text-xs uppercase tracking-[0.3em]" style={{ color: accent }}>
            {ui.welcome}
          </p>
          <p className="mt-2 text-sm opacity-70">{ui.theFamily}</p>
          <p className="font-display mt-6 text-xl leading-relaxed">{config.story.parentsMessage}</p>
        </section>
      ) : null}

      {(config.story.about || config.story.honoreeBio) && (
        <section id="about" className={`mx-auto max-w-3xl px-6 py-16 ${mark('story')}`}>
          {config.story.about ? (
            <>
              <h2 className="font-display text-center text-3xl">{ui.about}</h2>
              <p className="mt-6 leading-relaxed" style={{ color: theme.muted }}>
                {config.story.about}
              </p>
            </>
          ) : null}
          {config.story.honoreeBio ? (
            <>
              <h3 className="font-display mt-10 text-2xl">{ui.aboutHonoree}</h3>
              <p className="mt-4 leading-relaxed" style={{ color: theme.muted }}>
                {config.story.honoreeBio}
              </p>
            </>
          ) : null}
        </section>
      )}

      <section
        id="schedule"
        data-preview="schedule"
        className={`px-6 py-16 ${mark('schedule')}`}
      >
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
                  {item.time || site.timeTbd}
                </p>
                <h3 className="mt-1 text-lg font-semibold">{item.title || site.moment}</h3>
                <p className="mt-1 text-sm" style={{ color: theme.muted }}>
                  {[item.place, item.address].filter(Boolean).join(' · ') || site.placeTbd}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {(config.venues.dressCode || config.venues.parking) && (
        <section id="preview-venues" data-preview="venues" className={`px-6 py-8 ${mark('venues')}`}>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            {config.venues.dressCode ? (
              <div className="rounded-2xl p-6" style={{ background: theme.card }}>
                <h3 className="font-display text-xl">{ui.dressCode}</h3>
                <p className="mt-2" style={{ color: theme.muted }}>
                  {config.venues.dressCode}
                </p>
              </div>
            ) : null}
            {config.venues.parking ? (
              <div className="rounded-2xl p-6" style={{ background: theme.card }}>
                <h3 className="font-display text-xl">{ui.parking}</h3>
                <p className="mt-2" style={{ color: theme.muted }}>
                  {config.venues.parking}
                </p>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {config.faq.items.length > 0 && (
        <section id="faq" data-preview="faq" className={`px-6 py-16 ${mark('faq')}`}>
          <div className="mx-auto max-w-3xl">
            <h2 className="font-display text-center text-3xl">{ui.faq}</h2>
            <EventFaq items={config.faq.items} accent={accent} card={theme.card} muted={theme.muted} />
          </div>
        </section>
      )}

      {config.venues.hotels.length > 0 && (
        <section id="hotels" className={`px-6 py-16 ${mark('venues')}`}>
          <h2 className="font-display mb-10 text-center text-3xl">{ui.hotels}</h2>
          <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
            {config.venues.hotels.map((hotel) => (
              <div key={hotel.id} className="rounded-2xl p-6" style={{ background: theme.card }}>
                <h3 className="text-lg font-semibold">{hotel.name}</h3>
                {hotel.walking ? (
                  <p className="mt-1 text-sm" style={{ color: accent }}>
                    {hotel.walking} {ui.walking}
                  </p>
                ) : null}
                {hotel.notes ? (
                  <p className="mt-2 text-sm" style={{ color: theme.muted }}>
                    {hotel.notes}
                  </p>
                ) : null}
                <div className="mt-3 flex gap-3 text-sm" style={{ color: accent }}>
                  {hotel.url ? (
                    <a href={hotel.url} target="_blank" rel="noreferrer">
                      {ui.website}
                    </a>
                  ) : null}
                  {hotel.mapUrl ? (
                    <a href={hotel.mapUrl} target="_blank" rel="noreferrer">
                      {ui.map}
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {config.places.length > 0 && (
        <section id="places" className="px-6 py-16">
          <h2 className="font-display mb-8 text-center text-3xl">{ui.thingsToDo}</h2>
          <EventPlaces
            places={config.places}
            labels={ui.categories}
            accent={accent}
            card={theme.card}
            muted={theme.muted}
          />
        </section>
      )}

      {config.media.gallery.length > 0 && (
        <section id="gallery" data-preview="gallery" className={`px-6 py-16 ${mark('media')}`}>
          <h2 className="font-display mb-8 text-center text-3xl">{ui.gallery}</h2>
          <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 md:grid-cols-3">
            {config.media.gallery.map((src, i) => (
              <div
                key={`${src}-${i}`}
                className="aspect-[4/3] overflow-hidden rounded-2xl bg-black/20"
                style={{ backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              />
            ))}
          </div>
        </section>
      )}

      <section id="rsvp" data-preview="rsvp" className={`px-6 py-20 ${mark('rsvp')}`}>
        <div
          className="mx-auto max-w-xl rounded-3xl border border-white/10 p-8 text-center"
          style={{ background: theme.card }}
        >
          <h2 className="font-display text-3xl">RSVP</h2>
          <p className="mt-3" style={{ color: theme.muted }}>
            {site.rsvpUntil}{' '}
            {config.rsvp.deadline ? formatEventDate(config.rsvp.deadline, locale) : site.deadlineTbd}.
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
              {ui.confirmRsvp}
            </a>
          ) : (
            <span
              className="mt-8 inline-block rounded-full px-8 py-3 font-semibold text-black"
              style={{ background: accent }}
            >
              {ui.confirmRsvp}
            </span>
          )}
        </div>
      </section>

      {hasContact ? (
        <section id="contact" className="px-6 py-16 text-center">
          <h2 className="font-display text-3xl">{ui.contact}</h2>
          <div className="mx-auto mt-6 flex max-w-lg flex-col gap-2 text-sm" style={{ color: theme.muted }}>
            {config.contact.phone ? (
              <p>
                {ui.phone}: {config.contact.phone}
              </p>
            ) : null}
            {config.contact.email ? (
              <p>
                {ui.email}: {config.contact.email}
              </p>
            ) : null}
            {config.contact.whatsapp ? (
              <p>
                {ui.whatsapp}: {config.contact.whatsapp}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm opacity-60">
        {name} · {type}
      </footer>
    </div>
  )
}
