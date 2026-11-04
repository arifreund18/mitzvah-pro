# Plano de implementação — Paridade Bar-Beni no Mitzvah Pro

Objetivo: o studio **mitzvah-pro** oferecer os **mesmos recursos e funcionalidades** que o evento Bar-Beni em produção, para qualquer evento novo criado no dashboard.

**Não-negociável:** nenhuma alteração no app/repo `bar-beni` (já no ar). O proxy `/BarBeni/*` fica como está.

Inventário de gaps: [`PARIDADE-BARBENI.md`](./PARIDADE-BARBENI.md).

---

## Visão da entrega

```
mitzvah-pro (único sítio de mudança)
├── EventConfig + Guest model  →  campos que o Beni já tem
├── Wizard                     →  captura esses campos
├── Runtime {slug}.mitzvah.pro →  renderiza como o Beni
├── Convite tokenizado         →  /invite|card|rsvp/{token}
└── Dashboard do evento        →  guests, envio, stats

bar-beni (intocado)
└── continua em /BarBeni/* via BAR_BENI_ORIGIN
```

Critério de sucesso: um operador cria um evento no `/dashboard`, completa o wizard, publica, envia STD/convites, e o convidado vive o mesmo fluxo funcional do Beni (card → RSVP por pessoa → update → calendar multi-provider → site completo), **sem tocar no código do Beni**.

---

## Fases

### Fase A — Contrato de dados (fundação)

**Porquê primeiro:** o wizard e o runtime só conseguem paridade se o schema cobrir os campos reais do Beni.

| # | Trabalho | Ficheiros-alvo | Aceite |
|---|----------|----------------|--------|
| A1 | Estender `EventConfig` | `lib/platform/types.ts`, `defaults.ts`, `normalize.ts` | Schema tipado com defaults seguros |
| A2 | Estender modelo `Guest` / party | `types.ts`, APIs de guests | Party com pessoas (adult/child), meal/dietary por pessoa, token opaco |
| A3 | Schedule linkável a guests | `ScheduleItem` + opcional `guestIds[]` / `visibility: public\|invite` | Item pode ser “só no convite” |
| A4 | Persistência | `persistence.ts` / JSON store | Eventos antigos migrados com defaults (sem quebrar publish) |

**Campos novos mínimos (A1):**

```ts
// contact: lista em vez de escalares
contact: {
  people: { id; name?; phone?; email?; whatsapp? }[]
  formEnabled: boolean
}

// hotels
Hotel: { …existing; stars?: number; bookUrl?: string; photoUrl?: string }

// places
LocalPlace: { …existing; photoUrl?: string }
// PLACE_CATEGORIES += 'family' | 'tips'

// travel (opcional por evento)
travel: {
  enabled: boolean
  airports: string
  currency: string
  transport: string
  emergency: string
}

// legal
legal: { privacyHtml: string; termsHtml: string }

// media / hero
media: { …existing; ambientAudioUrl?: string }

// schedule
ScheduleItem: { …existing; visibility: 'public' | 'invite'; guestIds?: string[] }
```

**Guest (A2):**

```ts
GuestPerson = { id; name; type: 'adult' | 'child'; status; meal; dietary }
Guest = {
  …existing // familyName, email, token, stdSentAt, inviteSentAt
  people: GuestPerson[]
  // partySize derivado de people.length (compat)
}
```

**Risco:** eventos já publicados com contact escalar — migrar em `normalize.ts` (`phone/email/whatsapp` → `people[0]`).

**Fora desta fase:** UI do wizard (só tipos + normalização + testes de migrate).

---

### Fase B — Convite e RSVP tokenizados (paridade crítica)

O maior gap funcional. No Beni o convidado não preenche um form aberto: abre um **link com token**.

| # | Trabalho | Rotas / APIs | Aceite |
|---|----------|--------------|--------|
| B1 | Página card/convite por token | `/e/[slug]/invite/[token]`, `/card/[token]` (rewrite no host do evento) | Saudação personalizada + lista da party |
| B2 | RSVP por token | `/e/[slug]/rsvp/[token]` + `POST` guests API | Add/remove person, adult/child, meal, dietary, message |
| B3 | Update RSVP | Mesmo endpoint com regra de update | Convidado altera após submit; erros: invalid / rate-limit / cross-family |
| B4 | Guest status | Bloco “Your RSVP” no card | attending / declined / pending + Change RSVP |
| B5 | Envio de email com token | `send` route | Link `https://{slug}.mitzvah.pro/rsvp/{token}` (e invite/card) |
| B6 | Manter RSVP público opcional | flag `rsvp.publicFormEnabled` | Form aberto atual continua disponível se ligado |

**Compat:** guests antigos sem `people[]` → uma pessoa adult com `familyName`.

**Não fazer:** alterar templates/emails do app Bar-Beni.

---

### Fase C — Site runtime (paridade de secções)

| # | Trabalho | Notas | Aceite |
|---|----------|-------|--------|
| C1 | Gallery lightbox | Componente client; teclado Esc; swipe opcional | Paridade com GalleryLightbox |
| C2 | Calendar multi-provider | `lib/platform/calendar.ts` + UI menu | Google, Apple (data URL/ICS), Outlook, download `.ics` |
| C3 | API ICS | `app/api/platform/events/[id]/calendar/[itemId]` ou por slug público | `text/calendar` |
| C4 | Hotels: stars + bookUrl + foto | Wizard + EventSite | Cards alinhados ao Beni |
| C5 | Places: photoUrl + categorias family/tips | Tabs como ThingsToDoTabs | Fotos nos cards |
| C6 | Contact multi + form | Lista de pessoas; form POST `/api/platform/events/[id]/contact` → Resend para `contact.people` emails | |
| C7 | Travel section | Render se `travel.enabled` | airports / currency / transport / emergency |
| C8 | Privacy & Terms | `/e/[slug]/privacy`, `/terms` (+ rewrite no subdomain) | Footer links |
| C9 | Ambient audio (opcional) | Toggle no hero se URL configurada | Mute/unmute |
| C10 | Schedule visibility | Público só `visibility=public`; invite vê também os do guest | |

Ordem sugerida dentro de C: **C2 → C1 → C4/C5 → C6 → C7 → C8 → C9 → C10**.

---

### Fase D — Wizard (captura self-serve)

Cada campo novo da Fase A precisa de UI no wizard e preview.

| Step | Extensões |
|------|-----------|
| `venues` | stars, bookUrl, photoUrl nos hotels; travel block |
| `media` | ambientAudioUrl; (lightbox é só runtime) |
| `story` / novo `contact` | pessoas de contacto (N); toggle form |
| `schedule` | visibility + guests opcionais |
| `rsvp` | publicFormEnabled; copy de meal labels |
| `faq` | (já ok) |
| `domain` / `review` | links privacy/terms se preenchidos |
| novo step opcional `legal` | privacy + terms (markdown/HTML sanitizado) |
| `guestsBootstrap` | editar people[] na importação CSV (colunas adult/child) |

**Preview:** `LivePreview` deve refletir lightbox/calendar/contact multi sem publish.

**Validação publish:** reviewIssues atualizados (ex.: se formEnabled, pelo menos 1 email de destino).

---

### Fase E — Dashboard do evento

| # | Trabalho | Aceite |
|---|----------|--------|
| E1 | Stats por pessoa (não só por família) | total people attending/pending/declined |
| E2 | UI guests com party expandível | ver/editar people |
| E3 | Links por guest (copiar invite/rsvp URL) | operador testa sem email |
| E4 | CSV: colunas people / type / meal | import/export round-trip |
| E5 | (P2) Check-in simples | flag `checkedInAt` por pessoa |

Auth magic-link do Beni **não** é portada; o studio mantém `/dashboard/login`.

---

### Fase F — Polish visual e motion (paridade de sensação)

Só depois das fases B–E estáveis.

| # | Trabalho |
|---|----------|
| F1 | Tipografia do template alinhada (display serif + sans) sem partir a landing |
| F2 | 2–3 motions: hero entrance, FAQ accordion, gallery open |
| F3 | Nav sticky / âncoras iguais ao Beni (`#welcome` … `#contact`) |
| F4 | Comparar lado a lado: Beni produção (read-only) vs evento demo do studio |

**Não** copiar assets privados do Beni (fotos da família) para o seed — só estrutura/UI.

---

### Fase G — i18n de conteúdo (P2, já em MELHORIAS)

Hoje o chrome do site tem 4 idiomas; o conteúdo do evento é um único texto.

| # | Trabalho |
|---|----------|
| G1 | `EventConfig` com overrides por locale (`i18n.pt.story.headline`, …) ou mapas por campo |
| G2 | Wizard: editar locale ativo |
| G3 | Runtime escolhe copy pelo `?lang=` / path |

Pode correr em paralelo tardio; **não bloqueia** paridade funcional en/pt se o operador preencher no idioma do evento.

---

## Ordem de execução recomendada

```
A (schema) ──► B (invite/RSVP token) ──► C (site) ──► D (wizard) ──► E (dashboard)
                      │
                      └──► F (polish) quando B+C ok
G (i18n conteúdo) em paralelo após A, prioridade P2
```

Justificativa: sem schema (A) e token RSVP (B), o resto é cosmética. O Beni “sente-se completo” sobretudo no fluxo convite→RSVP.

---

## Fatias de PR (mitzvah-pro only)

Cada PR pequeno, testável, **sem** mudanças em `BAR_BENI_ORIGIN` / rewrite além do necessário para novas rotas do studio.

| PR | Conteúdo | Dependência |
|----|----------|-------------|
| PR1 | Fase A: types + normalize + migrate | — |
| PR2 | Fase B1–B4: páginas token + API RSVP | PR1 |
| PR3 | Fase B5–B6: emails com links token + flag form público | PR2 |
| PR4 | Fase C2–C3: calendar multi + ICS | PR1 |
| PR5 | Fase C1, C4, C5: lightbox, hotels, places | PR1 |
| PR6 | Fase C6–C8: contact multi/form, travel, legal | PR1 |
| PR7 | Fase D: wizard fields | PR1 + preferir após C |
| PR8 | Fase E: dashboard guests/stats/CSV | PR2 |
| PR9 | Fase F: polish visual | PR5–PR6 |
| PR10 | Fase G: i18n conteúdo (opcional) | PR1 |

Proxy `/BarBeni/*` e docs que digam “não alterar bar-beni” devem permanecer verdadeiros em todos os PRs.

---

## Testes e aceite (checklist)

### Funcional (evento demo no studio)

1. Criar evento → wizard preenche hotels com stars, places com foto, travel, contact N pessoas, legal.
2. Importar CSV de guests com 2 adults + 1 child.
3. Publish → `{slug}.mitzvah.pro` mostra todas as secções.
4. Enviar STD e Invite → email contém link com token.
5. Abrir card → ver party → RSVP por pessoa → success → Change RSVP.
6. Add to calendar: Google / Apple / Outlook / ICS.
7. Gallery abre lightbox; Esc fecha.
8. Form de contacto do evento envia email.
9. `/privacy` e `/terms` respondem 200.
10. Org B não vê guests da org A.

### Regressão (Bar-Beni intocado)

1. `https://mitzvah.pro/BarBeni/en` continua 200.
2. `https://mitzvah.pro/BarBeni/admin/login` continua magic-link.
3. Atalhos `/en/invite` → redirect para `/BarBeni/...` inalterados.
4. Nenhuma mudança de env no deploy do projeto `bar-beni`.
5. Diff do PR **não** inclui ficheiros fora de `mitzvah-pro`.

### Manual visual

- Abrir Beni (produção) e um evento seed do studio lado a lado (desktop + mobile).
- Anotar só gaps de layout remanescentes para Fase F (não bloquear merge de B/C).

---

## Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Tentar “aproveitar” código no repo bar-beni | Proibido; reimplementar no template do studio |
| Quebrar eventos já publicados ao mudar schema | `normalizeEventConfig()` com defaults; testes de migrate |
| Confundir admin Beni com dashboard Mitzvah | Docs + UI copy claros; não criar `/admin` no apex |
| Escopo virar page-builder | Manter wizard form-based |
| ICS/calendar errado em timezones | Usar data local do evento + testes com `basics.date` |
| XSS em privacy/terms HTML | Sanitizar (allowlist tags) ou markdown-only |
| RSVP aberto + token misturados | Flag explícita; token sempre ganha no link |

---

## Explicitamente fora de escopo

- Qualquer commit/deploy no `bar-beni`
- Migrar o evento Beni legado para o studio (decisão futura)
- Editor drag-and-drop
- App mobile nativo
- Portar auth magic-link do Beni para o studio (studio já tem orgs)

---

## Definição de “paridade alcançada”

O épico fecha quando:

1. A matriz da §4 em `PARIDADE-BARBENI.md` não tem mais ❌ nas linhas P0/P1 (token RSVP, calendar multi, lightbox, contact multi, travel, legal, hotels/places ricos).
2. Checklist da secção de testes acima passa num evento novo.
3. Bar-Beni em produção continua idêntico (smoke `/BarBeni/en` + admin login).

Itens P2 (i18n conteúdo, check-in, analytics avançado) podem ficar abertos em `MELHORIAS.md` sem bloquear o fecho da paridade funcional.
