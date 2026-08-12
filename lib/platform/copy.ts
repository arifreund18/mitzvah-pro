import type { EventConfig, EventLocale, EventType, WizardStepId } from './types'

export const BCP47: Record<EventLocale, string> = {
  en: 'en-US',
  pt: 'pt-BR',
  es: 'es-MX',
  he: 'he-IL',
}

export function typeLabel(type: EventType, locale: EventLocale = 'pt'): string {
  const labels: Record<EventLocale, Record<EventType, string>> = {
    en: { bar: 'Bar Mitzvah', bat: 'Bat Mitzvah', bnei: 'Bnei Mitzvah', other: 'Celebration' },
    pt: { bar: 'Bar Mitzvah', bat: 'Bat Mitzvah', bnei: 'Bnei Mitzvah', other: 'Celebração' },
    es: { bar: 'Bar Mitzvah', bat: 'Bat Mitzvah', bnei: 'Bnei Mitzvah', other: 'Celebración' },
    he: { bar: 'בר מצווה', bat: 'בת מצווה', bnei: 'בני מצווה', other: 'חגיגה' },
  }
  return labels[locale][type]
}

export function formatEventDate(iso: string, locale: EventLocale, fallback?: string): string {
  if (!iso) return fallback ?? ''
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(BCP47[locale], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatShortDate(iso: string, locale: EventLocale): string {
  if (!iso) return ''
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(BCP47[locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export type GeneratedCopy = {
  headline: string
  subtitle: string
  stdMessage: string
  envelopeLabel: string
  greeting: string
  inviteBody: string
  hostLine: string
  seoTitle: string
  seoDescription: string
  meals: string[]
  ceremonyTitle: string
  receptionTitle: string
}

export function generatedCopy(
  locale: EventLocale,
  type: EventType,
  honoreeName: string,
  familyName: string,
): GeneratedCopy {
  const name = honoreeName.trim()
  const family = familyName.trim()
  const kind = typeLabel(type, locale)

  const packs: Record<EventLocale, GeneratedCopy> = {
    en: {
      headline: name ? `The celebration of ${name}` : 'Our family celebration',
      subtitle: 'Save the date, invitation, and website — all in one place.',
      stdMessage: name ? `Save the date for the ${kind} of ${name}` : 'Save this special date',
      envelopeLabel: 'Open save the date',
      greeting: 'With joy, we invite you',
      inviteBody: name
        ? `to celebrate the ${kind} of ${name}.`
        : 'to celebrate this milestone with our family.',
      hostLine: family ? `The ${family} family` : 'With love, the family',
      seoTitle: name ? `${name} — Mitzvah.pro` : 'Celebration — Mitzvah.pro',
      seoDescription: 'Digital invitation, save the date, and RSVP.',
      meals: ['Kosher', 'Vegetarian', 'Kids'],
      ceremonyTitle: 'Ceremony',
      receptionTitle: 'Reception',
    },
    pt: {
      headline: name ? `A celebração de ${name}` : 'A celebração da nossa família',
      subtitle: 'Save the date, convite e site — tudo em um só lugar.',
      stdMessage: name ? `Reserve a data da ${kind} de ${name}` : 'Reserve esta data especial',
      envelopeLabel: 'Abrir save the date',
      greeting: 'Com alegria, convidamos você',
      inviteBody: name
        ? `para celebrar a ${kind} de ${name}.`
        : 'para celebrar conosco este marco da nossa família.',
      hostLine: family ? `Família ${family}` : 'Com carinho, a família',
      seoTitle: name ? `${name} — Mitzvah.pro` : 'Celebração — Mitzvah.pro',
      seoDescription: 'Convite digital, save the date e RSVP.',
      meals: ['Kosher', 'Vegetariano', 'Infantil'],
      ceremonyTitle: 'Cerimônia',
      receptionTitle: 'Recepção',
    },
    es: {
      headline: name ? `La celebración de ${name}` : 'La celebración de nuestra familia',
      subtitle: 'Save the date, invitación y sitio — todo en un solo lugar.',
      stdMessage: name ? `Reserva la fecha de la ${kind} de ${name}` : 'Reserva esta fecha especial',
      envelopeLabel: 'Abrir save the date',
      greeting: 'Con alegría, te invitamos',
      inviteBody: name
        ? `a celebrar la ${kind} de ${name}.`
        : 'a celebrar con nosotros este momento de nuestra familia.',
      hostLine: family ? `Familia ${family}` : 'Con cariño, la familia',
      seoTitle: name ? `${name} — Mitzvah.pro` : 'Celebración — Mitzvah.pro',
      seoDescription: 'Invitación digital, save the date y RSVP.',
      meals: ['Kosher', 'Vegetariano', 'Infantil'],
      ceremonyTitle: 'Ceremonia',
      receptionTitle: 'Recepción',
    },
    he: {
      headline: name ? `החגיגה של ${name}` : 'החגיגה של המשפחה',
      subtitle: 'שמרו את התאריך, הזמנה ואתר — הכול במקום אחד.',
      stdMessage: name ? `שמרו את התאריך ל${kind} של ${name}` : 'שמרו את התאריך המיוחד הזה',
      envelopeLabel: 'לפתוח את שמרו את התאריך',
      greeting: 'בשמחה, אנחנו מזמינים אתכם',
      inviteBody: name ? `לחגוג את ה${kind} של ${name}.` : 'לחגוג איתנו את הרגע הזה של המשפחה.',
      hostLine: family ? `משפחת ${family}` : 'באהבה, המשפחה',
      seoTitle: name ? `${name} — Mitzvah.pro` : 'חגיגה — Mitzvah.pro',
      seoDescription: 'הזמנה דיגיטלית, שמרו את התאריך ו־RSVP.',
      meals: ['כשר', 'צמחוני', 'ילדים'],
      ceremonyTitle: 'טקס',
      receptionTitle: 'קבלת פנים',
    },
  }
  return packs[locale]
}

function fromConfig(config: EventConfig): GeneratedCopy {
  return generatedCopy(
    config.locales.default,
    config.basics.type,
    config.basics.honoreeName,
    config.basics.familyName,
  )
}

function pick(current: string, previousGenerated: string, nextGenerated: string): string {
  if (!current.trim() || current === previousGenerated) return nextGenerated
  return current
}

export function syncGeneratedCopy(previous: EventConfig, next: EventConfig): EventConfig {
  const identityChanged =
    previous.basics.honoreeName !== next.basics.honoreeName ||
    previous.basics.familyName !== next.basics.familyName ||
    previous.basics.type !== next.basics.type ||
    previous.locales.default !== next.locales.default
  if (!identityChanged) return next

  const prevGen = fromConfig(previous)
  const nextGen = fromConfig(next)
  const scheduleItems = next.schedule.items.map((item, index) => {
    const prevTitle =
      index === 0 ? prevGen.ceremonyTitle : index === 1 ? prevGen.receptionTitle : null
    const nextTitle =
      index === 0 ? nextGen.ceremonyTitle : index === 1 ? nextGen.receptionTitle : null
    if (prevTitle && nextTitle && (item.title === prevTitle || !item.title.trim())) {
      return { ...item, title: nextTitle }
    }
    return item
  })
  const mealsSame =
    next.rsvp.meals.length === prevGen.meals.length &&
    next.rsvp.meals.every((meal, i) => meal === prevGen.meals[i])

  return {
    ...next,
    story: {
      ...next.story,
      headline: nextGen.headline,
      subtitle: pick(next.story.subtitle, prevGen.subtitle, nextGen.subtitle),
    },
    saveTheDate: {
      ...next.saveTheDate,
      message: nextGen.stdMessage,
      envelopeLabel: pick(next.saveTheDate.envelopeLabel, prevGen.envelopeLabel, nextGen.envelopeLabel),
    },
    invitation: {
      ...next.invitation,
      greeting: pick(next.invitation.greeting, prevGen.greeting, nextGen.greeting),
      body: nextGen.inviteBody,
      hostLine: nextGen.hostLine,
    },
    domain: {
      ...next.domain,
      seoTitle: nextGen.seoTitle,
      seoDescription: pick(next.domain.seoDescription, prevGen.seoDescription, nextGen.seoDescription),
    },
    rsvp: {
      ...next.rsvp,
      meals: mealsSame || previous.locales.default !== next.locales.default ? nextGen.meals : next.rsvp.meals,
    },
    schedule: { items: scheduleItems },
  }
}

export function applyGeneratedPatch(
  config: EventConfig,
  patch: (draft: EventConfig) => EventConfig,
): EventConfig {
  return syncGeneratedCopy(config, patch(config))
}

export type WizardUi = {
  dashboard: string
  saved: string
  saving: string
  saveError: string
  edit: string
  viewSite: string
  stepOf: string
  back: string
  continue: string
  publish: string
  publishing: string
  newEvent: string
  livePreview: string
  draft: string
  language: string
  languageHint: string
  type: string
  honoree: string
  honoreePlaceholder: string
  family: string
  date: string
  pickDate: string
  city: string
  country: string
  theme: string
  accent: string
  headline: string
  subtitle: string
  parentsMessage: string
  about: string
  honoreeBio: string
  moment: string
  remove: string
  title: string
  time: string
  place: string
  address: string
  addMoment: string
  parking: string
  hotels: string
  walking: string
  mapUrl: string
  addPlace: string
  notes: string
  addHotel: string
  heroUrl: string
  heroUpload: string
  gallery: string
  showStd: string
  stdEmailHint: string
  message: string
  envelopeLabel: string
  greeting: string
  inviteBody: string
  inviteEmailHint: string
  hostLine: string
  seal: string
  sealHint: string
  sealUpload: string
  deadline: string
  meals: string
  plusOne: string
  dietary: string
  rsvpNotes: string
  question: string
  answer: string
  addQuestion: string
  guestsHint: string
  addGuest: string
  slug: string
  slugHint: string
  seoTitle: string
  seoDescription: string
  reviewReady: string
  missing: string
  uploadFail: string
  imageTooBig: string
  localeNames: Record<EventLocale, string>
  steps: Record<WizardStepId, { title: string; subtitle: string }>
  issues: Record<string, string>
  site: {
    dateTbd: string
    schedule: string
    timeTbd: string
    moment: string
    placeTbd: string
    hotelsEmpty: string
    faq: string
    question: string
    answer: string
    rsvpUntil: string
    deadlineTbd: string
    confirm: string
    honoreeFallback: string
  }
}

const WIZARD_UI: Record<EventLocale, WizardUi> = {
  pt: {
    dashboard: 'Dashboard',
    saved: 'Salvo',
    saving: 'Salvando…',
    saveError: 'Erro ao salvar',
    edit: 'Editar',
    viewSite: 'Ver site',
    stepOf: 'Passo {n} de {total}',
    back: 'Voltar',
    continue: 'Continuar',
    publish: 'Publicar site',
    publishing: 'Publicando…',
    newEvent: 'Novo evento',
    livePreview: 'Preview ao vivo',
    draft: 'rascunho',
    language: 'Idioma do wizard',
    languageHint: 'Você preenche e vê o preview neste idioma. Os idiomas do site já foram escolhidos na criação.',
    type: 'Tipo de evento',
    honoree: 'Nome do celebrante',
    honoreePlaceholder: 'Noah, Beni, Sofia…',
    family: 'Família',
    date: 'Data',
    pickDate: 'Escolher no calendário',
    city: 'Cidade',
    country: 'País',
    theme: 'Tema',
    accent: 'Cor de destaque',
    headline: 'Headline',
    subtitle: 'Subtítulo',
    parentsMessage: 'Mensagem dos pais',
    about: 'Sobre a celebração',
    honoreeBio: 'Sobre o celebrante',
    moment: 'Momento',
    remove: 'Remover',
    title: 'Título',
    time: 'Horário',
    place: 'Local',
    address: 'Endereço',
    addMoment: '+ Adicionar momento',
    parking: 'Estacionamento',
    hotels: 'Hotéis',
    walking: 'Tempo a pé',
    mapUrl: 'Link do mapa',
    addPlace: '+ Lugar (o que fazer)',
    notes: 'Notas',
    addHotel: '+ Hotel',
    heroUrl: 'Foto hero (URL)',
    heroUpload: 'Ou envie uma foto hero',
    gallery: 'Galeria (uma URL por linha)',
    showStd: 'Ativar email de Save the Date',
    stdEmailHint: 'Este email vai para os convidados. Não entra no site do evento.',
    message: 'Mensagem',
    envelopeLabel: 'Rótulo do envelope',
    greeting: 'Saudação',
    inviteBody: 'Texto do convite',
    inviteEmailHint: 'O convite é um email com o cartão e o selo. O site do evento é outra peça.',
    hostLine: 'Linha da família',
    seal: 'Selo / logo',
    sealHint: 'Envie uma imagem para usar como logo no convite. Sem imagem, o texto aparece no selo.',
    sealUpload: 'Enviar logo',
    deadline: 'Prazo do RSVP',
    meals: 'Opções de refeição (uma por linha)',
    plusOne: 'Permitir acompanhante / número de pessoas',
    dietary: 'Coletar restrições alimentares',
    rsvpNotes: 'Notas do RSVP',
    question: 'Pergunta',
    answer: 'Resposta',
    addQuestion: '+ Pergunta',
    guestsHint: 'Adicione famílias agora ou depois no painel de convidados.',
    addGuest: 'Adicionar à lista',
    slug: 'Subdomínio',
    slugHint: 'Depois de publicar, o site fica em seu-slug.mitzvah.pro (local: seu-slug.localhost:3000).',
    seoTitle: 'Título SEO',
    seoDescription: 'Descrição SEO',
    reviewReady: 'Tudo pronto para publicar. O preview à direita é o site que os convidados vão ver.',
    missing: 'Falta',
    uploadFail: 'Falha no upload',
    imageTooBig: 'Imagem maior que 1.5 MB',
    localeNames: { en: 'English', pt: 'Português', es: 'Español', he: 'עברית' },
    steps: {
      basics: { title: 'Celebração', subtitle: 'Idioma do wizard, quem honramos, quando e onde.' },
      branding: { title: 'Visual', subtitle: 'Tema e cores — o preview muda na hora.' },
      story: { title: 'Textos', subtitle: 'Boas-vindas, sobre a celebração e o celebrante.' },
      schedule: { title: 'Programação', subtitle: 'Cerimônia, recepção e horários.' },
      venues: { title: 'Locais & hotéis', subtitle: 'Dress code, hospedagem e o que fazer na cidade.' },
      media: { title: 'Fotos', subtitle: 'Hero e galeria (URL ou upload local).' },
      faq: { title: 'FAQ', subtitle: 'Perguntas que os convidados sempre fazem.' },
      rsvp: { title: 'RSVP', subtitle: 'Prazo, refeições e acompanhante.' },
      saveTheDate: { title: 'Save the Date', subtitle: 'Email enviado aos convidados — não é página do site.' },
      invitation: { title: 'Convite', subtitle: 'Email do cartão com selo, enviado à lista.' },
      guestsBootstrap: { title: 'Convidados', subtitle: 'Lista inicial — RSVPs entram depois.' },
      domain: { title: 'Publicação', subtitle: 'Subdomínio seu-slug.mitzvah.pro e SEO.' },
      review: { title: 'Revisão', subtitle: 'Checklist e publicar o site.' },
    },
    issues: {
      honoree: 'Nome do celebrante',
      date: 'Data da celebração',
      city: 'Cidade',
      headline: 'Headline',
      schedule: 'Pelo menos um item na programação',
      invite: 'Texto do convite',
      rsvp: 'Prazo do RSVP',
      slug: 'Slug do site',
    },
    site: {
      dateTbd: 'Data a definir',
      schedule: 'Programação',
      timeTbd: 'Horário',
      moment: 'Momento',
      placeTbd: 'Local a definir',
      hotelsEmpty: 'Nenhum hotel adicionado ainda.',
      faq: 'Perguntas frequentes',
      question: 'Pergunta',
      answer: 'Resposta',
      rsvpUntil: 'Confirme até',
      deadlineTbd: 'a data limite',
      confirm: 'Confirmar presença',
      honoreeFallback: 'Celebrante',
    },
  },
  en: {
    dashboard: 'Dashboard',
    saved: 'Saved',
    saving: 'Saving…',
    saveError: 'Could not save',
    edit: 'Edit',
    viewSite: 'View site',
    stepOf: 'Step {n} of {total}',
    back: 'Back',
    continue: 'Continue',
    publish: 'Publish site',
    publishing: 'Publishing…',
    newEvent: 'New event',
    livePreview: 'Live preview',
    draft: 'draft',
    language: 'Wizard language',
    languageHint: 'You fill in and preview in this language. Site languages were chosen when the event was created.',
    type: 'Event type',
    honoree: 'Honoree name',
    honoreePlaceholder: 'Noah, Beni, Sofia…',
    family: 'Family',
    date: 'Date',
    pickDate: 'Pick from calendar',
    city: 'City',
    country: 'Country',
    theme: 'Theme',
    accent: 'Accent color',
    headline: 'Headline',
    subtitle: 'Subtitle',
    parentsMessage: 'Parents’ message',
    about: 'About the celebration',
    honoreeBio: 'About the honoree',
    moment: 'Moment',
    remove: 'Remove',
    title: 'Title',
    time: 'Time',
    place: 'Venue',
    address: 'Address',
    addMoment: '+ Add moment',
    parking: 'Parking',
    hotels: 'Hotels',
    walking: 'Walking time',
    mapUrl: 'Map link',
    addPlace: '+ Place (things to do)',
    notes: 'Notes',
    addHotel: '+ Hotel',
    heroUrl: 'Hero photo (URL)',
    heroUpload: 'Or upload a hero photo',
    gallery: 'Gallery (one URL per line)',
    showStd: 'Enable Save the Date email',
    stdEmailHint: 'This email goes to guests. It is not a page on the event website.',
    message: 'Message',
    envelopeLabel: 'Envelope label',
    greeting: 'Greeting',
    inviteBody: 'Invitation text',
    inviteEmailHint: 'The invitation is an email with the card and seal. The event website is a separate piece.',
    hostLine: 'Host line',
    seal: 'Seal / logo',
    sealHint: 'Upload an image to use as the invitation logo. Without an image, the text appears on the seal.',
    sealUpload: 'Upload logo',
    deadline: 'RSVP deadline',
    meals: 'Meal options (one per line)',
    plusOne: 'Allow plus-one / party size',
    dietary: 'Collect dietary restrictions',
    rsvpNotes: 'RSVP notes',
    question: 'Question',
    answer: 'Answer',
    addQuestion: '+ Question',
    guestsHint: 'Add families now or later in the guest list.',
    addGuest: 'Add to list',
    slug: 'Subdomain',
    slugHint: 'After publish, the site lives at your-slug.mitzvah.pro (local: your-slug.localhost:3000).',
    seoTitle: 'SEO title',
    seoDescription: 'SEO description',
    reviewReady: 'Ready to publish. The preview on the right is what guests will see.',
    missing: 'Missing',
    uploadFail: 'Upload failed',
    imageTooBig: 'Image larger than 1.5 MB',
    localeNames: { en: 'English', pt: 'Português', es: 'Español', he: 'עברית' },
    steps: {
      basics: { title: 'Celebration', subtitle: 'Wizard language, who we honor, when and where.' },
      branding: { title: 'Look', subtitle: 'Theme and colors — the preview updates instantly.' },
      story: { title: 'Copy', subtitle: 'Welcome, about the celebration, and the honoree.' },
      schedule: { title: 'Schedule', subtitle: 'Ceremony, reception, and times.' },
      venues: { title: 'Venues & hotels', subtitle: 'Dress code, lodging, and things to do.' },
      media: { title: 'Photos', subtitle: 'Hero and gallery (URL or local upload).' },
      faq: { title: 'FAQ', subtitle: 'Questions guests always ask.' },
      rsvp: { title: 'RSVP', subtitle: 'Deadline, meals, and plus-one.' },
      saveTheDate: { title: 'Save the Date', subtitle: 'Email sent to guests — not a page on the site.' },
      invitation: { title: 'Invitation', subtitle: 'Email with the sealed card, sent to the list.' },
      guestsBootstrap: { title: 'Guests', subtitle: 'Starter list — RSVPs arrive later.' },
      domain: { title: 'Publish', subtitle: 'Subdomain your-slug.mitzvah.pro and SEO.' },
      review: { title: 'Review', subtitle: 'Checklist and publish the site.' },
    },
    issues: {
      honoree: 'Honoree name',
      date: 'Celebration date',
      city: 'City',
      headline: 'Headline',
      schedule: 'At least one schedule item',
      invite: 'Invitation text',
      rsvp: 'RSVP deadline',
      slug: 'Site slug',
    },
    site: {
      dateTbd: 'Date to be announced',
      schedule: 'Schedule',
      timeTbd: 'Time',
      moment: 'Moment',
      placeTbd: 'Venue to be announced',
      hotelsEmpty: 'No hotels added yet.',
      faq: 'Frequently asked questions',
      question: 'Question',
      answer: 'Answer',
      rsvpUntil: 'Please reply by',
      deadlineTbd: 'the deadline',
      confirm: 'Confirm attendance',
      honoreeFallback: 'Honoree',
    },
  },
  es: {
    dashboard: 'Dashboard',
    saved: 'Guardado',
    saving: 'Guardando…',
    saveError: 'Error al guardar',
    edit: 'Editar',
    viewSite: 'Ver sitio',
    stepOf: 'Paso {n} de {total}',
    back: 'Volver',
    continue: 'Continuar',
    publish: 'Publicar sitio',
    publishing: 'Publicando…',
    newEvent: 'Nuevo evento',
    livePreview: 'Vista previa en vivo',
    draft: 'borrador',
    language: 'Idioma del wizard',
    languageHint: 'Completas y ves la vista previa en este idioma. Los idiomas del sitio se eligieron al crear el evento.',
    type: 'Tipo de evento',
    honoree: 'Nombre del celebrante',
    honoreePlaceholder: 'Noah, Beni, Sofia…',
    family: 'Familia',
    date: 'Fecha',
    pickDate: 'Elegir en el calendario',
    city: 'Ciudad',
    country: 'País',
    theme: 'Tema',
    accent: 'Color de acento',
    headline: 'Titular',
    subtitle: 'Subtítulo',
    parentsMessage: 'Mensaje de los padres',
    about: 'Sobre la celebración',
    honoreeBio: 'Sobre el celebrante',
    moment: 'Momento',
    remove: 'Quitar',
    title: 'Título',
    time: 'Hora',
    place: 'Lugar',
    address: 'Dirección',
    addMoment: '+ Agregar momento',
    parking: 'Estacionamiento',
    hotels: 'Hoteles',
    walking: 'Tiempo a pie',
    mapUrl: 'Enlace del mapa',
    addPlace: '+ Lugar (qué hacer)',
    notes: 'Notas',
    addHotel: '+ Hotel',
    heroUrl: 'Foto hero (URL)',
    heroUpload: 'O sube una foto hero',
    gallery: 'Galería (una URL por línea)',
    showStd: 'Activar email de Save the Date',
    stdEmailHint: 'Este email se envía a los invitados. No es una página del sitio.',
    message: 'Mensaje',
    envelopeLabel: 'Etiqueta del sobre',
    greeting: 'Saludo',
    inviteBody: 'Texto de la invitación',
    inviteEmailHint: 'La invitación es un email con la tarjeta y el sello. El sitio del evento es otra pieza.',
    hostLine: 'Línea de la familia',
    seal: 'Sello / logo',
    sealHint: 'Sube una imagen para usarla como logo en la invitación. Sin imagen, aparece el texto del sello.',
    sealUpload: 'Subir logo',
    deadline: 'Fecha límite del RSVP',
    meals: 'Opciones de comida (una por línea)',
    plusOne: 'Permitir acompañante / número de personas',
    dietary: 'Recoger restricciones alimentarias',
    rsvpNotes: 'Notas del RSVP',
    question: 'Pregunta',
    answer: 'Respuesta',
    addQuestion: '+ Pregunta',
    guestsHint: 'Agrega familias ahora o después en la lista de invitados.',
    addGuest: 'Agregar a la lista',
    slug: 'Subdominio',
    slugHint: 'Al publicar, el sitio queda en tu-slug.mitzvah.pro (local: tu-slug.localhost:3000).',
    seoTitle: 'Título SEO',
    seoDescription: 'Descripción SEO',
    reviewReady: 'Listo para publicar. La vista previa a la derecha es lo que verán los invitados.',
    missing: 'Falta',
    uploadFail: 'Error al subir',
    imageTooBig: 'Imagen mayor a 1.5 MB',
    localeNames: { en: 'English', pt: 'Português', es: 'Español', he: 'עברית' },
    steps: {
      basics: { title: 'Celebración', subtitle: 'Idioma del wizard, a quién honramos, cuándo y dónde.' },
      branding: { title: 'Visual', subtitle: 'Tema y colores — la vista previa cambia al instante.' },
      story: { title: 'Textos', subtitle: 'Bienvenida, sobre la celebración y el celebrante.' },
      schedule: { title: 'Programa', subtitle: 'Ceremonia, recepción y horarios.' },
      venues: { title: 'Lugares y hoteles', subtitle: 'Dress code, hospedaje y qué hacer.' },
      media: { title: 'Fotos', subtitle: 'Hero y galería (URL o carga local).' },
      faq: { title: 'FAQ', subtitle: 'Preguntas frecuentes de los invitados.' },
      rsvp: { title: 'RSVP', subtitle: 'Fecha límite, comidas y acompañante.' },
      saveTheDate: { title: 'Save the Date', subtitle: 'Email a los invitados — no es una página del sitio.' },
      invitation: { title: 'Invitación', subtitle: 'Email de la tarjeta con sello, enviado a la lista.' },
      guestsBootstrap: { title: 'Invitados', subtitle: 'Lista inicial — los RSVP llegan después.' },
      domain: { title: 'Publicación', subtitle: 'Subdominio tu-slug.mitzvah.pro y SEO.' },
      review: { title: 'Revisión', subtitle: 'Checklist y publicar el sitio.' },
    },
    issues: {
      honoree: 'Nombre del celebrante',
      date: 'Fecha de la celebración',
      city: 'Ciudad',
      headline: 'Titular',
      schedule: 'Al menos un ítem en el programa',
      invite: 'Texto de la invitación',
      rsvp: 'Fecha límite del RSVP',
      slug: 'Slug del sitio',
    },
    site: {
      dateTbd: 'Fecha por definir',
      schedule: 'Programa',
      timeTbd: 'Hora',
      moment: 'Momento',
      placeTbd: 'Lugar por definir',
      hotelsEmpty: 'Aún no hay hoteles.',
      faq: 'Preguntas frecuentes',
      question: 'Pregunta',
      answer: 'Respuesta',
      rsvpUntil: 'Confirma antes del',
      deadlineTbd: 'la fecha límite',
      confirm: 'Confirmar asistencia',
      honoreeFallback: 'Celebrante',
    },
  },
  he: {
    dashboard: 'לוח בקרה',
    saved: 'נשמר',
    saving: 'שומרים…',
    saveError: 'שגיאה בשמירה',
    edit: 'עריכה',
    viewSite: 'צפייה באתר',
    stepOf: 'שלב {n} מתוך {total}',
    back: 'חזרה',
    continue: 'המשך',
    publish: 'פרסום האתר',
    publishing: 'מפרסמים…',
    newEvent: 'אירוע חדש',
    livePreview: 'תצוגה חיה',
    draft: 'טיוטה',
    language: 'שפת האשף',
    languageHint: 'ממלאים ורואים את התצוגה בשפה הזו. שפות האתר נבחרו ביצירת האירוע.',
    type: 'סוג האירוע',
    honoree: 'שם החוגג/ת',
    honoreePlaceholder: 'נועה, בני, סופיה…',
    family: 'משפחה',
    date: 'תאריך',
    pickDate: 'בחירה בלוח שנה',
    city: 'עיר',
    country: 'מדינה',
    theme: 'ערכת נושא',
    accent: 'צבע הדגשה',
    headline: 'כותרת',
    subtitle: 'תת־כותרת',
    parentsMessage: 'מסר מההורים',
    about: 'על החגיגה',
    honoreeBio: 'על החוגג/ת',
    moment: 'רגע',
    remove: 'הסרה',
    title: 'כותרת',
    time: 'שעה',
    place: 'מקום',
    address: 'כתובת',
    addMoment: '+ הוספת רגע',
    parking: 'חניה',
    hotels: 'מלונות',
    walking: 'זמן הליכה',
    mapUrl: 'קישור למפה',
    addPlace: '+ מקום (מה לעשות)',
    notes: 'הערות',
    addHotel: '+ מלון',
    heroUrl: 'תמונת הירו (URL)',
    heroUpload: 'או העלאת תמונת הירו',
    gallery: 'גלריה (כתובת אחת בכל שורה)',
    showStd: 'הפעלת אימייל Save the Date',
    stdEmailHint: 'האימייל נשלח לאורחים. זה לא עמוד באתר האירוע.',
    message: 'הודעה',
    envelopeLabel: 'תווית המעטפה',
    greeting: 'ברכה',
    inviteBody: 'טקסט ההזמנה',
    inviteEmailHint: 'ההזמנה היא אימייל עם כרטיס וחותם. אתר האירוע הוא דבר נפרד.',
    hostLine: 'שורת המשפחה',
    seal: 'חותם / לוגו',
    sealHint: 'העלו תמונה ללוגו בהזמנה. בלי תמונה מופיע הטקסט על החותם.',
    sealUpload: 'העלאת לוגו',
    deadline: 'תאריך אחרון ל־RSVP',
    meals: 'אפשרויות ארוחה (אחת בכל שורה)',
    plusOne: 'לאפשר מלווה / מספר אנשים',
    dietary: 'לאסוף מגבלות תזונה',
    rsvpNotes: 'הערות RSVP',
    question: 'שאלה',
    answer: 'תשובה',
    addQuestion: '+ שאלה',
    guestsHint: 'אפשר להוסיף משפחות עכשיו או אחר כך ברשימת האורחים.',
    addGuest: 'הוספה לרשימה',
    slug: 'סאבדומיין',
    slugHint: 'אחרי פרסום האתר יהיה ב־your-slug.mitzvah.pro (מקומי: your-slug.localhost:3000).',
    seoTitle: 'כותרת SEO',
    seoDescription: 'תיאור SEO',
    reviewReady: 'מוכן לפרסום. התצוגה מימין היא מה שהאורחים יראו.',
    missing: 'חסר',
    uploadFail: 'ההעלאה נכשלה',
    imageTooBig: 'התמונה גדולה מ־1.5 MB',
    localeNames: { en: 'English', pt: 'Português', es: 'Español', he: 'עברית' },
    steps: {
      basics: { title: 'החגיגה', subtitle: 'שפת האשף, את מי מכבדים, מתי ואיפה.' },
      branding: { title: 'מראה', subtitle: 'ערכת נושא וצבעים — התצוגה מתעדכנת מיד.' },
      story: { title: 'טקסטים', subtitle: 'ברכה, על החגיגה ועל החוגג/ת.' },
      schedule: { title: 'לוח זמנים', subtitle: 'טקס, קבלת פנים ושעות.' },
      venues: { title: 'מקומות ומלונות', subtitle: 'קוד לבוש, לינה ומה לעשות.' },
      media: { title: 'תמונות', subtitle: 'הירו וגלריה.' },
      faq: { title: 'שאלות', subtitle: 'מה שהאורחים תמיד שואלים.' },
      rsvp: { title: 'RSVP', subtitle: 'דדליין, ארוחות ומלווה.' },
      saveTheDate: { title: 'שמרו את התאריך', subtitle: 'אימייל לאורחים — לא עמוד באתר.' },
      invitation: { title: 'הזמנה', subtitle: 'אימייל הכרטיס עם חותם, נשלח לרשימה.' },
      guestsBootstrap: { title: 'אורחים', subtitle: 'רשימה ראשונית — RSVP מגיע אחר כך.' },
      domain: { title: 'פרסום', subtitle: 'סאבדומיין your-slug.mitzvah.pro ו־SEO.' },
      review: { title: 'סקירה', subtitle: 'צ׳קליסט ופרסום האתר.' },
    },
    issues: {
      honoree: 'שם החוגג/ת',
      date: 'תאריך החגיגה',
      city: 'עיר',
      headline: 'כותרת',
      schedule: 'לפחות פריט אחד בלוח הזמנים',
      invite: 'טקסט ההזמנה',
      rsvp: 'תאריך אחרון ל־RSVP',
      slug: 'סלאג האתר',
    },
    site: {
      dateTbd: 'התאריך יפורסם',
      schedule: 'לוח זמנים',
      timeTbd: 'שעה',
      moment: 'רגע',
      placeTbd: 'המקום יפורסם',
      hotelsEmpty: 'עדיין אין מלונות.',
      faq: 'שאלות נפוצות',
      question: 'שאלה',
      answer: 'תשובה',
      rsvpUntil: 'נא לאשר עד',
      deadlineTbd: 'התאריך האחרון',
      confirm: 'אישור הגעה',
      honoreeFallback: 'החוגג/ת',
    },
  },
}

export function wizardUi(locale: EventLocale): WizardUi {
  return WIZARD_UI[locale]
}
