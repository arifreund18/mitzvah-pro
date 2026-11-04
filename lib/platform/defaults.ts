import type { CardDesign, EventConfig, EventLocale, EventType, PlatformEvent } from './types'
import { generatedCopy } from './copy'
import { DEFAULT_ORG_ID } from './auth'
import { uid } from './ids'
import { emptyMailDomain } from './mail-domain'

export { typeLabel } from './copy'

export function defaultCardDesign(): CardDesign {
  return {
    pageColor: '#1a2033',
    pageTexture: '',
    envelopeColor: '#c4a574',
    envelopeLiner: '#f7f1e4',
    sealUrl: '',
    sealBg: '#22d3ee',
    fontKey: 'georgia',
    cardColor: '#f7f1e4',
    cardTextColor: '#1c1630',
    greetingColor: '#6a5b4c',
    nameColor: '#1c1630',
    bodyColor: '#3b2418',
    bodySizePx: 16,
    bodyBold: false,
    panelPhotoUrl: '',
    panelPhotoShape: 'circle',
    mapUrl: '',
    address1: '',
    address2: '',
    timeLabel: '',
    placeLabel: '',
    subject: '',
    ctaView: '',
    ctaCalendar: '',
    ctaMap: '',
  }
}

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
  const design = defaultCardDesign()

  return {
    basics: {
      type,
      honoreeName,
      familyName,
      date: '',
      startTime: '10:00',
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
          timeEnd: '',
          date: '',
          place: '',
          address: '',
          mapUrl: '',
          dressCode: '',
          notes: '',
          dayLabel: '',
          visibility: 'public',
        },
        {
          id: uid(),
          title: copy.receptionTitle,
          time: '19:00',
          timeEnd: '',
          date: '',
          place: '',
          address: '',
          mapUrl: '',
          dressCode: '',
          notes: '',
          dayLabel: '',
          visibility: 'public',
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
      people: [],
      formEnabled: true,
    },
    travel: {
      enabled: false,
      airports: '',
      currency: '',
      transport: '',
      emergency: '',
    },
    media: {
      heroUrl: '',
      gallery: [],
      galleryItems: [],
      ambientAudioUrl: '',
    },
    saveTheDate: {
      enabled: true,
      message: copy.stdMessage,
      envelopeLabel: copy.envelopeLabel,
      design: { ...design, subject: copy.stdMessage },
    },
    invitation: {
      greeting: copy.greeting,
      body: copy.inviteBody,
      hostLine: copy.hostLine,
      sealLabel: 'Mitzvah',
      sealImageUrl: '',
      intro: '',
      design: { ...design },
    },
    rsvp: {
      deadline: '',
      meals: copy.meals,
      allowPlusOne: true,
      collectDietary: true,
      collectMeal: true,
      notes: '',
      publicFormEnabled: false,
      openRsvpDefault: false,
      notifyMode: 'instant',
      notifyEmails: [],
      confirmationMessage: '',
    },
    reminders: {
      enabled: true,
      d30: true,
      d7: true,
      d2: true,
      onlyConfirmedForD7D2: true,
      message: '',
    },
    faq: { items: [] },
    legal: {
      privacyHtml: '',
      termsHtml: '',
      comingSoon: false,
    },
    domain: {
      slug,
      seoTitle: copy.seoTitle,
      seoDescription: copy.seoDescription,
      mail: emptyMailDomain(),
      customHost: '',
      customHostStatus: 'none',
      customHostToken: uid(),
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
    enabled: ['pt', 'en', 'es', 'he'],
    slug: 'beni',
  })
  config.basics.date = '2026-11-14'
  config.basics.startTime = '10:00'
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
      timeEnd: '19:30',
      date: '2026-11-13',
      place: 'Sinagoga',
      address: 'São Paulo',
      mapUrl: '',
      dressCode: '',
      notes: '',
      dayLabel: 'Sexta',
      visibility: 'public',
    },
    {
      id: uid(),
      title: 'Shacharit & Torah',
      time: '09:00',
      timeEnd: '12:00',
      date: '2026-11-14',
      place: 'Sinagoga',
      address: 'São Paulo',
      mapUrl: '',
      dressCode: '',
      notes: '',
      dayLabel: 'Sábado',
      visibility: 'public',
    },
    {
      id: uid(),
      title: 'Recepção',
      time: '20:00',
      timeEnd: '23:00',
      date: '2026-11-14',
      place: 'Salão',
      address: 'São Paulo',
      mapUrl: '',
      dressCode: 'Esporte fino',
      notes: '',
      dayLabel: 'Sábado',
      visibility: 'invite',
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
    people: [
      {
        id: uid(),
        name: 'Mitzvah Pro',
        phone: '',
        email: 'mitzvah@mitzvah.pro',
        whatsapp: '',
        whatsappLabel: '',
      },
    ],
    formEnabled: true,
  }
  config.venues.hotels = [
    {
      id: uid(),
      name: 'Hotel exemplo',
      url: 'https://mitzvah.pro',
      notes: 'Bloco de quartos sob consulta',
      walking: '8 min',
      mapUrl: '',
      photoUrl: '',
      stars: 4,
      featured: true,
      bookUrl: '',
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
      photoUrl: '',
    },
  ]
  config.saveTheDate.message = 'Reserve o shabat de 14 de novembro — Bar Mitzvah do Beni'
  config.invitation.body =
    'para celebrar a Bar Mitzvah do Beni. Sua presença torna este dia ainda mais especial.'
  config.rsvp.deadline = '2026-10-20'
  config.rsvp.notes = 'Por favor confirme também restrições alimentares.'
  config.rsvp.publicFormEnabled = false
  config.faq.items = [
    {
      id: uid(),
      question: 'Tem dress code?',
      answer: 'Sim — esporte fino. Evite jeans rasgado e chinelo.',
      published: true,
    },
    {
      id: uid(),
      question: 'Crianças são bem-vindas?',
      answer: 'Sim, com confirmação no RSVP.',
      published: true,
    },
  ]
  config.legal = {
    privacyHtml: '<p>Respeitamos a privacidade dos convidados. Dados de RSVP são usados apenas para a organização do evento.</p>',
    termsHtml: '<p>Este site é destinado aos convidados do evento. Conteúdo sujeito a alteração pelos anfitriões.</p>',
    comingSoon: false,
  }
  config.domain.seoTitle = 'Bar Mitzvah do Beni'
  config.domain.seoDescription = 'Save the date, convite e RSVP da celebração.'

  return {
    id: 'seed-beni',
    orgId: DEFAULT_ORG_ID,
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
        'places',
        'media',
        'faq',
        'contact',
        'saveTheDate',
        'invitation',
        'rsvp',
        'reminders',
        'legal',
        'domain',
      ],
    },
  }
}
