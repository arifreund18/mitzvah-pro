import type { EventConfig, EventLocale, EventType, PlatformEvent } from './types'
import { generatedCopy } from './copy'
import { uid } from './ids'
import { emptyMailDomain } from './mail-domain'

export { typeLabel } from './copy'

export function createDefaultConfig(partial?: {
  honoreeName?: string
  familyName?: string
  type?: EventType
  locale?: EventLocale
  enabled?: EventLocale[]
  slug?: string
}): EventConfig {
  const honoreeName = partial?.honoreeName?.trim() || ''
  const familyName = partial?.familyName?.trim() || ''
  const type = partial?.type ?? 'bar'
  const enabled = (partial?.enabled?.length ? partial.enabled : [partial?.locale ?? 'pt']).filter(
    (locale, index, list) => list.indexOf(locale) === index,
  )
  const locale =
    partial?.locale && enabled.includes(partial.locale) ? partial.locale : enabled[0] ?? 'pt'
  const slug = partial?.slug || ''
  const copy = generatedCopy(locale, type, honoreeName, familyName)

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
      enabled,
    },
    branding: {
      theme: 'navy',
      primaryColor: '#0b1020',
      accentColor: '#22d3ee',
    },
    story: {
      headline: copy.headline,
      subtitle: copy.subtitle,
      parentsMessage: '',
      about: '',
      honoreeBio: '',
    },
    schedule: {
      items: [
        {
          id: uid(),
          title: copy.ceremonyTitle,
          time: '10:00',
          place: '',
          address: '',
        },
        {
          id: uid(),
          title: copy.receptionTitle,
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
    places: [],
    contact: {
      phone: '',
      email: '',
      whatsapp: '',
    },
    media: {
      heroUrl: '',
      gallery: [],
    },
    saveTheDate: {
      enabled: true,
      message: copy.stdMessage,
      envelopeLabel: copy.envelopeLabel,
    },
    invitation: {
      greeting: copy.greeting,
      body: copy.inviteBody,
      hostLine: copy.hostLine,
      sealLabel: 'Mitzvah',
      sealImageUrl: '',
    },
    rsvp: {
      deadline: '',
      meals: copy.meals,
      allowPlusOne: true,
      collectDietary: true,
      notes: '',
    },
    faq: { items: [] },
    domain: {
      slug,
      seoTitle: copy.seoTitle,
      seoDescription: copy.seoDescription,
      mail: emptyMailDomain(),
    },
  }
}

export function createSeedEvent(): PlatformEvent {
  const now = new Date().toISOString()
  const config = createDefaultConfig({
    honoreeName: 'Beni',
    familyName: 'Freund',
    type: 'bar',
    locale: 'pt',
    enabled: ['pt', 'en'],
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
  config.story.honoreeBio =
    'Beni ama música, futebol e viajar. Completa 13 anos e sobe à Torah cercado de família e amigos.'
  config.contact = {
    phone: '',
    email: 'mitzvah@mitzvah.pro',
    whatsapp: '',
  }
  config.venues.hotels = [
    {
      id: uid(),
      name: 'Hotel exemplo',
      url: 'https://mitzvah.pro',
      notes: 'Bloco de quartos sob consulta',
      walking: '8 min',
      mapUrl: '',
    },
  ]
  config.places = [
    {
      id: uid(),
      name: 'Restaurante do bairro',
      category: 'restaurant',
      url: '',
      mapUrl: '',
      notes: 'Italiano casual, bom para o almoço de sexta.',
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
    previewToken: uid(),
    approvalToken: uid(),
    config,
    guests: [],
    wizard: {
      currentStep: 'review',
      completedSteps: [
        'basics',
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
