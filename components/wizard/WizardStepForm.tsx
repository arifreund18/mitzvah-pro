'use client'

import { Field, SelectInput, TextArea, TextInput } from '@/components/wizard/fields'
import { typeLabel } from '@/lib/platform/defaults'
import { uid } from '@/lib/platform/ids'
import { EVENT_LOCALES, EVENT_TYPES, THEMES, type EventConfig, type EventType, type Guest } from '@/lib/platform/types'
import { reviewIssues } from '@/lib/platform/wizard'

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 1_500_000) {
      reject(new Error('Imagem maior que 1.5 MB'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'))
    reader.readAsDataURL(file)
  })
}

export function WizardStepForm({
  step,
  config,
  guests,
  onChange,
  onGuests,
}: {
  step: string
  config: EventConfig
  guests: Guest[]
  onChange: (next: EventConfig) => void
  onGuests: (next: Guest[]) => void
}) {
  const set = (next: EventConfig) => onChange(next)

  if (step === 'basics') {
    return (
      <div className="space-y-4">
        <Field label="Tipo">
          <SelectInput
            value={config.basics.type}
            onChange={(e) =>
              set({ ...config, basics: { ...config.basics, type: e.target.value as EventType } })
            }
          >
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {typeLabel(type)}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Nome do celebrante">
          <TextInput
            value={config.basics.honoreeName}
            onChange={(e) => set({ ...config, basics: { ...config.basics, honoreeName: e.target.value } })}
            placeholder="Noah, Beni, Sofia…"
          />
        </Field>
        <Field label="Família">
          <TextInput
            value={config.basics.familyName}
            onChange={(e) => set({ ...config, basics: { ...config.basics, familyName: e.target.value } })}
          />
        </Field>
        <Field label="Data">
          <TextInput
            type="date"
            value={config.basics.date}
            onChange={(e) => set({ ...config, basics: { ...config.basics, date: e.target.value } })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cidade">
            <TextInput
              value={config.basics.city}
              onChange={(e) => set({ ...config, basics: { ...config.basics, city: e.target.value } })}
            />
          </Field>
          <Field label="País">
            <TextInput
              value={config.basics.country}
              onChange={(e) => set({ ...config, basics: { ...config.basics, country: e.target.value } })}
            />
          </Field>
        </div>
      </div>
    )
  }

  if (step === 'locales') {
    return (
      <div className="space-y-4">
        <Field label="Idioma padrão do site" hint="Hebraico ativa RTL no preview imediatamente.">
          <SelectInput
            value={config.locales.default}
            onChange={(e) =>
              set({
                ...config,
                locales: { ...config.locales, default: e.target.value as EventConfig['locales']['default'] },
              })
            }
          >
            {EVENT_LOCALES.map((locale) => (
              <option key={locale} value={locale}>
                {locale.toUpperCase()}
              </option>
            ))}
          </SelectInput>
        </Field>
        <p className="text-sm text-white/50">
          Nesta versão local o conteúdo é único (o que você digita). O idioma define `lang` e a direção do
          site gerado.
        </p>
      </div>
    )
  }

  if (step === 'branding') {
    return (
      <div className="space-y-4">
        <Field label="Tema">
          <div className="grid grid-cols-2 gap-2">
            {THEMES.map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => set({ ...config, branding: { ...config.branding, theme } })}
                className={`rounded-xl border px-3 py-3 text-sm capitalize ${
                  config.branding.theme === theme
                    ? 'border-cyan-400 bg-cyan-400/10'
                    : 'border-white/15 bg-white/5'
                }`}
              >
                {theme}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Cor de destaque">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={config.branding.accentColor}
              onChange={(e) =>
                set({ ...config, branding: { ...config.branding, accentColor: e.target.value } })
              }
              className="h-10 w-14 cursor-pointer rounded-lg border border-white/15 bg-transparent"
            />
            <TextInput
              value={config.branding.accentColor}
              onChange={(e) =>
                set({ ...config, branding: { ...config.branding, accentColor: e.target.value } })
              }
            />
          </div>
        </Field>
      </div>
    )
  }

  if (step === 'story') {
    return (
      <div className="space-y-4">
        <Field label="Headline">
          <TextInput
            value={config.story.headline}
            onChange={(e) => set({ ...config, story: { ...config.story, headline: e.target.value } })}
          />
        </Field>
        <Field label="Subtítulo">
          <TextInput
            value={config.story.subtitle}
            onChange={(e) => set({ ...config, story: { ...config.story, subtitle: e.target.value } })}
          />
        </Field>
        <Field label="Mensagem dos pais">
          <TextArea
            value={config.story.parentsMessage}
            onChange={(e) =>
              set({ ...config, story: { ...config.story, parentsMessage: e.target.value } })
            }
          />
        </Field>
        <Field label="Sobre a celebração">
          <TextArea
            value={config.story.about}
            onChange={(e) => set({ ...config, story: { ...config.story, about: e.target.value } })}
          />
        </Field>
      </div>
    )
  }

  if (step === 'schedule') {
    return (
      <div className="space-y-4">
        {config.schedule.items.map((item, index) => (
          <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between text-xs text-white/40">
              <span>Momento {index + 1}</span>
              <button
                type="button"
                className="text-rose-300"
                onClick={() =>
                  set({
                    ...config,
                    schedule: { items: config.schedule.items.filter((row) => row.id !== item.id) },
                  })
                }
              >
                Remover
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput
                placeholder="Título"
                value={item.title}
                onChange={(e) =>
                  set({
                    ...config,
                    schedule: {
                      items: config.schedule.items.map((row) =>
                        row.id === item.id ? { ...row, title: e.target.value } : row,
                      ),
                    },
                  })
                }
              />
              <TextInput
                placeholder="Horário"
                value={item.time}
                onChange={(e) =>
                  set({
                    ...config,
                    schedule: {
                      items: config.schedule.items.map((row) =>
                        row.id === item.id ? { ...row, time: e.target.value } : row,
                      ),
                    },
                  })
                }
              />
              <TextInput
                placeholder="Local"
                value={item.place}
                onChange={(e) =>
                  set({
                    ...config,
                    schedule: {
                      items: config.schedule.items.map((row) =>
                        row.id === item.id ? { ...row, place: e.target.value } : row,
                      ),
                    },
                  })
                }
              />
              <TextInput
                placeholder="Endereço"
                value={item.address}
                onChange={(e) =>
                  set({
                    ...config,
                    schedule: {
                      items: config.schedule.items.map((row) =>
                        row.id === item.id ? { ...row, address: e.target.value } : row,
                      ),
                    },
                  })
                }
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          className="rounded-full border border-white/20 px-4 py-2 text-sm"
          onClick={() =>
            set({
              ...config,
              schedule: {
                items: [
                  ...config.schedule.items,
                  { id: uid(), title: '', time: '', place: '', address: '' },
                ],
              },
            })
          }
        >
          + Adicionar momento
        </button>
      </div>
    )
  }

  if (step === 'venues') {
    return (
      <div className="space-y-4">
        <Field label="Dress code">
          <TextInput
            value={config.venues.dressCode}
            onChange={(e) => set({ ...config, venues: { ...config.venues, dressCode: e.target.value } })}
          />
        </Field>
        <Field label="Estacionamento">
          <TextInput
            value={config.venues.parking}
            onChange={(e) => set({ ...config, venues: { ...config.venues, parking: e.target.value } })}
          />
        </Field>
        {config.venues.hotels.map((hotel) => (
          <div key={hotel.id} className="space-y-2 rounded-2xl border border-white/10 p-4">
            <TextInput
              placeholder="Hotel"
              value={hotel.name}
              onChange={(e) =>
                set({
                  ...config,
                  venues: {
                    ...config.venues,
                    hotels: config.venues.hotels.map((row) =>
                      row.id === hotel.id ? { ...row, name: e.target.value } : row,
                    ),
                  },
                })
              }
            />
            <TextInput
              placeholder="URL"
              value={hotel.url}
              onChange={(e) =>
                set({
                  ...config,
                  venues: {
                    ...config.venues,
                    hotels: config.venues.hotels.map((row) =>
                      row.id === hotel.id ? { ...row, url: e.target.value } : row,
                    ),
                  },
                })
              }
            />
            <TextInput
              placeholder="Notas"
              value={hotel.notes}
              onChange={(e) =>
                set({
                  ...config,
                  venues: {
                    ...config.venues,
                    hotels: config.venues.hotels.map((row) =>
                      row.id === hotel.id ? { ...row, notes: e.target.value } : row,
                    ),
                  },
                })
              }
            />
          </div>
        ))}
        <button
          type="button"
          className="rounded-full border border-white/20 px-4 py-2 text-sm"
          onClick={() =>
            set({
              ...config,
              venues: {
                ...config.venues,
                hotels: [...config.venues.hotels, { id: uid(), name: '', url: '', notes: '' }],
              },
            })
          }
        >
          + Hotel
        </button>
      </div>
    )
  }

  if (step === 'media') {
    return (
      <div className="space-y-4">
        <Field label="Foto hero (URL)">
          <TextInput
            value={config.media.heroUrl}
            onChange={(e) => set({ ...config, media: { ...config.media, heroUrl: e.target.value } })}
            placeholder="https://…"
          />
        </Field>
        <Field label="Ou envie uma foto hero">
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                const url = await readFileAsDataUrl(file)
                set({ ...config, media: { ...config.media, heroUrl: url } })
              } catch (err) {
                alert(err instanceof Error ? err.message : 'Falha no upload')
              }
            }}
          />
        </Field>
        <Field label="Galeria (uma URL por linha)">
          <TextArea
            value={config.media.gallery.join('\n')}
            onChange={(e) =>
              set({
                ...config,
                media: {
                  ...config.media,
                  gallery: e.target.value.split('\n').map((line) => line.trim()).filter(Boolean),
                },
              })
            }
          />
        </Field>
      </div>
    )
  }

  if (step === 'saveTheDate') {
    return (
      <div className="space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.saveTheDate.enabled}
            onChange={(e) =>
              set({ ...config, saveTheDate: { ...config.saveTheDate, enabled: e.target.checked } })
            }
          />
          Mostrar Save the Date
        </label>
        <Field label="Mensagem">
          <TextArea
            value={config.saveTheDate.message}
            onChange={(e) =>
              set({ ...config, saveTheDate: { ...config.saveTheDate, message: e.target.value } })
            }
          />
        </Field>
        <Field label="Rótulo do envelope">
          <TextInput
            value={config.saveTheDate.envelopeLabel}
            onChange={(e) =>
              set({
                ...config,
                saveTheDate: { ...config.saveTheDate, envelopeLabel: e.target.value },
              })
            }
          />
        </Field>
      </div>
    )
  }

  if (step === 'invitation') {
    return (
      <div className="space-y-4">
        <Field label="Saudação">
          <TextInput
            value={config.invitation.greeting}
            onChange={(e) =>
              set({ ...config, invitation: { ...config.invitation, greeting: e.target.value } })
            }
          />
        </Field>
        <Field label="Texto do convite">
          <TextArea
            value={config.invitation.body}
            onChange={(e) =>
              set({ ...config, invitation: { ...config.invitation, body: e.target.value } })
            }
          />
        </Field>
        <Field label="Linha da família">
          <TextInput
            value={config.invitation.hostLine}
            onChange={(e) =>
              set({ ...config, invitation: { ...config.invitation, hostLine: e.target.value } })
            }
          />
        </Field>
        <Field label="Selo">
          <TextInput
            value={config.invitation.sealLabel}
            onChange={(e) =>
              set({ ...config, invitation: { ...config.invitation, sealLabel: e.target.value } })
            }
          />
        </Field>
      </div>
    )
  }

  if (step === 'rsvp') {
    return (
      <div className="space-y-4">
        <Field label="Prazo">
          <TextInput
            type="date"
            value={config.rsvp.deadline}
            onChange={(e) => set({ ...config, rsvp: { ...config.rsvp, deadline: e.target.value } })}
          />
        </Field>
        <Field label="Opções de refeição (uma por linha)">
          <TextArea
            value={config.rsvp.meals.join('\n')}
            onChange={(e) =>
              set({
                ...config,
                rsvp: {
                  ...config.rsvp,
                  meals: e.target.value.split('\n').map((line) => line.trim()).filter(Boolean),
                },
              })
            }
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.rsvp.allowPlusOne}
            onChange={(e) => set({ ...config, rsvp: { ...config.rsvp, allowPlusOne: e.target.checked } })}
          />
          Permitir acompanhante / party size
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.rsvp.collectDietary}
            onChange={(e) =>
              set({ ...config, rsvp: { ...config.rsvp, collectDietary: e.target.checked } })
            }
          />
          Coletar restrições alimentares
        </label>
        <Field label="Notas do RSVP">
          <TextArea
            value={config.rsvp.notes}
            onChange={(e) => set({ ...config, rsvp: { ...config.rsvp, notes: e.target.value } })}
          />
        </Field>
      </div>
    )
  }

  if (step === 'faq') {
    return (
      <div className="space-y-4">
        {config.faq.items.map((item) => (
          <div key={item.id} className="space-y-2 rounded-2xl border border-white/10 p-4">
            <TextInput
              placeholder="Pergunta"
              value={item.question}
              onChange={(e) =>
                set({
                  ...config,
                  faq: {
                    items: config.faq.items.map((row) =>
                      row.id === item.id ? { ...row, question: e.target.value } : row,
                    ),
                  },
                })
              }
            />
            <TextArea
              placeholder="Resposta"
              value={item.answer}
              onChange={(e) =>
                set({
                  ...config,
                  faq: {
                    items: config.faq.items.map((row) =>
                      row.id === item.id ? { ...row, answer: e.target.value } : row,
                    ),
                  },
                })
              }
            />
          </div>
        ))}
        <button
          type="button"
          className="rounded-full border border-white/20 px-4 py-2 text-sm"
          onClick={() =>
            set({
              ...config,
              faq: { items: [...config.faq.items, { id: uid(), question: '', answer: '' }] },
            })
          }
        >
          + Pergunta
        </button>
      </div>
    )
  }

  if (step === 'guestsBootstrap') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-white/50">
          Adicione famílias agora ou depois no painel de convidados. RSVPs públicos entram automaticamente.
        </p>
        {guests.map((guest) => (
          <div key={guest.id} className="grid gap-2 rounded-2xl border border-white/10 p-3 sm:grid-cols-2">
            <TextInput value={guest.familyName} readOnly />
            <TextInput value={guest.email} readOnly />
          </div>
        ))}
        <form
          className="space-y-2 rounded-2xl border border-dashed border-white/20 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            const form = new FormData(e.currentTarget)
            const familyName = String(form.get('familyName') || '').trim()
            if (!familyName) return
            onGuests([
              ...guests,
              {
                id: uid(),
                familyName,
                email: String(form.get('email') || ''),
                partySize: Number(form.get('partySize') || 1),
                status: 'pending',
                meal: '',
                dietary: '',
                message: '',
                createdAt: new Date().toISOString(),
              },
            ])
            e.currentTarget.reset()
          }}
        >
          <TextInput name="familyName" placeholder="Família" required />
          <TextInput name="email" type="email" placeholder="Email" />
          <TextInput name="partySize" type="number" min={1} defaultValue={1} />
          <button type="submit" className="rounded-full bg-white/10 px-4 py-2 text-sm">
            Adicionar à lista
          </button>
        </form>
      </div>
    )
  }

  if (step === 'domain') {
    return (
      <div className="space-y-4">
        <Field label="Slug local" hint="O site fica em /e/seu-slug nesta versão local.">
          <TextInput
            value={config.domain.slug}
            onChange={(e) =>
              set({
                ...config,
                domain: { ...config.domain, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') },
              })
            }
          />
        </Field>
        <Field label="Título SEO">
          <TextInput
            value={config.domain.seoTitle}
            onChange={(e) => set({ ...config, domain: { ...config.domain, seoTitle: e.target.value } })}
          />
        </Field>
        <Field label="Descrição SEO">
          <TextArea
            value={config.domain.seoDescription}
            onChange={(e) =>
              set({ ...config, domain: { ...config.domain, seoDescription: e.target.value } })
            }
          />
        </Field>
      </div>
    )
  }

  const issues = reviewIssues(config)
  return (
    <div className="space-y-4">
      {issues.length === 0 ? (
        <p className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
          Tudo pronto para publicar. O preview à direita é o site que os convidados vão ver.
        </p>
      ) : (
        <ul className="space-y-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
          {issues.map((issue) => (
            <li key={issue.message}>Falta: {issue.message}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
