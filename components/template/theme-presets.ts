import type { ThemeId } from '@/lib/platform/types'

export const THEME_PRESETS: Record<
  ThemeId,
  { bg: string; text: string; muted: string; card: string; inviteBg: string; inviteText: string }
> = {
  navy: {
    bg: '#0b1020',
    text: '#ffffff',
    muted: 'rgba(255,255,255,0.68)',
    card: 'rgba(255,255,255,0.07)',
    inviteBg: '#f7f1e4',
    inviteText: '#1c1630',
  },
  ivory: {
    bg: '#f6f0e4',
    text: '#241c14',
    muted: '#6a5b4c',
    card: '#ffffff',
    inviteBg: '#fffaf2',
    inviteText: '#3b2418',
  },
  forest: {
    bg: '#102018',
    text: '#f4efe4',
    muted: 'rgba(244,239,228,0.72)',
    card: 'rgba(255,255,255,0.07)',
    inviteBg: '#f3ead6',
    inviteText: '#142018',
  },
  burgundy: {
    bg: '#1a0b12',
    text: '#f7e7d0',
    muted: 'rgba(247,231,208,0.72)',
    card: 'rgba(255,255,255,0.07)',
    inviteBg: '#f8ecd8',
    inviteText: '#3a121c',
  },
}
