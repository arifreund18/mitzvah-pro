import type { EventConfig, EventLocale, EventType, PlatformEvent } from './types'
import { uid } from './ids'

export function createDefaultConfig(partial?: {
  honoreeName?: string
  familyName?: string
  type?: EventType
  locale?: EventLocale
  slug?: string
}): EventConfig {
  const honoreeName = partial?.honoreeName?.trim() || ''
  const familyName = partial?.familyName?.trim() || ''
  const type = partial?.type ?? 'bar'
  const locale = partial?.locale ?? 'pt'
  const slug = partial?.slug || ''

  return {
    basics: {
      type,
      honoreeName,
      familyName,
      date: '',
      city: '',
      country: '',
    },
    locales: {
      default: locale,
      enabled: locale === 'en' ? ['en', 'pt'] : [locale, 'en'],
    },
    branding: {
      theme: 'navy',
      primaryColor: '#0b1020',
      accentColor: '#22d3ee',
    },
    story: {
      headline: honoreeName ? `A celebração de ${honoreeName}` : 'A celebração da nossa família',
      subtitle: 'Save the date, convite e site — tudo em um só lugar.',
      parentsMessage: '',
      about: '',
    },
    schedule: {
      items: [
        {
          id: uid(),
          title: 'Cerimônia',
          time: '10:00',
          place: '',
          address: '',
        },
        {
          id: uid(),
          title: 'Recepção',
          time: '19:00',
          place: '',
          address: '',
        },
      ],
    },
    venues: {
      dressCode: '',
      parking: '',
      hotels: [],
    },
    media: {
      heroUrl: '',
      gallery: [],
    },
    saveTheDate: {
      enabled: true,
      message: honoreeName
        ? `Reserve a data da ${typeLabel(type)} de ${honoreeName}`
        : 'Reserve esta data especial',
      envelopeLabel: 'Abrir save the date',
    },
    invitation: {
      greeting: 'Com alegria, convidamos você',
      body: honoreeName
        ? `para celebrar a ${typeLabel(type)} de ${honoreeName}.`
        : 'para celebrar conosco este marco da nossa família.',
      hostLine: familyName ? `Família ${familyName}` : 'Com carinho, a família',
      sealLabel: 'Mitzvah',
    },
    rsvp: {
      deadline: '',
      meals: ['Kosher', 'Vegetariano', 'Infantil'],
      allowPlusOne: true,
      collectDietary: true,
      notes: '',
    },
    faq: { items: [] },
    domain: {
      slug,
      seoTitle: honoreeName ? `${honoreeName} — Mitzvah.pro` : 'Celebração — Mitzvah.pro',
      seoDescription: 'Convite digital, save the date e RSVP.',
    },
  }
}

export function typeLabel(type: EventType): string {
  switch (type) {
    case 'bar':
      return 'Bar Mitzvah'
    case 'bat':
      return 'Bat Mitzvah'
    case 'bnei':
      return 'Bnei Mitzvah'
    default:
      return 'celebração'
  }
}

export function createSeedEvent(): PlatformEvent {
  const now = new Date().toISOString()
  const config = createDefaultConfig({
    honoreeName: 'Beni',
    familyName: 'Freund',
    type: 'bar',
    locale: 'pt',
    slug: 'beni',
  })
  config.basics.date = '2026-11-14'
  config.basics.city = 'São Paulo'
  config.basics.country = 'Brasil'
  config.story.headline = 'Bar Mitzvah do Beni'
  config.story.subtitle = 'Um shabat de alegria, família e tradição.'
  config.story.parentsMessage =
    'É com o coração cheio que convidamos vocês a celebrar com a gente este momento tão especial da vida do Beni.'
  config.story.about =
    'Beni completa 13 anos e sobe à Torah. Depois da cerimônia, vamos reunir quem amamos para uma festa íntima e elegante.'
  config.schedule.items = [
    {
      id: uid(),
      title: 'Kabbalat Shabbat',
      time: '18:30',
      place: 'Sinagoga',
      address: 'São Paulo',
    },
    {
      id: uid(),
      title: 'Shacharit & Torah',
      time: '09:00',
      place: 'Sinagoga',
      address: 'São Paulo',
    },
    {
      id: uid(),
      title: 'Recepção',
      time: '20:00',
      place: 'Salão',
      address: 'São Paulo',
    },
  ]
  config.venues.dressCode = 'Esporte fino / elegante'
  config.venues.parking = 'Valet no local da recepção'
  config.venues.hotels = [
    {
      id: uid(),
      name: 'Hotel exemplo',
      url: 'https://mitzvah.pro',
      notes: 'Bloco de quartos sob consulta',
    },
  ]
  config.saveTheDate.message = 'Reserve o shabat de 14 de novembro — Bar Mitzvah do Beni'
  config.invitation.body =
    'para celebrar a Bar Mitzvah do Beni. Sua presença torna este dia ainda mais especial.'
  config.rsvp.deadline = '2026-10-20'
  config.rsvp.notes = 'Por favor confirme também restrições alimentares.'
  config.faq.items = [
    {
      id: uid(),
      question: 'Tem dress code?',
      answer: 'Sim — esporte fino. Evite jeans rasgado e chinelo.',
    },
    {
      id: uid(),
      question: 'Crianças são bem-vindas?',
      answer: 'Sim, com confirmação no RSVP.',
    },
  ]
  config.domain.seoTitle = 'Bar Mitzvah do Beni'
  config.domain.seoDescription = 'Save the date, convite e RSVP da celebração.'

  return {
    id: 'seed-beni',
    slug: 'beni',
    status: 'published',
    templateId: 'barbeni',
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
    config,
    guests: [],
    wizard: {
      currentStep: 'review',
      completedSteps: [
        'basics',
        'locales',
        'branding',
        'story',
        'schedule',
        'venues',
        'media',
        'saveTheDate',
        'invitation',
        'rsvp',
        'faq',
        'domain',
      ],
    },
  }
}
