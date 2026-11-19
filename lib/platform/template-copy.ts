import type { EventLocale } from './types'

export type TemplateUi = {
  joinUs: string
  rsvpNow: string
  welcome: string
  parentsMessage: string
  theFamily: string
  about: string
  aboutHonoree: string
  schedule: string
  faq: string
  hotels: string
  walking: string
  driving: string
  website: string
  map: string
  thingsToDo: string
  travel: string
  gallery: string
  contact: string
  phone: string
  email: string
  whatsapp: string
  addToCalendar: string
  days: string
  hours: string
  minutes: string
  seconds: string
  dressCode: string
  parking: string
  emailPreview: string
  invitePreview: string
  sitePreview: string
  emailStd: string
  emailInvite: string
  emailReminder: string
  emailFollowUp: string
  emailRsvp: string
  inviteCard: string
  toGuests: string
  openEnvelope: string
  viewWebsite: string
  confirmRsvp: string
  guestConfirmed: string
  guestDeclined: string
  guestPending: string
  categories: Record<string, string>
}

const PACKS: Record<EventLocale, TemplateUi> = {
  pt: {
    joinUs: 'Celebre conosco',
    rsvpNow: 'Confirmar presença',
    welcome: 'Boas-vindas',
    parentsMessage: 'Mensagem dos pais',
    theFamily: 'A família',
    about: 'Sobre a celebração',
    aboutHonoree: 'Sobre o celebrante',
    schedule: 'Programação',
    faq: 'Perguntas frequentes',
    hotels: 'Hotéis',
    walking: 'a pé',
    driving: 'de carro',
    website: 'Site',
    map: 'Mapa',
    thingsToDo: 'O que fazer',
    travel: 'Viagem',
    gallery: 'Galeria',
    contact: 'Contato',
    phone: 'Telefone',
    email: 'Email',
    whatsapp: 'WhatsApp',
    addToCalendar: 'Adicionar ao calendário',
    days: 'Dias',
    hours: 'Horas',
    minutes: 'Min',
    seconds: 'Seg',
    dressCode: 'Dress code',
    parking: 'Estacionamento',
    emailPreview: 'Preview do email',
    invitePreview: 'Preview do convite',
    sitePreview: 'Site',
    emailStd: 'Save the Date · email',
    emailInvite: 'Convite · email',
    emailReminder: 'Lembrete · email',
    emailFollowUp: 'Follow-up · email',
    emailRsvp: 'Confirmação RSVP · email',
    inviteCard: 'Convite · cartão',
    toGuests: 'Para a lista de convidados',
    openEnvelope: 'Abrir envelope',
    viewWebsite: 'Ver o site do evento',
    confirmRsvp: 'Confirmar presença',
    guestConfirmed: 'Confirmado',
    guestDeclined: 'Não vai',
    guestPending: 'RSVP pendente',
    categories: {
      restaurant: 'Restaurantes',
      shopping: 'Compras',
      museum: 'Museus & cultura',
      park: 'Parques',
      family: 'Família',
      tips: 'Dicas',
      other: 'Outros',
    },
  },
  en: {
    joinUs: 'Join us for a special celebration',
    rsvpNow: 'RSVP now',
    welcome: 'Welcome',
    parentsMessage: 'Parents’ message',
    theFamily: 'The family',
    about: 'About the celebration',
    aboutHonoree: 'About the honoree',
    schedule: 'Schedule',
    faq: 'FAQ',
    hotels: 'Hotels',
    walking: 'walk',
    driving: 'drive',
    website: 'Website',
    map: 'Map',
    thingsToDo: 'Things to do',
    travel: 'Travel',
    gallery: 'Gallery',
    contact: 'Contact',
    phone: 'Phone',
    email: 'Email',
    whatsapp: 'WhatsApp',
    addToCalendar: 'Add to calendar',
    days: 'Days',
    hours: 'Hours',
    minutes: 'Min',
    seconds: 'Sec',
    dressCode: 'Dress code',
    parking: 'Parking',
    emailPreview: 'Email preview',
    invitePreview: 'Invite preview',
    sitePreview: 'Website',
    emailStd: 'Save the Date · email',
    emailInvite: 'Invitation · email',
    emailReminder: 'Reminder · email',
    emailFollowUp: 'Follow-up · email',
    emailRsvp: 'RSVP confirmation · email',
    inviteCard: 'Invitation · card',
    toGuests: 'To the guest list',
    openEnvelope: 'Open envelope',
    viewWebsite: 'View the event website',
    confirmRsvp: 'Confirm attendance',
    guestConfirmed: 'Confirmed',
    guestDeclined: 'Declined',
    guestPending: 'Pending RSVP',
    categories: {
      restaurant: 'Restaurants',
      shopping: 'Shopping',
      museum: 'Museums & culture',
      park: 'Parks',
      family: 'Family',
      tips: 'Local tips',
      other: 'Other',
    },
  },
  es: {
    joinUs: 'Celebra con nosotros',
    rsvpNow: 'Confirmar asistencia',
    welcome: 'Bienvenida',
    parentsMessage: 'Mensaje de los padres',
    theFamily: 'La familia',
    about: 'Sobre la celebración',
    aboutHonoree: 'Sobre el celebrante',
    schedule: 'Programa',
    faq: 'Preguntas frecuentes',
    hotels: 'Hoteles',
    walking: 'a pie',
    driving: 'en coche',
    website: 'Sitio',
    map: 'Mapa',
    thingsToDo: 'Qué hacer',
    travel: 'Viaje',
    gallery: 'Galería',
    contact: 'Contacto',
    phone: 'Teléfono',
    email: 'Email',
    whatsapp: 'WhatsApp',
    addToCalendar: 'Añadir al calendario',
    days: 'Días',
    hours: 'Horas',
    minutes: 'Min',
    seconds: 'Seg',
    dressCode: 'Dress code',
    parking: 'Estacionamiento',
    emailPreview: 'Vista previa del email',
    invitePreview: 'Vista previa de la invitación',
    sitePreview: 'Sitio',
    emailStd: 'Save the Date · email',
    emailInvite: 'Invitación · email',
    emailReminder: 'Recordatorio · email',
    emailFollowUp: 'Follow-up · email',
    emailRsvp: 'Confirmación RSVP · email',
    inviteCard: 'Invitación · tarjeta',
    toGuests: 'Para la lista de invitados',
    openEnvelope: 'Abrir sobre',
    viewWebsite: 'Ver el sitio del evento',
    confirmRsvp: 'Confirmar asistencia',
    guestConfirmed: 'Confirmado',
    guestDeclined: 'No asistirá',
    guestPending: 'RSVP pendiente',
    categories: {
      restaurant: 'Restaurantes',
      shopping: 'Compras',
      museum: 'Museos y cultura',
      park: 'Parques',
      family: 'Familia',
      tips: 'Consejos',
      other: 'Otros',
    },
  },
  he: {
    joinUs: 'חגגו איתנו',
    rsvpNow: 'אישור הגעה',
    welcome: 'ברוכים הבאים',
    parentsMessage: 'מסר מההורים',
    theFamily: 'המשפחה',
    about: 'על החגיגה',
    aboutHonoree: 'על החוגג/ת',
    schedule: 'לוח זמנים',
    faq: 'שאלות נפוצות',
    hotels: 'מלונות',
    walking: 'הליכה',
    driving: 'נסיעה',
    website: 'אתר',
    map: 'מפה',
    thingsToDo: 'מה לעשות',
    travel: 'נסיעות',
    gallery: 'גלריה',
    contact: 'יצירת קשר',
    phone: 'טלפון',
    email: 'אימייל',
    whatsapp: 'וואטסאפ',
    addToCalendar: 'הוספה ליומן',
    days: 'ימים',
    hours: 'שעות',
    minutes: 'דק׳',
    seconds: 'שנ׳',
    dressCode: 'קוד לבוש',
    parking: 'חניה',
    emailPreview: 'תצוגת אימייל',
    invitePreview: 'תצוגת הזמנה',
    sitePreview: 'אתר',
    emailStd: 'שמרו את התאריך · אימייל',
    emailInvite: 'הזמנה · אימייל',
    emailReminder: 'תזכורת · אימייל',
    emailFollowUp: 'Follow-up · אימייל',
    emailRsvp: 'אישור RSVP · אימייל',
    inviteCard: 'הזמנה · כרטיס',
    toGuests: 'לרשימת האורחים',
    openEnvelope: 'פתיחת מעטפה',
    viewWebsite: 'לאתר האירוע',
    confirmRsvp: 'אישור הגעה',
    guestConfirmed: 'אושר',
    guestDeclined: 'לא מגיע/ה',
    guestPending: 'ממתין לאישור',
    categories: {
      restaurant: 'מסעדות',
      shopping: 'קניות',
      museum: 'מוזיאונים ותרבות',
      park: 'פארקים',
      family: 'משפחה',
      tips: 'טיפים',
      other: 'אחר',
    },
  },
}

export function templateUi(locale: EventLocale): TemplateUi {
  return PACKS[locale]
}
