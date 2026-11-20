import type { EventLocale } from './types.ts'
import { SECTION_EDITOR_IDS, type SectionEditorId } from './section-editor.ts'

export type CardDesignUi = {
  summary: string
  importImage: string
  remove: string
  saveBeforeUpload: string
  uploadFail: string
  photoShape: string
  circle: string
  rectangle: string
  fontKey: string
  panelPhotoPosition: string
  cardImagePosition: string
  introSize: string
  headingSize: string
  bodySize: string
  introBold: string
  introItalic: string
  headingBold: string
  headingItalic: string
  bodyBold: string
  bodyItalic: string
  cardMessage: string
  intro: string
  tip: string
  colors: Record<string, string>
  texts: Record<string, string>
  images: Record<string, string>
}

export type StudioUi = {
  events: string
  team: string
  landing: string
  logout: string
  member: string
  platformAdmin: string
  owner: string
  eventsTitle: string
  eventsSubtitleAll: string
  eventsSubtitleScoped: string
  eventsSubtitleOrg: string
  newEvent: string
  noEventsScoped: string
  noEvents: string
  unnamed: string
  familyPrefix: string
  studioLanguage: string
  eventDashboard: string
  openWizard: string
  wizard: string
  draftPreview: string
  viewSite: string
  publish: string
  requestApproval: string
  approvalLink: string
  duplicate: string
  unarchive: string
  archive: string
  delete: string
  deleteConfirm: string
  deleteSlugPrompt: string
  deleteSlugMismatch: string
  actionFailed: string
  deleteFailed: string
  approvalPrompt: string
  guests: string
  peopleYesPending: string
  adultsChildren: string
  rsvpBreakdown: string
  stdSent: string
  invitesSent: string
  editSection: string
  editSectionHint: string
  scheduleInvites: string
  scheduleInvitesHint: string
  guestsTitle: string
  guestsHint: string
  exportCsv: string
  exportXlsx: string
  sendStd: string
  sendInvite: string
  sendStdOne: string
  sendInviteOne: string
  resendStdConfirm: string
  resendInviteConfirm: string
  sendOneOk: string
  sendOneFailed: string
  noGuestEmail: string
  sending: string
  testEmail: string
  sendTestStd: string
  sendTestInvite: string
  emailNeeded: string
  followUpTitle: string
  followUpHint: string
  followUpType: string
  followUpTypeReminder: string
  followUpTypeMessage: string
  followUpTypeUpdate: string
  followUpAudience: string
  followUpAudienceAll: string
  followUpAudienceYes: string
  followUpAudiencePending: string
  followUpAudienceNo: string
  followUpSubject: string
  followUpSubjectPlaceholder: string
  followUpBody: string
  followUpBodyPlaceholder: string
  followUpSend: string
  followUpSendHint: string
  followUpSendFailed: string
  followUpLocalOk: string
  followUpSent: string
  followUpFailures: string
  followUpDeferred: string
  followUpHistory: string
  followUpBodyRequired: string
  emailLogTitle: string
  emailLogHint: string
  emailLogEmpty: string
  emailLogRefresh: string
  emailLogRefreshing: string
  emailLogLoadFailed: string
  emailLogWhen: string
  emailLogType: string
  emailLogTo: string
  emailLogStatus: string
  optionsTitle: string
  optionsHint: string
  products: string
  languages: string
  optionsSaved: string
  optionsSaveFailed: string
  productSite: string
  productSiteHint: string
  productInvite: string
  productInviteHint: string
  productStd: string
  productStdHint: string
  saving: string
  saved: string
  saveError: string
  dirty: string
  backToEvent: string
  editSectionTitle: string
  manageGuests: string
  close: string
  addAll: string
  removeAll: string
  searchFamily: string
  saveCount: string
  scheduleEmpty: string
  guestsEmptySchedule: string
  invitedCount: string
  modeAll: string
  modeNone: string
  modeSubset: string
  importImage: string
  importGallery: string
  saveEventFirst: string
  googlePhotos: string
  googlePhotosMissingKey: string
  albumUrl: string
  importing: string
  importToGallery: string
  googlePhotosSaveHint: string
  createWhat: string
  createHint: string
  localesLegend: string
  localesHint: string
  createEvent: string
  creating: string
  createFailed: string
  honoreeName: string
  adults: string
  children: string
  searchGuest: string
  rsvpAll: string
  sortName: string
  sortRsvp: string
  sortStd: string
  sortInvite: string
  noGuestsFilter: string
  programCol: string
  allMoments: string
  subset: string
  none: string
  preferScheduleInvites: string
  shortcut: string
  deletePerson: string
  deleteFamily: string
  deleteGuestConfirm: string
  deleteFamilyConfirm: string
  actions: string
  email: string
  people: string
  sectionLabels: Record<SectionEditorId, string>
  card: CardDesignUi
}

function card(
  partial: Omit<CardDesignUi, 'colors' | 'texts' | 'images'> & {
    colors?: Partial<CardDesignUi['colors']>
    texts?: Partial<CardDesignUi['texts']>
    images?: Partial<CardDesignUi['images']>
  },
  base: CardDesignUi,
): CardDesignUi {
  const colors = { ...base.colors, ...(partial.colors || {}) } as Record<string, string>
  const texts = { ...base.texts, ...(partial.texts || {}) } as Record<string, string>
  const images = { ...base.images, ...(partial.images || {}) } as Record<string, string>
  return { ...base, ...partial, colors, texts, images }
}

const EN_CARD: CardDesignUi = {
  summary: 'Envelope design ({n} parameters)',
  importImage: 'Import image',
  remove: 'Remove',
  saveBeforeUpload: 'Save the event before importing images.',
  uploadFail: 'Upload failed',
  photoShape: 'Photo format',
  circle: 'Circle',
  rectangle: 'Rectangle',
  fontKey: 'Font (fontKey)',
  panelPhotoPosition: 'Panel photo position',
  cardImagePosition: 'Background image position',
  introSize: 'Intro size (px)',
  headingSize: 'Heading size (px)',
  bodySize: 'Body size (px)',
  introBold: 'Intro bold',
  introItalic: 'Intro italic',
  headingBold: 'Heading bold',
  headingItalic: 'Heading italic',
  bodyBold: 'Body bold',
  bodyItalic: 'Body italic',
  cardMessage: 'Card message',
  intro: 'Intro',
  tip: 'Tip',
  colors: {
    pageColor: 'Page color',
    envelopeColor: 'Envelope color',
    envelopeLiner: 'Envelope liner',
    envelopeExterior: 'Envelope exterior',
    envelopeNameColor: 'Name on envelope',
    sealBg: 'Seal background',
    cardColor: 'Card color',
    cardTextColor: 'Card text',
    ctaRsvpColor: 'RSVP text',
    greetingColor: 'Greeting color',
    nameColor: 'Name color',
    bodyColor: 'Body color',
    introColor: 'Intro color',
    headingColor: 'Heading color',
  },
  texts: {
    sealLabel: 'Seal label',
    mapUrl: 'Map URL',
    openLabel: 'Open-envelope label',
    forLabel: '"For:" label',
    title: 'Card title',
    eventName: 'Event name on card',
    heading: 'Heading',
    hosts: 'Hosts',
    greeting: 'Greeting',
    dateLabel: 'Date label',
    timeLabel: 'Time label',
    placeLabel: 'Venue label',
    cityLabel: 'City label',
    address1: 'Address line 1',
    address2: 'Address line 2',
    subject: 'Subject (email)',
    ctaView: 'CTA view',
    ctaCalendar: 'CTA calendar',
    ctaMap: 'CTA map',
    ctaRsvp: 'CTA RSVP',
    rsvpLabel: 'RSVP label',
    rsvpHint: 'RSVP hint',
    suggestedPalette: 'Suggested palette (hex, comma)',
  },
  images: {
    pageTexture: 'Page texture',
    envelopeTexture: 'Envelope texture',
    sealUrl: 'Seal / logo',
    cardImageUrl: 'Card background image',
    panelPhotoUrl: 'Panel photo',
  },
}

const PT_CARD: CardDesignUi = card(
  {
    summary: 'Design do envelope ({n} parâmetros)',
    importImage: 'Importar imagem',
    remove: 'Remover',
    saveBeforeUpload: 'Salve o evento antes de importar imagens.',
    uploadFail: 'Falha no upload',
    photoShape: 'Formato da foto',
    circle: 'Círculo',
    rectangle: 'Retângulo',
    fontKey: 'Fonte (fontKey)',
    panelPhotoPosition: 'Posição da foto do painel',
    cardImagePosition: 'Posição da imagem de fundo',
    introSize: 'Tamanho da intro (px)',
    headingSize: 'Tamanho do heading (px)',
    bodySize: 'Tamanho do corpo (px)',
    introBold: 'Intro em negrito',
    introItalic: 'Intro em itálico',
    headingBold: 'Heading em negrito',
    headingItalic: 'Heading em itálico',
    bodyBold: 'Corpo em negrito',
    bodyItalic: 'Corpo em itálico',
    cardMessage: 'Mensagem no cartão',
    intro: 'Intro',
    tip: 'Dica / tip',
    colors: {
      pageColor: 'Cor da página',
      envelopeColor: 'Cor do envelope',
      envelopeLiner: 'Forro do envelope',
      envelopeExterior: 'Exterior do envelope',
      envelopeNameColor: 'Nome no envelope',
      sealBg: 'Fundo do selo',
      cardColor: 'Cor do cartão',
      cardTextColor: 'Texto do cartão',
      ctaRsvpColor: 'Texto do RSVP',
      greetingColor: 'Cor da saudação',
      nameColor: 'Cor do nome',
      bodyColor: 'Cor do corpo',
      introColor: 'Cor da intro',
      headingColor: 'Cor do heading',
    },
    texts: {
      sealLabel: 'Rótulo do selo',
      mapUrl: 'Map URL',
      openLabel: 'Rótulo abrir envelope',
      forLabel: 'Rótulo "para:"',
      title: 'Título no cartão',
      eventName: 'Nome do evento no cartão',
      heading: 'Heading',
      hosts: 'Anfitriões',
      greeting: 'Saudação',
      dateLabel: 'Rótulo data',
      timeLabel: 'Rótulo horário',
      placeLabel: 'Rótulo local',
      cityLabel: 'Rótulo cidade',
      address1: 'Endereço linha 1',
      address2: 'Endereço linha 2',
      subject: 'Assunto (email)',
      ctaView: 'CTA ver',
      ctaCalendar: 'CTA calendário',
      ctaMap: 'CTA mapa',
      ctaRsvp: 'CTA RSVP',
      rsvpLabel: 'Rótulo RSVP',
      rsvpHint: 'Dica RSVP',
      suggestedPalette: 'Paleta sugerida (hex, vírgula)',
    },
    images: {
      pageTexture: 'Textura da página',
      envelopeTexture: 'Textura do envelope',
      sealUrl: 'Selo / logo',
      cardImageUrl: 'Imagem de fundo do cartão',
      panelPhotoUrl: 'Foto do painel',
    },
  },
  EN_CARD,
)

const EN_SECTIONS: Record<SectionEditorId, string> = {
  story: 'Story',
  schedule: 'Schedule',
  venues: 'Venues & hotels',
  places: 'Things to do',
  media: 'Media',
  faq: 'FAQ',
  contact: 'Contact',
  rsvp: 'RSVP',
  saveTheDate: 'Save the Date',
  invitation: 'Invitation',
  legal: 'Legal',
  reminders: 'Reminders',
  followUpSchedule: 'Follow-ups',
}

const PT_SECTIONS: Record<SectionEditorId, string> = {
  story: 'História',
  schedule: 'Programação',
  venues: 'Locais & hotéis',
  places: 'O que fazer',
  media: 'Mídia',
  faq: 'FAQ',
  contact: 'Contato',
  rsvp: 'RSVP',
  saveTheDate: 'Save the Date',
  invitation: 'Convite',
  legal: 'Legal',
  reminders: 'Lembretes',
  followUpSchedule: 'Follow-ups',
}

const ES_SECTIONS: Record<SectionEditorId, string> = {
  story: 'Historia',
  schedule: 'Programa',
  venues: 'Lugares y hoteles',
  places: 'Qué hacer',
  media: 'Medios',
  faq: 'FAQ',
  contact: 'Contacto',
  rsvp: 'RSVP',
  saveTheDate: 'Save the Date',
  invitation: 'Invitación',
  legal: 'Legal',
  reminders: 'Recordatorios',
  followUpSchedule: 'Follow-ups',
}

const HE_SECTIONS: Record<SectionEditorId, string> = {
  story: 'סיפור',
  schedule: 'לוח זמנים',
  venues: 'מקומות ומלונות',
  places: 'מה לעשות',
  media: 'מדיה',
  faq: 'שאלות נפוצות',
  contact: 'יצירת קשר',
  rsvp: 'RSVP',
  saveTheDate: 'Save the Date',
  invitation: 'הזמנה',
  legal: 'משפטי',
  reminders: 'תזכורות',
  followUpSchedule: 'Follow-ups',
}

function pack(
  locale: EventLocale,
  sections: Record<SectionEditorId, string>,
  cardUi: CardDesignUi,
  overrides: Partial<StudioUi>,
): StudioUi {
  const base: StudioUi = {
    events: 'Events',
    team: 'Team',
    landing: 'Landing',
    logout: 'Log out',
    member: 'Member',
    platformAdmin: 'Platform admin',
    owner: 'Owner',
    eventsTitle: 'Events',
    eventsSubtitleAll: 'Global view — all events across all organizations.',
    eventsSubtitleScoped: 'Events assigned to your account.',
    eventsSubtitleOrg: 'Events for organization {org}.',
    newEvent: 'New event',
    noEventsScoped: 'No events assigned to this account. Ask the Mitzvah team to grant access.',
    noEvents: 'No events yet. Create the first one with “New event”.',
    unnamed: 'Untitled',
    familyPrefix: 'Family',
    studioLanguage: 'Studio language',
    eventDashboard: 'Event dashboard',
    openWizard: 'Open wizard',
    wizard: 'Wizard',
    draftPreview: 'Draft preview',
    viewSite: 'View site',
    publish: 'Publish',
    requestApproval: 'Request approval',
    approvalLink: 'Approval link',
    duplicate: 'Duplicate',
    unarchive: 'Unarchive',
    archive: 'Archive',
    delete: 'Delete',
    deleteConfirm: 'Permanently delete this event? Prefer Archive when possible.',
    deleteSlugPrompt: 'Type the event slug to confirm permanent delete: {slug}',
    deleteSlugMismatch: 'Slug does not match — delete cancelled.',
    actionFailed: 'Action failed',
    deleteFailed: 'Could not delete',
    approvalPrompt: 'Send this link to the client for approval:',
    guests: 'Guests',
    peopleYesPending: 'People (yes/pending)',
    adultsChildren: 'Adults / children',
    rsvpBreakdown: 'RSVP yes / no / pending',
    stdSent: 'STD sent',
    invitesSent: 'Invites sent',
    editSection: 'Edit section',
    editSectionHint: 'Edit a section of the published event without reopening the full wizard.',
    scheduleInvites: 'Schedule invites',
    scheduleInvitesHint:
      'For each schedule moment, add all, remove all, or choose which families see it on the site.',
    guestsTitle: 'Guests',
    guestsHint:
      'Bulk send goes only to guests who have not received that email yet. Use the row actions to send (or re-send) to one family. Without a provider on localhost, status is still marked.',
    exportCsv: 'Export CSV',
    exportXlsx: 'Export XLSX',
    sendStd: 'Send Save the Date',
    sendInvite: 'Send invitations',
    sendStdOne: 'Send STD',
    sendInviteOne: 'Send invite',
    resendStdConfirm: 'This family already received the Save the Date. Send again?',
    resendInviteConfirm: 'This family already received the invitation. Send again?',
    sendOneOk: 'Sent to {name}',
    sendOneFailed: 'Could not send',
    noGuestEmail: 'This family has no email',
    sending: 'Sending…',
    testEmail: 'Test email',
    sendTestStd: 'Send STD test',
    sendTestInvite: 'Send invitation test',
    emailNeeded: 'Enter an email for the test send',
    followUpTitle: 'Follow-up to guests',
    followUpHint:
      'Manual send now. For automatic D-30/D-7/D-2 follow-ups (separate from reminders), use the Follow-ups wizard step.',
    followUpType: 'Communication type',
    followUpTypeReminder: 'Reminder',
    followUpTypeMessage: 'New message',
    followUpTypeUpdate: 'Event update',
    followUpAudience: 'Recipients',
    followUpAudienceAll: 'All guests with email',
    followUpAudienceYes: 'Confirmed (yes)',
    followUpAudiencePending: 'Pending RSVP',
    followUpAudienceNo: 'Declined (no)',
    followUpSubject: 'Subject (optional)',
    followUpSubjectPlaceholder: 'Leave blank to use the default subject',
    followUpBody: 'Message body',
    followUpBodyPlaceholder:
      'Example: Due to winter weather we are moving the party to…',
    followUpSend: 'Send to guests',
    followUpSendHint: 'Emails go out immediately to the selected audience.',
    followUpSendFailed: 'Could not send the follow-up',
    followUpLocalOk: 'Marked locally (no email provider configured)',
    followUpSent: 'sent',
    followUpFailures: 'failed',
    followUpDeferred: 'deferred',
    followUpHistory: 'Recent follow-ups',
    followUpBodyRequired: 'Write a message body before sending.',
    emailLogTitle: 'Email log',
    emailLogHint: 'Recent deliveries recorded by the platform (SES/Resend).',
    emailLogEmpty: 'No emails logged yet for this event.',
    emailLogRefresh: 'Refresh',
    emailLogRefreshing: 'Refreshing…',
    emailLogLoadFailed: 'Could not load the email log',
    emailLogWhen: 'When',
    emailLogType: 'Type',
    emailLogTo: 'To',
    emailLogStatus: 'Status',
    optionsTitle: 'Event options',
    optionsHint: 'Change what the event includes and its languages. The wizard and sends follow these choices.',
    products: 'Products',
    languages: 'Languages',
    optionsSaved: 'Options updated',
    optionsSaveFailed: 'Could not save options',
    productSite: 'Website',
    productSiteHint: 'Event pages: story, schedule, hotels, FAQ.',
    productInvite: 'Invitation',
    productInviteHint: 'Invitation email, RSVP and guest list.',
    productStd: 'Save the Date',
    productStdHint: 'Early email so guests can hold the date.',
    saving: 'Saving…',
    saved: 'Saved',
    saveError: 'Could not save',
    dirty: 'Unsaved changes',
    backToEvent: '← Event dashboard',
    editSectionTitle: 'Edit section · {label}',
    manageGuests: 'Manage guests',
    close: 'Close',
    addAll: 'Add all',
    removeAll: 'Remove all',
    searchFamily: 'Search family / person / email',
    saveCount: 'Save ({n})',
    scheduleEmpty: 'No schedule moments yet. Add them in Schedule to manage invites per event.',
    guestsEmptySchedule: 'Import or add guests to choose who sees each schedule moment.',
    invitedCount: '{invited}/{total} family(ies) invited',
    modeAll: 'all',
    modeNone: 'none',
    modeSubset: 'partial',
    importImage: 'Import image',
    importGallery: 'Import images to gallery',
    saveEventFirst: 'Save the event before importing images.',
    googlePhotos: 'Google Photos (optional)',
    googlePhotosMissingKey: ' — API key not configured in this environment',
    albumUrl: 'Album URL or ID',
    importing: 'Importing…',
    importToGallery: 'Import to gallery',
    googlePhotosSaveHint: 'Save the event and reopen the wizard to import with the event ID.',
    createWhat: 'What do you want to create now?',
    createHint: 'Click one or more options. You can change this later in the wizard or event panel.',
    localesLegend: 'Event languages',
    localesHint: 'Guests can use these languages. The first selected becomes the default.',
    createEvent: 'Create event',
    creating: 'Creating…',
    createFailed: 'Could not create',
    honoreeName: 'Honoree name',
    adults: 'Adults',
    children: 'Children',
    searchGuest: 'Search family / email',
    rsvpAll: 'RSVP: all',
    sortName: 'Sort: name',
    sortRsvp: 'Sort: RSVP',
    sortStd: 'Sort: STD',
    sortInvite: 'Sort: invite',
    noGuestsFilter: 'No guests in this filter.',
    programCol: 'Schedule',
    allMoments: 'All moments',
    subset: 'Subset',
    none: 'None',
    preferScheduleInvites: 'Schedule invites',
    shortcut: 'Shortcut · prefer',
    deletePerson: 'Delete',
    deleteFamily: 'Delete family',
    deleteGuestConfirm: 'Delete this guest?',
    deleteFamilyConfirm: 'Delete this family and all guests?',
    actions: 'Actions',
    email: 'Email',
    people: 'People',
    sectionLabels: sections,
    card: cardUi,
    ...overrides,
  }
  // keep locale unused except for clarity / future
  void locale
  return base
}

const STUDIO_UI: Record<EventLocale, StudioUi> = {
  en: pack('en', EN_SECTIONS, EN_CARD, {}),
  pt: pack('pt', PT_SECTIONS, PT_CARD, {
    events: 'Eventos',
    team: 'Equipa',
    landing: 'Landing',
    logout: 'Sair',
    member: 'Membro',
    platformAdmin: 'Admin plataforma',
    owner: 'Owner',
    eventsTitle: 'Eventos',
    eventsSubtitleAll: 'Visão global — todos os eventos de todas as organizações.',
    eventsSubtitleScoped: 'Eventos atribuídos à sua conta.',
    eventsSubtitleOrg: 'Eventos da organização {org}.',
    newEvent: 'Novo evento',
    noEventsScoped: 'Nenhum evento atribuído a esta conta. Peça à equipa Mitzvah para liberar o acesso.',
    noEvents: 'Nenhum evento. Crie o primeiro com “Novo evento”.',
    unnamed: 'Sem nome',
    familyPrefix: 'Família',
    studioLanguage: 'Idioma do studio',
    eventDashboard: 'Dashboard do evento',
    openWizard: 'Abrir wizard',
    wizard: 'Wizard',
    draftPreview: 'Preview rascunho',
    viewSite: 'Ver site',
    publish: 'Publicar',
    requestApproval: 'Pedir aprovação',
    approvalLink: 'Link de aprovação',
    duplicate: 'Duplicar',
    unarchive: 'Restaurar',
    archive: 'Arquivar',
    delete: 'Apagar',
    deleteConfirm: 'Apagar este evento de forma permanente? Prefira Arquivar quando possível.',
    deleteSlugPrompt: 'Digite o slug do evento para confirmar a exclusão permanente: {slug}',
    deleteSlugMismatch: 'Slug não confere — exclusão cancelada.',
    actionFailed: 'Falha na ação',
    deleteFailed: 'Não foi possível apagar',
    approvalPrompt: 'Envie este link ao cliente para aprovar:',
    guests: 'Convidados',
    peopleYesPending: 'Pessoas (sim/pendente)',
    adultsChildren: 'Adultos / crianças',
    rsvpBreakdown: 'RSVP sim / não / pendente',
    stdSent: 'STD enviados',
    invitesSent: 'Convites enviados',
    editSection: 'Editar seção',
    editSectionHint: 'Edite uma seção do evento publicado sem reabrir o wizard completo.',
    scheduleInvites: 'Convites da programação',
    scheduleInvitesHint:
      'Por cada momento do schedule, adicione todos, remova todos ou escolha quais famílias veem o evento no site.',
    guestsTitle: 'Convidados',
    guestsHint:
      'O envio em massa vai só para quem ainda não recebeu aquele email. Use as ações da linha para enviar (ou reenviar) a uma família. Sem provedor no localhost, o status é marcado mesmo assim.',
    exportCsv: 'Exportar CSV',
    exportXlsx: 'Exportar XLSX',
    sendStd: 'Enviar Save the Date',
    sendInvite: 'Enviar convites',
    sendStdOne: 'Enviar STD',
    sendInviteOne: 'Enviar convite',
    resendStdConfirm: 'Esta família já recebeu o Save the Date. Enviar de novo?',
    resendInviteConfirm: 'Esta família já recebeu o convite. Enviar de novo?',
    sendOneOk: 'Enviado para {name}',
    sendOneFailed: 'Não foi possível enviar',
    noGuestEmail: 'Esta família não tem email',
    sending: 'Enviando…',
    testEmail: 'Email de teste',
    sendTestStd: 'Enviar teste STD',
    sendTestInvite: 'Enviar teste convite',
    emailNeeded: 'Informe um email para o envio de teste',
    followUpTitle: 'Follow-up aos convidados',
    followUpHint:
      'Envio manual agora. Para follow-ups automáticos D-30/D-7/D-2 (separados dos lembretes), use o passo Follow-ups do wizard.',
    followUpType: 'Tipo de comunicação',
    followUpTypeReminder: 'Lembrete',
    followUpTypeMessage: 'Nova mensagem',
    followUpTypeUpdate: 'Atualização do evento',
    followUpAudience: 'Destinatários',
    followUpAudienceAll: 'Todos com email',
    followUpAudienceYes: 'Confirmados (sim)',
    followUpAudiencePending: 'RSVP pendente',
    followUpAudienceNo: 'Recusaram (não)',
    followUpSubject: 'Assunto (opcional)',
    followUpSubjectPlaceholder: 'Deixe em branco para usar o assunto padrão',
    followUpBody: 'Corpo da mensagem',
    followUpBodyPlaceholder:
      'Ex.: Por causa do mau tempo, vamos mudar o local para…',
    followUpSend: 'Enviar aos convidados',
    followUpSendHint: 'Os emails saem de imediato para o público escolhido.',
    followUpSendFailed: 'Não foi possível enviar o follow-up',
    followUpLocalOk: 'Marcado localmente (sem provedor de email)',
    followUpSent: 'enviado(s)',
    followUpFailures: 'falha(s)',
    followUpDeferred: 'adiado(s)',
    followUpHistory: 'Follow-ups recentes',
    followUpBodyRequired: 'Escreva o corpo da mensagem antes de enviar.',
    emailLogTitle: 'Log de emails',
    emailLogHint: 'Entregas recentes registadas pela plataforma (SES/Resend).',
    emailLogEmpty: 'Ainda não há emails registados neste evento.',
    emailLogRefresh: 'Atualizar',
    emailLogRefreshing: 'A atualizar…',
    emailLogLoadFailed: 'Não foi possível carregar o log de emails',
    emailLogWhen: 'Quando',
    emailLogType: 'Tipo',
    emailLogTo: 'Para',
    emailLogStatus: 'Estado',
    optionsTitle: 'Opções do evento',
    optionsHint: 'Altere o que o evento inclui e os idiomas. O wizard e os envios adaptam-se a estas escolhas.',
    products: 'Produtos',
    languages: 'Idiomas',
    optionsSaved: 'Opções atualizadas',
    optionsSaveFailed: 'Não foi possível guardar as opções',
    productSite: 'Site',
    productSiteHint: 'Páginas do evento: história, programação, hotéis, FAQ.',
    productInvite: 'Convite',
    productInviteHint: 'Email de convite, RSVP e lista de convidados.',
    productStd: 'Save the Date',
    productStdHint: 'Aviso antecipado por email para reservar a data.',
    saving: 'A guardar…',
    saved: 'Guardado',
    saveError: 'Erro ao guardar',
    dirty: 'Alterações por guardar',
    backToEvent: '← Dashboard do evento',
    editSectionTitle: 'Editar seção · {label}',
    manageGuests: 'Gerir convidados',
    close: 'Fechar',
    addAll: 'Adicionar todos',
    removeAll: 'Remover todos',
    searchFamily: 'Buscar família / pessoa / email',
    saveCount: 'Guardar ({n})',
    scheduleEmpty:
      'Ainda não há momentos na programação. Adicione-os na seção Programação para gerir convites por evento.',
    guestsEmptySchedule:
      'Importe ou adicione convidados para escolher quem vê cada momento da programação.',
    invitedCount: '{invited}/{total} família(s) convidada(s)',
    modeAll: 'todos',
    modeNone: 'nenhum',
    modeSubset: 'parcial',
    importImage: 'Importar imagem',
    importGallery: 'Importar imagens para a galeria',
    saveEventFirst: 'Salve o evento antes de importar imagens.',
    googlePhotos: 'Google Fotos (opcional)',
    googlePhotosMissingKey: ' — API key não configurada neste ambiente',
    albumUrl: 'URL ou ID do álbum',
    importing: 'A importar…',
    importToGallery: 'Importar para galeria',
    googlePhotosSaveHint: 'Guarde o evento e reabra o wizard para importar com o ID do evento.',
    createWhat: 'O que quer criar agora?',
    createHint: 'Clique em uma ou mais opções. Pode mudar depois no wizard ou no painel do evento.',
    localesLegend: 'Idiomas do evento',
    localesHint: 'Idiomas disponíveis para convidados. O primeiro selecionado fica como padrão.',
    createEvent: 'Criar evento',
    creating: 'A criar…',
    createFailed: 'Não foi possível criar',
    honoreeName: 'Nome do celebrante',
    adults: 'Adultos',
    children: 'Crianças',
    searchGuest: 'Buscar família / email',
    rsvpAll: 'RSVP: todos',
    sortName: 'Ordenar: nome',
    sortRsvp: 'Ordenar: RSVP',
    sortStd: 'Ordenar: STD',
    sortInvite: 'Ordenar: convite',
    noGuestsFilter: 'Nenhum convidado neste filtro.',
    programCol: 'Programação',
    allMoments: 'Todos os momentos',
    subset: 'Subconjunto',
    none: 'Nenhum',
    preferScheduleInvites: 'Convites da programação',
    shortcut: 'Atalho · preferir',
    deletePerson: 'Excluir',
    deleteFamily: 'Excluir família',
    deleteGuestConfirm: 'Excluir este convidado?',
    deleteFamilyConfirm: 'Excluir esta família e todos os convidados?',
    actions: 'Ações',
    email: 'Email',
    people: 'Pessoas',
  }),
  es: pack('es', ES_SECTIONS, card({
    summary: 'Diseño del sobre ({n} parámetros)',
    importImage: 'Importar imagen',
    remove: 'Eliminar',
    saveBeforeUpload: 'Guarde el evento antes de importar imágenes.',
    uploadFail: 'Error al subir',
    photoShape: 'Formato de la foto',
    circle: 'Círculo',
    rectangle: 'Rectángulo',
    fontKey: 'Fuente (fontKey)',
    panelPhotoPosition: 'Posición de la foto del panel',
    cardImagePosition: 'Posición de la imagen de fondo',
    introSize: 'Tamaño de la intro (px)',
    headingSize: 'Tamaño del heading (px)',
    bodySize: 'Tamaño del cuerpo (px)',
    introBold: 'Intro en negrita',
    introItalic: 'Intro en cursiva',
    headingBold: 'Heading en negrita',
    headingItalic: 'Heading en cursiva',
    bodyBold: 'Cuerpo en negrita',
    bodyItalic: 'Cuerpo en cursiva',
    cardMessage: 'Mensaje en la tarjeta',
    intro: 'Intro',
    tip: 'Consejo',
  }, EN_CARD), {
    events: 'Eventos',
    team: 'Equipo',
    logout: 'Salir',
    member: 'Miembro',
    eventsTitle: 'Eventos',
    newEvent: 'Nuevo evento',
    familyPrefix: 'Familia',
    studioLanguage: 'Idioma del studio',
    openWizard: 'Abrir wizard',
    viewSite: 'Ver sitio',
    publish: 'Publicar',
    guests: 'Invitados',
    guestsTitle: 'Invitados',
    sendInvite: 'Enviar invitaciones',
    optionsTitle: 'Opciones del evento',
    products: 'Productos',
    languages: 'Idiomas',
    saving: 'Guardando…',
    saved: 'Guardado',
    createEvent: 'Crear evento',
    creating: 'Creando…',
    honoreeName: 'Nombre del celebrante',
    importImage: 'Importar imagen',
    importGallery: 'Importar imágenes a la galería',
    manageGuests: 'Gestionar invitados',
    addAll: 'Añadir todos',
    removeAll: 'Quitar todos',
  }),
  he: pack('he', HE_SECTIONS, card({
    summary: 'עיצוב המעטפה ({n} פרמטרים)',
    importImage: 'ייבוא תמונה',
    remove: 'הסרה',
    saveBeforeUpload: 'שמרו את האירוע לפני ייבוא תמונות.',
    uploadFail: 'העלאה נכשלה',
    photoShape: 'פורמט תמונה',
    circle: 'עיגול',
    rectangle: 'מלבן',
    fontKey: 'גופן (fontKey)',
    panelPhotoPosition: 'מיקום תמונת הפאנל',
    cardImagePosition: 'מיקום תמונת הרקע',
    introSize: 'גודל Intro (px)',
    headingSize: 'גודל כותרת (px)',
    bodySize: 'גודל גוף (px)',
    introBold: 'Intro מודגש',
    introItalic: 'Intro נטוי',
    headingBold: 'כותרת מודגשת',
    headingItalic: 'כותרת נטויה',
    bodyBold: 'גוף מודגש',
    bodyItalic: 'גוף נטוי',
    cardMessage: 'הודעה בכרטיס',
    intro: 'Intro',
    tip: 'טיפ',
  }, EN_CARD), {
    events: 'אירועים',
    team: 'צוות',
    logout: 'יציאה',
    member: 'חבר/ה',
    eventsTitle: 'אירועים',
    newEvent: 'אירוע חדש',
    familyPrefix: 'משפחה',
    studioLanguage: 'שפת הסטודיו',
    openWizard: 'פתיחת אשף',
    viewSite: 'צפייה באתר',
    publish: 'פרסום',
    guests: 'אורחים',
    guestsTitle: 'אורחים',
    sendInvite: 'שליחת הזמנות',
    optionsTitle: 'אפשרויות האירוע',
    products: 'מוצרים',
    languages: 'שפות',
    saving: 'שומרים…',
    saved: 'נשמר',
    createEvent: 'יצירת אירוע',
    creating: 'יוצרים…',
    honoreeName: 'שם החוגג/ת',
    importImage: 'ייבוא תמונה',
    importGallery: 'ייבוא תמונות לגלריה',
    manageGuests: 'ניהול אורחים',
    addAll: 'הוספת הכל',
    removeAll: 'הסרת הכל',
  }),
}

export function studioUi(locale: EventLocale | string | null | undefined): StudioUi {
  const key = (locale || 'en') as EventLocale
  return STUDIO_UI[key] || STUDIO_UI.en
}

export function sectionLabelsFor(locale: EventLocale | string | null | undefined) {
  return studioUi(locale).sectionLabels
}

/** Keep SECTION_EDITOR_IDS referenced so tree-shaking does not drop the import. */
void SECTION_EDITOR_IDS

export function fillTemplate(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  )
}
