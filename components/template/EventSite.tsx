import type { EventConfig, EventLocale, Guest, WizardStepId } from '@/lib/platform/types'
import { formatEventDate, typeLabel, wizardUi } from '@/lib/platform/copy'
import {
  getLocalizedFaqItem,
  getLocalizedHotel,
  getLocalizedPlace,
  getLocalizedScheduleItem,
  getLocalizedStory,
} from '@/lib/platform/i18n-content'
import { templateUi } from '@/lib/platform/template-copy'
import { googleCalendarUrl } from '@/lib/platform/calendar'
import { ComingSoon } from '@/components/template/ComingSoon'
import { EventAmbientAudio } from '@/components/template/EventAmbientAudio'
import { EventContactForm } from '@/components/template/EventContactForm'
import { EventCountdown } from '@/components/template/EventCountdown'
import { EventFaq } from '@/components/template/EventFaq'
import { EventGalleryLightbox } from '@/components/template/EventGalleryLightbox'
import { EventPlaces } from '@/components/template/EventPlaces'
import { EventSiteLocales } from '@/components/template/EventSiteLocales'
import { THEME_PRESETS } from '@/components/template/theme-presets'

export { THEME_PRESETS }

function starsLabel(stars: number): string {
  const n = Math.max(0, Math.min(5, Math.round(stars || 0)))
  if (!n) return ''
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}

export function EventSite({
  config,
  highlight,
  mode = 'live',
  displayLocale,
  slug,
  eventId,
  guestToken,
  guest,
}: {
  config: EventConfig
  highlight?: WizardStepId | string
  mode?: 'live' | 'preview'
  displayLocale?: EventLocale
  slug?: string
  eventId?: string
  guestToken?: string
  guest?: Guest | null
}) {
  const theme = THEME_PRESETS[config.branding.theme]
  const accent = config.branding.accentColor || '#22d3ee'
  const locale = displayLocale || config.locales.default
  if (mode === 'live' && config.legal.comingSoon) {
    return <ComingSoon config={config} locale={locale} />
  }
  const story = getLocalizedStory(config, locale)
  const site = wizardUi(locale).site
  const ui = templateUi(locale)
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  const type = typeLabel(config.basics.type, locale)
  const name = config.basics.honoreeName || site.honoreeFallback
  const dateLabel = formatEventDate(config.basics.date, locale, site.dateTbd)
  const place = [config.basics.city, config.basics.country].filter(Boolean).join(', ')
  const calendar = googleCalendarUrl(config)
  const interactive = mode === 'live'
  const people = config.contact.people?.length
    ? config.contact.people
    : config.contact.phone || config.contact.email || config.contact.whatsapp
      ? [
          {
            id: 'legacy',
            name: '',
            phone: config.contact.phone,
            email: config.contact.email,
            whatsapp: config.contact.whatsapp,
            whatsappLabel: '',
          },
        ]
      : []
  const hasContact = people.length > 0 || Boolean(config.contact.formEnabled && eventId)
  const publishedFaq = config.faq.items
    .filter((item) => item.published !== false)
    .map((item) => getLocalizedFaqItem(config, locale, item))
  const scheduleItems = config.schedule.items.map((item) =>
    getLocalizedScheduleItem(config, locale, item),
  )
  const galleryItems = (config.media.galleryItems?.length
    ? config.media.galleryItems
    : (config.media.gallery || []).map((url, i) => ({
        id: `legacy-${i}`,
        url,
        type: 'image' as const,
        caption: '',
        approved: true,
        showOnSite: true,
        sortOrder: i,
      }))
  )
    .filter((item) => item.showOnSite !== false && item.approved !== false && item.url)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const hotels = [...config.venues.hotels]
    .map((hotel) => getLocalizedHotel(config, locale, hotel))
    .sort((a, b) => Number(b.featured) - Number(a.featured))
  const places = config.places.map((item) => getLocalizedPlace(config, locale, item))

  const mark = (id: string) =>
    highlight === id ||
    (highlight === 'basics' && id === 'hero') ||
    (highlight === 'branding' && id === 'hero') ||
    (highlight === 'domain' && id === 'hero') ||
    (highlight === 'review' && id === 'hero') ||
    (highlight === 'guestsBootstrap' && id === 'rsvp') ||
    (highlight === 'contact' && id === 'contact') ||
    (highlight === 'places' && id === 'places') ||
    (highlight === 'legal' && id === 'hero')
      ? 'ring-2 ring-offset-2 ring-offset-transparent'
      : ''

  const nav = [
    { href: '#welcome', label: ui.welcome, show: Boolean(story.parentsMessage) },
    { href: '#about', label: ui.about, show: Boolean(story.about || story.honoreeBio) },
    { href: '#schedule', label: ui.schedule, show: scheduleItems.length > 0 },
    { href: '#faq', label: ui.faq, show: publishedFaq.length > 0 },
    { href: '#hotels', label: ui.hotels, show: hotels.length > 0 },
    { href: '#travel', label: 'Travel', show: Boolean(config.travel?.enabled) },
    { href: '#places', label: ui.thingsToDo, show: places.length > 0 },
    { href: '#gallery', label: ui.gallery, show: galleryItems.length > 0 },
    { href: '#rsvp', label: 'RSVP', show: true },
    { href: '#contact', label: ui.contact, show: hasContact },
  ].filter((item) => item.show)

  const statusLabel =
    guest?.status === 'yes' ? 'Confirmed' : guest?.status === 'no' ? 'Declined' : 'Pending RSVP'

  return (
    <div
      lang={locale}
      dir={dir}
      className="min-h-full"
      style={{ background: theme.bg, color: theme.text, ['--accent' as string]: accent }}
    >
      {guest || guestToken ? (
        <div
          className="border-b border-white/10 px-4 py-2 text-center text-xs tracking-wide"
          style={{ background: `${accent}22`, color: accent }}
        >
          {guest?.familyName ? `${guest.familyName} · ` : ''}
          {statusLabel}
          {guestToken ? ` · ${guestToken.slice(0, 6)}…` : ''}
        </div>
      ) : null}

      <nav className="sticky top-0 z-20 hidden border-b border-white/10 bg-[inherit]/90 px-4 py-3 text-xs uppercase tracking-widest backdrop-blur md:block">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-4 opacity-80">
          {nav.map((item) => (
            <a key={item.href} href={item.href} className="hover:opacity-100">
              {item.label}
            </a>
          ))}
        </div>
        {mode === 'live' && slug ? (
          <div className="mt-2">
            <EventSiteLocales
              slug={slug}
              enabled={config.locales.enabled}
              current={locale}
              accent={accent}
            />
          </div>
        ) : null}
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
        {mode === 'live' && slug ? (
          <div className="relative mt-4 md:hidden">
            <EventSiteLocales
              slug={slug}
              enabled={config.locales.enabled}
              current={locale}
              accent={accent}
            />
          </div>
        ) : null}
        <h1 className="font-display relative mt-4 text-4xl font-bold md:text-6xl">
          {story.headline || `${type} · ${name}`}
        </h1>
        <p className="relative mt-4 text-lg" style={{ color: theme.muted }}>
          {dateLabel}
          {config.basics.startTime ? ` · ${config.basics.startTime}` : ''}
          {place ? ` · ${place}` : ''}
        </p>
        {story.subtitle ? (
          <p className="relative mx-auto mt-3 max-w-xl" style={{ color: theme.muted }}>
            {story.subtitle}
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

      {story.parentsMessage ? (
        <section
          id="welcome"
          data-preview="story"
          className={`mx-auto max-w-3xl px-6 py-16 text-center ${mark('story')}`}
        >
          <p className="text-xs uppercase tracking-[0.3em]" style={{ color: accent }}>
            {ui.welcome}
          </p>
          <p className="mt-2 text-sm opacity-70">{ui.theFamily}</p>
          <p className="font-display mt-6 text-xl leading-relaxed">{story.parentsMessage}</p>
        </section>
      ) : null}

      {(story.about || story.honoreeBio) && (
        <section id="about" className={`mx-auto max-w-3xl px-6 py-16 ${mark('story')}`}>
          {story.about ? (
            <>
              <h2 className="font-display text-center text-3xl">{ui.about}</h2>
              <p className="mt-6 leading-relaxed" style={{ color: theme.muted }}>
                {story.about}
              </p>
            </>
          ) : null}
          {story.honoreeBio ? (
            <>
              <h3 className="font-display mt-10 text-2xl">{ui.aboutHonoree}</h3>
              <p className="mt-4 leading-relaxed" style={{ color: theme.muted }}>
                {story.honoreeBio}
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
            {scheduleItems
              .filter((item) => mode === 'preview' || item.visibility !== 'invite' || Boolean(guest))
              .map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/10 p-5"
                style={{ background: theme.card }}
              >
                <p className="text-sm font-semibold" style={{ color: accent }}>
                  {[item.dayLabel, item.date, item.time].filter(Boolean).join(' · ') || site.timeTbd}
                  {item.timeEnd ? ` – ${item.timeEnd}` : ''}
                </p>
                <h3 className="mt-1 text-lg font-semibold">{item.title || site.moment}</h3>
                <p className="mt-1 text-sm" style={{ color: theme.muted }}>
                  {[item.place, item.address].filter(Boolean).join(' · ') || site.placeTbd}
                </p>
                {item.dressCode ? (
                  <p className="mt-2 text-xs" style={{ color: theme.muted }}>
                    {ui.dressCode}: {item.dressCode}
                  </p>
                ) : null}
                {item.notes ? (
                  <p className="mt-1 text-xs" style={{ color: theme.muted }}>
                    {item.notes}
                  </p>
                ) : null}
                {item.mapUrl ? (
                  <a
                    href={item.mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm"
                    style={{ color: accent }}
                  >
                    {ui.map}
                  </a>
                ) : null}
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

      {publishedFaq.length > 0 && (
        <section id="faq" data-preview="faq" className={`px-6 py-16 ${mark('faq')}`}>
          <div className="mx-auto max-w-3xl">
            <h2 className="font-display text-center text-3xl">{ui.faq}</h2>
            <EventFaq items={publishedFaq} accent={accent} card={theme.card} muted={theme.muted} />
          </div>
        </section>
      )}

      {hotels.length > 0 && (
        <section id="hotels" className={`px-6 py-16 ${mark('venues')}`}>
          <h2 className="font-display mb-10 text-center text-3xl">{ui.hotels}</h2>
          <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
            {hotels.map((hotel) => (
              <div key={hotel.id} className="overflow-hidden rounded-2xl" style={{ background: theme.card }}>
                {hotel.photoUrl ? (
                  <div
                    className="aspect-[16/9] bg-black/20"
                    style={{
                      backgroundImage: `url(${hotel.photoUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                ) : null}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold">{hotel.name}</h3>
                    {hotel.featured ? (
                      <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide" style={{ background: `${accent}33`, color: accent }}>
                        Featured
                      </span>
                    ) : null}
                  </div>
                  {hotel.stars ? (
                    <p className="mt-1 text-sm" style={{ color: accent }}>
                      {starsLabel(hotel.stars)}
                    </p>
                  ) : null}
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
                  <div className="mt-3 flex flex-wrap gap-3 text-sm" style={{ color: accent }}>
                    {hotel.bookUrl ? (
                      <a href={hotel.bookUrl} target="_blank" rel="noreferrer" className="font-semibold">
                        Book
                      </a>
                    ) : null}
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
              </div>
            ))}
          </div>
        </section>
      )}

      {config.travel?.enabled ? (
        <section id="travel" className="px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-display text-center text-3xl">Travel</h2>
            <div className="mt-8 space-y-4 text-sm" style={{ color: theme.muted }}>
              {config.travel.airports ? (
                <p>
                  <span className="font-semibold" style={{ color: accent }}>
                    Airports ·{' '}
                  </span>
                  {config.travel.airports}
                </p>
              ) : null}
              {config.travel.transport ? (
                <p>
                  <span className="font-semibold" style={{ color: accent }}>
                    Transport ·{' '}
                  </span>
                  {config.travel.transport}
                </p>
              ) : null}
              {config.travel.currency ? (
                <p>
                  <span className="font-semibold" style={{ color: accent }}>
                    Currency ·{' '}
                  </span>
                  {config.travel.currency}
                </p>
              ) : null}
              {config.travel.emergency ? (
                <p>
                  <span className="font-semibold" style={{ color: accent }}>
                    Emergency ·{' '}
                  </span>
                  {config.travel.emergency}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {places.length > 0 && (
        <section id="places" className={`px-6 py-16 ${mark('places')}`}>
          <h2 className="font-display mb-8 text-center text-3xl">{ui.thingsToDo}</h2>
          <EventPlaces
            places={places}
            labels={ui.categories}
            accent={accent}
            card={theme.card}
            muted={theme.muted}
          />
        </section>
      )}

      {galleryItems.length > 0 && (
        <section id="gallery" data-preview="gallery" className={`px-6 py-16 ${mark('media')}`}>
          <h2 className="font-display mb-8 text-center text-3xl">{ui.gallery}</h2>
          <EventGalleryLightbox items={galleryItems} accent={accent} />
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
        <section id="contact" className={`px-6 py-16 text-center ${mark('contact')}`}>
          <h2 className="font-display text-3xl">{ui.contact}</h2>
          <div className="mx-auto mt-8 grid max-w-2xl gap-4">
            {people.map((person) => (
              <div
                key={person.id}
                className="rounded-2xl p-5 text-sm"
                style={{ background: theme.card, color: theme.muted }}
              >
                {person.name ? (
                  <p className="font-semibold" style={{ color: theme.text }}>
                    {person.name}
                  </p>
                ) : null}
                {person.phone ? (
                  <p className="mt-1">
                    {ui.phone}:{' '}
                    <a href={`tel:${person.phone}`} style={{ color: accent }}>
                      {person.phone}
                    </a>
                  </p>
                ) : null}
                {person.email ? (
                  <p className="mt-1">
                    {ui.email}:{' '}
                    <a href={`mailto:${person.email}`} style={{ color: accent }}>
                      {person.email}
                    </a>
                  </p>
                ) : null}
                {person.whatsapp ? (
                  <p className="mt-1">
                    {ui.whatsapp}:{' '}
                    <a
                      href={`https://wa.me/${person.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: accent }}
                    >
                      {person.whatsappLabel || person.whatsapp}
                    </a>
                  </p>
                ) : null}
              </div>
            ))}
          </div>
          {interactive && config.contact.formEnabled && eventId ? (
            <EventContactForm eventId={eventId} accent={accent} muted={theme.muted} />
          ) : null}
        </section>
      ) : null}

      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm opacity-60">
        <p>
          {name} · {type}
        </p>
        <p className="mt-3 flex justify-center gap-4 text-xs uppercase tracking-widest">
          <a href="/privacy" className="hover:opacity-100">
            Privacy
          </a>
          <a href="/terms" className="hover:opacity-100">
            Terms
          </a>
        </p>
      </footer>

      {interactive && config.media.ambientAudioUrl ? (
        <EventAmbientAudio url={config.media.ambientAudioUrl} accent={accent} />
      ) : null}
    </div>
  )
}
