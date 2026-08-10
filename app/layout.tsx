import type { Metadata } from 'next'
import { Inter, Noto_Sans_Hebrew, Playfair_Display } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin', 'latin-ext'], variable: '--font-playfair' })
const notoHebrew = Noto_Sans_Hebrew({
  subsets: ['hebrew'],
  variable: '--font-hebrew',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Mitzvah.pro',
  description: 'Plataforma para sites de Bar e Bat Mitzvah',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${notoHebrew.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
