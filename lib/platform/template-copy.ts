import type { EventLocale } from './types'

export type TemplateUi = {
  joinUs: string
  rsvpNow: string
  welcome: string
  theFamily: string
  about: string
  aboutHonoree: string
  schedule: string
  faq: string
  hotels: string
  walking: string
  website: string
  map: string
  thingsToDo: string
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
  emailStd: string
  emailInvite: string
  toGuests: string
  openEnvelope: string
  viewWebsite: string
  confirmRsvp: string
  categories: Record<string, string>
}

const PACKS: Record<EventLocale, TemplateUi> = {
  pt: {
    joinUs: 'Celebre conosco',
    rsvpNow: 'Confirmar presença',
    welcome: 'Boas-vindas',
    theFamily: 'A família',
    about: 'Sobre a celebração',
    aboutHonoree: 'Sobre o celebrante',
    schedule: 'Programação',
    faq: 'Perguntas frequentes',
    hotels: 'Hotéis',
    walking: 'a pé',
    website: 'Site',
    map: 'Mapa',
    thingsToDo: 'O que fazer',
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
    emailStd: 'Save the Date · email',
    emailInvite: 'Convite · email',
    toGuests: 'Para a lista de convidados',
    openEnvelope: 'Abrir envelope',
    viewWebsite: 'Ver o site do evento',
    confirmRsvp: 'Confirmar presença',
    categories: {
      restaurant: 'Restaurantes',
      shopping: 'Compras',
      museum: 'Museus & cultura',
      park: 'Parques',
      other: 'Outros',
    },
  },
  en: {
    joinUs: 'Join us for a special celebration',
    rsvpNow: 'RSVP now',
    welcome: 'Welcome',
    theFamily: 'The family',
    about: 'About the celebration',
    aboutHonoree: 'About the honoree',
    schedule: 'Schedule',
    faq: 'FAQ',
    hotels: 'Hotels',
    walking: 'walking',
    website: 'Website',
    map: 'Map',
    thingsToDo: 'Things to do',
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
    emailStd: 'Save the Date · email',
    emailInvite: 'Invitation · email',
    toGuests: 'To the guest list',
    openEnvelope: 'Open envelope',
    viewWebsite: 'View the event website',
    confirmRsvp: 'Confirm attendance',
    categories: {
      restaurant: 'Restaurants',
      shopping: 'Shopping',
      museum: 'Museums & culture',
      park: 'Parks',
      other: 'Other',
    },
  },
  es: {
    joinUs: 'Celebra con nosotros',
    rsvpNow: 'Confirmar asistencia',
    welcome: 'Bienvenida',
    theFamily: 'La familia',
    about: 'Sobre la celebración',
    aboutHonoree: 'Sobre el celebrante',
    schedule: 'Programa',
    faq: 'Preguntas frecuentes',
    hotels: 'Hoteles',
    walking: 'a pie',
    website: 'Sitio',
    map: 'Mapa',
    thingsToDo: 'Qué hacer',
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
    emailStd: 'Save the Date · email',
    emailInvite: 'Invitación · email',
    toGuests: 'Para la lista de invitados',
    openEnvelope: 'Abrir sobre',
    viewWebsite: 'Ver el sitio del evento',
    confirmRsvp: 'Confirmar asistencia',
    categories: {
      restaurant: 'Restaurantes',
      shopping: 'Compras',
      museum: 'Museos y cultura',
      park: 'Parques',
      other: 'Otros',
    },
  },
  he: {
    joinUs: 'חגגו איתנו',
    rsvpNow: 'אישור הגעה',
    welcome: 'ברוכים הבאים',
    theFamily: 'המשפחה',
    about: 'על החגיגה',
    aboutHonoree: 'על החוגג/ת',
    schedule: 'לוח זמנים',
    faq: 'שאלות נפוצות',
    hotels: 'מלונות',
    walking: 'הליכה',
    website: 'אתר',
    map: 'מפה',
    thingsToDo: 'מה לעשות',
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
    emailStd: 'שמרו את התאריך · אימייל',
    emailInvite: 'הזמנה · אימייל',
    toGuests: 'לרשימת האורחים',
    openEnvelope: 'פתיחת מעטפה',
    viewWebsite: 'לאתר האירוע',
    confirmRsvp: 'אישור הגעה',
    categories: {
      restaurant: 'מסעדות',
      shopping: 'קניות',
      museum: 'מוזיאונים ותרבות',
      park: 'פארקים',
      other: 'אחר',
    },
  },
}

export function templateUi(locale: EventLocale): TemplateUi {
  return PACKS[locale]
}
