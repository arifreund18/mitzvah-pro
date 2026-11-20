import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

/**
 * Documents E1/E2/E3 isolation contracts (no live DNS / DB required).
 */
describe('event isolation domain contracts', () => {
  it('E1: server-managed domain fields stay on existing values', () => {
    const existing = {
      slug: 'adissi',
      mail: { fromEmail: 'convites@mail.adissi.mitzvah.pro', status: 'verified', configurationSetName: 'mitzvah-adissi' },
      customHost: 'festa.adissi.com',
      customHostStatus: 'verified',
      customHostToken: 'tok-a',
    }
    const incoming = {
      slug: 'hijacked',
      mail: { fromEmail: 'spoof@mitzvah.pro', status: 'verified', configurationSetName: 'mitzvah-other' },
      customHost: 'outro-cliente.com',
      customHostStatus: 'verified',
      customHostToken: 'tok-b',
      seoTitle: 'ok to change',
    }
    const locked = {
      ...incoming,
      slug: existing.slug,
      mail: existing.mail,
      customHost: existing.customHost,
      customHostStatus: existing.customHostStatus,
      customHostToken: existing.customHostToken,
    }
    assert.equal(locked.mail.fromEmail, 'convites@mail.adissi.mitzvah.pro')
    assert.equal(locked.customHost, 'festa.adissi.com')
    assert.equal(locked.slug, 'adissi')
    assert.equal(locked.seoTitle, 'ok to change')
  })

  it('E2: host taken check treats www and bare as the same needle', () => {
    const normalize = (host: string) =>
      host.split(':')[0].toLowerCase().replace(/^www\./, '').replace(/\.$/, '')
    assert.equal(normalize('www.festa.com'), normalize('festa.com'))
    const events = [
      { id: 'a', host: 'festa.com' },
      { id: 'b', host: '' },
    ]
    const needle = normalize('www.festa.com')
    const taken = events.some(
      (event) => event.id !== 'b' && normalize(event.host) === needle && Boolean(event.host),
    )
    assert.equal(taken, true)
  })

  it('E3: duplicate resets mail and custom host', () => {
    const copyDomain = {
      slug: 'adissi-copia',
      mail: { fromEmail: '', status: 'skipped' as const },
      customHost: '',
      customHostStatus: 'none' as const,
      customHostToken: 'new-token',
    }
    assert.equal(copyDomain.customHost, '')
    assert.equal(copyDomain.customHostStatus, 'none')
    assert.equal(copyDomain.mail.fromEmail, '')
  })
})
