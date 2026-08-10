import type { Metadata } from 'next'
import { createTranslator } from 'next-intl'
import { PlatformContactForm } from '@/components/mitzvah/PlatformContactForm'
import { PlatformLanguageSwitcher } from '@/components/mitzvah/PlatformLanguageSwitcher'
import { getMessages, isLocale, isRtlLocale, type Locale } from '@/lib/i18n'
import { MITZVAH_CONTACT_EMAIL } from '@/lib/contact'

const FEATURE_KEYS = ['std', 'invite', 'rsvp', 'site', 'guests', 'calendar'] as const
const FEATURE_ICONS = ['✉️', '💌', '✅', '🌐', '👥', '📅'] as const
const STEP_KEYS = ['1', '2', '3', '4'] as const
const PLAN_KEYS = ['mitzvah', 'signature'] as const

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const messages = await getMessages(locale)
  return {
    title: messages.meta.title,
    description: messages.meta.description,
    openGraph: {
      title: 'Mitzvah.pro',
      description: messages.meta.description,
      url: 'https://mitzvah.pro',
    },
  }
}

function Nav({ locale }: { locale: Locale }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0b1020]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#" className="font-display text-xl font-bold tracking-tight text-white">
          Mitzvah<span className="text-cyan-400">.pro</span>
        </a>
        <nav className="flex items-center gap-4 text-sm text-white/70 md:gap-8">
          <div className="hidden items-center gap-8 md:flex">
            <NavLink id="features" locale={locale} />
            <NavLink id="howItWorks" locale={locale} />
            <NavLink id="pricing" locale={locale} />
            <NavLink id="contact" locale={locale} cta />
          </div>
          <PlatformLanguageSwitcher locale={locale} />
        </nav>
      </div>
    </header>
  )
}

async function NavLink({
  id,
  cta,
  locale,
}: {
  id: string
  cta?: boolean
  locale: Locale
}) {
  const messages = await getMessages(locale)
  const t = createTranslator({ locale, messages, namespace: 'nav' })
  const href = `#${id === 'howItWorks' ? 'how-it-works' : id}`
  const label = t(id as 'features' | 'howItWorks' | 'pricing' | 'contact')
  if (cta) {
    return (
      <a
        href={href}
        className="hidden rounded-full bg-cyan-400 px-5 py-2 font-semibold text-[#0b1020] hover:brightness-110 md:inline"
      >
        {label}
      </a>
    )
  }
  return (
    <a href={href} className="hover:text-white">
      {label}
    </a>
  )
}

export default async function PlatformPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  if (!isLocale(raw)) return null
  const locale = raw
  const messages = await getMessages(locale)
  const t = createTranslator({ locale, messages })
  const tn = createTranslator({ locale, messages, namespace: 'nav' })

  const plans = PLAN_KEYS.map((key, i) => ({
    key,
    highlight: i === 1,
    name: t(`pricing.plans.${key}.name`),
    tagline: t(`pricing.plans.${key}.tagline`),
    domain: t(`pricing.plans.${key}.domain`),
    perks: t.raw(`pricing.plans.${key}.perks`) as string[],
  }))

  return (
    <div
      className="bg-[#0b1020] text-white"
      lang={locale}
      dir={isRtlLocale(locale) ? 'rtl' : 'ltr'}
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,212,255,0.18),_transparent_55%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(255,45,120,0.12),_transparent_50%)]" />

      <Nav locale={locale} />

      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-24 text-center">
        <p className="mb-4 text-xs uppercase tracking-[0.35em] text-cyan-300/90">{t('hero.eyebrow')}</p>
        <h1 className="font-display max-w-4xl text-4xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl">
          {t('hero.title')}{' '}
          <span className="bg-gradient-to-r from-cyan-300 to-rose-300 bg-clip-text text-transparent">
            {t('hero.titleHighlight')}
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-white/65 md:text-xl">{t('hero.subtitle')}</p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#contact"
            className="rounded-full bg-cyan-400 px-8 py-3.5 font-semibold text-[#0b1020] transition hover:brightness-110"
          >
            {t('hero.ctaPrimary')}
          </a>
          <a
            href="#pricing"
            className="rounded-full border border-white/25 px-8 py-3.5 font-semibold text-white transition hover:bg-white/10"
          >
            {t('hero.ctaSecondary')}
          </a>
        </div>
      </section>

      <section id="features" className="relative px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-center text-3xl font-bold md:text-5xl">{t('features.title')}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-white/60">{t('features.subtitle')}</p>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURE_KEYS.map((key, i) => (
              <div
                key={key}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:border-cyan-400/30 hover:bg-white/[0.07]"
              >
                <span className="text-3xl">{FEATURE_ICONS[i]}</span>
                <h3 className="mt-4 text-lg font-semibold">{t(`features.items.${key}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  {t(`features.items.${key}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="relative border-y border-white/10 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-center text-3xl font-bold md:text-5xl">
            {t('howItWorks.title')}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-white/60">{t('howItWorks.subtitle')}</p>
          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {STEP_KEYS.map((key) => (
              <div key={key} className="text-center md:text-start">
                <span className="font-display text-4xl font-bold text-cyan-400/40">{key}</span>
                <h3 className="mt-2 text-lg font-semibold">{t(`howItWorks.steps.${key}.title`)}</h3>
                <p className="mt-2 text-sm text-white/60">{t(`howItWorks.steps.${key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="relative px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-center text-3xl font-bold md:text-5xl">{t('pricing.title')}</h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-white/60">{t('pricing.subtitle')}</p>
          <div className="mt-16 grid gap-8 lg:grid-cols-2">
            {plans.map((plan) => (
              <div
                key={plan.key}
                className={`relative flex flex-col rounded-3xl border p-8 ${
                  plan.highlight
                    ? 'border-cyan-400/50 bg-gradient-to-b from-cyan-400/10 to-transparent shadow-[0_0_60px_rgba(0,212,255,0.12)]'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-cyan-400 px-4 py-1 text-xs font-bold uppercase tracking-wider text-[#0b1020]">
                    {t('pricing.popular')}
                  </span>
                )}
                <h3 className="font-display text-2xl font-bold">{plan.name}</h3>
                <p className="mt-1 text-sm text-white/60">{plan.tagline}</p>
                <p className="mt-6 font-display text-3xl font-bold">{t('pricing.price')}</p>
                <p className="mt-2 rounded-lg bg-white/5 px-3 py-2 font-mono text-sm text-cyan-300/90">
                  {plan.domain}
                </p>
                <ul className="mt-8 flex-1 space-y-3">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex gap-3 text-sm text-white/75">
                      <span className="text-cyan-400">✓</span>
                      {perk}
                    </li>
                  ))}
                </ul>
                <a
                  href="#contact"
                  className={`mt-8 block rounded-full py-3 text-center font-semibold transition ${
                    plan.highlight
                      ? 'bg-cyan-400 text-[#0b1020] hover:brightness-110'
                      : 'border border-white/25 hover:bg-white/10'
                  }`}
                >
                  {t('pricing.cta')}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="relative border-t border-white/10 px-6 py-24">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold md:text-4xl">{t('contact.title')}</h2>
            <p className="mt-4 text-white/60">{t('contact.subtitle')}</p>
            <a
              href={`mailto:${MITZVAH_CONTACT_EMAIL}`}
              className="mt-8 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-4 text-cyan-300 transition hover:border-cyan-400/40"
            >
              <span>✉️</span>
              <span>{MITZVAH_CONTACT_EMAIL}</span>
            </a>
            <p className="mt-4 text-xs text-white/40">{t('contact.forwardNote')}</p>
          </div>
          <PlatformContactForm />
        </div>
      </section>

      <footer className="relative border-t border-white/10 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-white/40 md:flex-row">
          <p>
            © {new Date().getFullYear()} Mitzvah.pro — {t('footer.tagline')}
          </p>
          <PlatformLanguageSwitcher locale={locale} />
        </div>
      </footer>

      {/* Mobile nav CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0b1020]/95 p-4 md:hidden">
        <a
          href="#contact"
          className="block rounded-full bg-cyan-400 py-3 text-center font-semibold text-[#0b1020]"
        >
          {tn('contact')}
        </a>
      </div>
    </div>
  )
}
