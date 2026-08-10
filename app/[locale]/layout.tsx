import { NextIntlClientProvider } from 'next-intl'
import { notFound } from 'next/navigation'
import { DocumentLocale } from '@/components/mitzvah/DocumentLocale'
import { getMessages, isLocale, LOCALES } from '@/lib/i18n'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export default async function PlatformLocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const messages = await getMessages(locale)

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <DocumentLocale locale={locale} />
      {children}
    </NextIntlClientProvider>
  )
}
