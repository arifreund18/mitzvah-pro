import type { EventLocale } from './types'

export type PublicRsvpCopy = {
  personalLinkOnly: string
  thanks: string
  error: string
  familyName: string
  email: string
  people: string
  status: string
  yes: string
  no: string
  pending: string
  meal: string
  dietary: string
  message: string
  submit: string
  submitting: string
}

const PUBLIC_RSVP: Record<EventLocale, PublicRsvpCopy> = {
  en: {
    personalLinkOnly: 'Use the personal link from your invitation email to RSVP.',
    thanks: 'Thank you! We received your family’s confirmation.',
    error: 'Could not submit RSVP.',
    familyName: 'Family name',
    email: 'Email',
    people: 'Guests',
    status: 'Response',
    yes: 'Attending',
    no: 'Cannot attend',
    pending: 'Pending',
    meal: 'Meal',
    dietary: 'Dietary needs',
    message: 'Message',
    submit: 'Send RSVP',
    submitting: 'Sending…',
  },
  pt: {
    personalLinkOnly: 'Use o link pessoal do e-mail de convite para confirmar presença.',
    thanks: 'Obrigado! Recebemos a confirmação da sua família.',
    error: 'Não foi possível enviar o RSVP.',
    familyName: 'Nome da família',
    email: 'Email',
    people: 'Pessoas',
    status: 'Presença',
    yes: 'Vamos',
    no: 'Não poderemos',
    pending: 'Pendente',
    meal: 'Refeição',
    dietary: 'Restrições alimentares',
    message: 'Mensagem',
    submit: 'Enviar RSVP',
    submitting: 'Enviando…',
  },
  es: {
    personalLinkOnly: 'Use el enlace personal del correo de invitación para confirmar.',
    thanks: '¡Gracias! Recibimos la confirmación de su familia.',
    error: 'No se pudo enviar el RSVP.',
    familyName: 'Nombre de la familia',
    email: 'Email',
    people: 'Personas',
    status: 'Asistencia',
    yes: 'Asistiremos',
    no: 'No podremos',
    pending: 'Pendiente',
    meal: 'Comida',
    dietary: 'Restricciones',
    message: 'Mensaje',
    submit: 'Enviar RSVP',
    submitting: 'Enviando…',
  },
  he: {
    personalLinkOnly: 'השתמשו בקישור האישי מהמייל כדי לאשר הגעה.',
    thanks: 'תודה! קיבלנו את אישור המשפחה.',
    error: 'לא ניתן לשלוח את האישור.',
    familyName: 'שם המשפחה',
    email: 'אימייל',
    people: 'אורחים',
    status: 'תשובה',
    yes: 'מגיעים',
    no: 'לא מגיעים',
    pending: 'ממתין',
    meal: 'ארוחה',
    dietary: 'הגבלות תזונה',
    message: 'הודעה',
    submit: 'שליחת אישור',
    submitting: 'שולחים…',
  },
}

export function publicRsvpCopy(locale: EventLocale): PublicRsvpCopy {
  return PUBLIC_RSVP[locale] || PUBLIC_RSVP.pt
}

export function openEnvelopeLabel(
  kind: 'std' | 'invite',
  locale: EventLocale,
  custom?: string,
): string {
  if (custom?.trim()) return custom.trim()
  const map: Record<EventLocale, { std: string; invite: string }> = {
    en: { std: 'Open save the date', invite: 'Open invitation' },
    pt: { std: 'Abrir save the date', invite: 'Abrir convite' },
    es: { std: 'Abrir save the date', invite: 'Abrir invitación' },
    he: { std: 'פתחו את Save the Date', invite: 'פתחו את ההזמנה' },
  }
  return (map[locale] || map.pt)[kind]
}

export function rsvpConfirmationText(
  locale: EventLocale,
  familyName: string,
  custom?: string,
): string {
  if (custom?.trim()) return custom.trim()
  const map: Record<EventLocale, string> = {
    en: `We received the RSVP for the ${familyName} family.`,
    pt: `Recebemos o RSVP da família ${familyName}.`,
    es: `Recibimos el RSVP de la familia ${familyName}.`,
    he: `קיבלנו את אישור ההגעה של משפחת ${familyName}.`,
  }
  return map[locale] || map.pt
}

export function reminderCopy(
  locale: EventLocale,
  name: string,
  days: number,
  familyName: string,
  custom?: string,
): { subject: string; body: string } {
  if (custom?.trim()) {
    return {
      subject:
        locale === 'he'
          ? `תזכורת — ${name} (${days}י׳)`
          : locale === 'pt'
            ? `Lembrete — ${name} (${days}d)`
            : locale === 'es'
              ? `Recordatorio — ${name} (${days}d)`
              : `Reminder — ${name} (${days}d)`,
      body: custom.trim(),
    }
  }
  const map: Record<EventLocale, { subject: string; body: string }> = {
    en: {
      subject: `Reminder — ${name} (${days}d)`,
      body: `Reminder: ${name} is in ${days} day${days === 1 ? '' : 's'}. We can't wait to celebrate with ${familyName || 'you'}.`,
    },
    pt: {
      subject: `Lembrete — ${name} (${days}d)`,
      body: `Lembrete: ${name} é em ${days} dia${days === 1 ? '' : 's'}. Mal podemos esperar celebrar com ${familyName || 'você'}.`,
    },
    es: {
      subject: `Recordatorio — ${name} (${days}d)`,
      body: `Recordatorio: ${name} es en ${days} día${days === 1 ? '' : 's'}. No vemos la hora de celebrar con ${familyName || 'usted'}.`,
    },
    he: {
      subject: `תזכורת — ${name} (${days}י׳)`,
      body: `תזכורת: ${name} בעוד ${days} ימים. מחכים לחגוג עם ${familyName || 'כם'}.`,
    },
  }
  return map[locale] || map.en
}

export function stdSubject(locale: EventLocale, name: string): string {
  const map: Record<EventLocale, string> = {
    en: `Save the Date — ${name}`,
    pt: `Save the Date — ${name}`,
    es: `Save the Date — ${name}`,
    he: `Save the Date — ${name}`,
  }
  return map[locale] || map.en
}
