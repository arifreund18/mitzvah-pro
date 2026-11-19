import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { resolveStudioLocale } from '../lib/platform/studio-locale.ts'
import { fillTemplate, sectionLabelsFor, studioUi } from '../lib/platform/studio-ui.ts'

describe('studioUi', () => {
  it('returns English card design labels for en events', () => {
    const ui = studioUi('en')
    assert.equal(ui.card.introSize, 'Intro size (px)')
    assert.equal(ui.card.colors.pageColor, 'Page color')
    assert.equal(ui.sectionLabels.story, 'Story')
    assert.equal(ui.sendInvite, 'Send invitations')
  })

  it('returns Portuguese dashboard chrome for pt', () => {
    const ui = studioUi('pt')
    assert.equal(ui.events, 'Eventos')
    assert.equal(ui.sectionLabels.schedule, 'Programação')
    assert.equal(ui.card.importImage, 'Importar imagem')
    assert.equal(ui.sendInviteOne, 'Enviar convite')
    assert.equal(ui.followUpTitle, 'Follow-up aos convidados')
    assert.equal(ui.followUpTypeUpdate, 'Atualização do evento')
  })

  it('fills templates', () => {
    assert.equal(fillTemplate('Save ({n})', { n: 3 }), 'Save (3)')
  })
})

describe('sectionLabelsFor', () => {
  it('covers every section id', () => {
    const labels = sectionLabelsFor('en')
    assert.ok(labels.invitation)
    assert.ok(labels.media)
  })
})

describe('resolveStudioLocale', () => {
  it('prefers cookie over Accept-Language', () => {
    assert.equal(
      resolveStudioLocale({ cookie: 'pt', acceptLanguage: 'en-US,en;q=0.9' }),
      'pt',
    )
  })

  it('falls back to Accept-Language then en', () => {
    assert.equal(resolveStudioLocale({ acceptLanguage: 'es-ES,es;q=0.9' }), 'es')
    assert.equal(resolveStudioLocale({}), 'en')
  })
})
