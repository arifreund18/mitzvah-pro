# Paridade Bar-Beni → Mitzvah Pro

Inventário de recursos do evento **Bar-Beni** (produção) versus o template/runtime do studio em **mitzvah-pro**.

> **Restrição absoluta:** o repo/app `bar-beni` (já no ar em `/BarBeni/*`) **não pode sofrer nenhuma alteração**. Toda a paridade é construída **só** em `mitzvah-pro`. O proxy `BAR_BENI_ORIGIN` permanece intocado.

> **Nota de origem:** o ficheiro local `docs/PARIDADE-BARBENI.md` não estava no remoto GitHub quando este inventário foi gerado. A matriz abaixo foi reconstruída a partir de:
> - site vivo `https://mitzvah.pro/BarBeni/en` (+ `/pt`, admin login, rotas/API públicas)
> - bundles JS/CSS do app Bar-Beni (somente leitura)
> - código atual do template `barbeni` em `mitzvah-pro`
>
> Se o teu relatório local tiver itens extra, funde-os neste documento antes de executar o plano.

Atualizado em: 2026-11-04

---

## 1. Fronteira dos dois sistemas

| | Bar-Beni (produção) | Mitzvah Pro (studio) |
|--|---------------------|----------------------|
| Repo | `bar-beni` (outro projeto) | este repo |
| Público | `/BarBeni/en`, `/BarBeni/pt` | `{slug}.mitzvah.pro` |
| Admin | `/BarBeni/admin/*` (magic link) | `/dashboard/*` (senha / org) |
| Runtime | hard-coded para o evento Beni | config-driven `templateId: 'barbeni'` |
| Alterações neste épico | **nenhuma** | todas |

---

## 2. O que o Bar-Beni oferece hoje (inventário)

### 2.1 Site público (one-pager)

| Secção / recurso | Detalhe observado |
|------------------|-------------------|
| Hero | Nome, data, cidade, countdown, CTAs RSVP + View Schedule |
| Som ambiente | `sound_on` / `sound_off` no hero |
| Welcome | Mensagem da família |
| About | About the Celebration + About the Honoree |
| Schedule | Programação do evento; no fluxo de convite pode filtrar por guest (“No events scheduled for your invitation”) |
| FAQ | Accordion; nav label `travel` aponta para FAQ (`#travel`) |
| Hotels | Cards com estrelas, walking minutes, website, mapa |
| Things To Do | Tabs: restaurants, shopping, museums, parks, family, tips; itens com `photo_url` + `maps_url` |
| Gallery | Grid + **GalleryLightbox** |
| Contact | Vários telefones, vários emails, vários WhatsApps; formulário de mensagem (`/api/contact`) |
| Travel info (i18n) | Namespaces: airports, currency, transport, emergency |
| Legal | `/privacy`, `/terms` |
| i18n | `en` / `pt` (conteúdo traduzido no próprio app) |
| Motion | Framer Motion (`staggerChildren`, etc.) |
| Tipografia | Inter + Playfair Display |

### 2.2 Convite personalizado (token)

| Recurso | Detalhe |
|---------|---------|
| Rotas | `/{locale}/invite/{token}` → card; `/{locale}/rsvp/{token}`; `/{locale}/card/{token}` |
| Saudação | “Dear {name}”, party list (“Your guests”) |
| RSVP por pessoa | adult/child, add/remove person, kid name, meal, dietary, message |
| Update RSVP | Fluxo de alteração + estados attending/declined/pending |
| Erros | token inválido, already submitted, rate limit, cross-family |
| Calendar | Google, Apple, Outlook, download ICS (`/api/calendar/{id}`) |

### 2.3 Admin Bar-Beni

| Recurso | Detalhe |
|---------|---------|
| Auth | Magic link via Resend (“Use the authorized admin email”) |
| Áreas (i18n) | dashboard, guests, rsvps, content, gallery |
| Stats | total / attending / pending / declined |
| Check-in | Referência a Checkin no bundle |
| Envio | STD / invite ligados a tokens de guest |

---

## 3. O que o Mitzvah Pro já cobre

Já entregue no studio (ver também `docs/MELHORIAS.md`):

- Wizard config-driven com steps: basics, branding, story, schedule, venues, media, faq, rsvp, saveTheDate, invitation, guestsBootstrap, domain, review
- Site publicado: hero, countdown, welcome, about, schedule, dress/parking, FAQ, hotels, things to do (filtro por categoria), gallery (sem lightbox), RSVP público, contact estático
- Emails STD + convite (Resend + domínio `mail.{slug}.mitzvah.pro`)
- Dashboard do evento: lista de convidados, envio em massa, CSV import/export, stats básicas
- Preview público `/p/{token}`, aprovação boutique `/approve/{token}`
- Domínio custom Signature, multi-tenant orgs, locales chrome `en/pt/es/he`
- Proxy `/BarBeni/*` **somente leitura / rewrite** — não editar o app Beni

---

## 4. Matriz de gaps (Bar-Beni → Mitzvah Pro)

Legenda: ✅ paridade útil · 🟡 parcial · ❌ em falta

| Capacidade | Bar-Beni | Mitzvah Pro | Gap |
|------------|----------|-------------|-----|
| Site one-pager (secções core) | ✅ | ✅ | 🟡 UX/visual ainda não 1:1 |
| Countdown | ✅ | ✅ | ✅ |
| Welcome / About / Honoree | ✅ | ✅ | ✅ |
| FAQ accordion | ✅ | ✅ | ✅ |
| Hotels + walking + links | ✅ | ✅ | 🟡 faltam estrelas / “Book Now” |
| Things to do + tabs | ✅ | 🟡 filtro simples | 🟡 categorias family/tips; fotos |
| Gallery lightbox | ✅ | ❌ grid só | ❌ |
| Contact multi-pessoas | ✅ vários | 🟡 1 phone/email/wa | ❌ |
| Formulário de contacto no site | ✅ | ❌ (só landing) | ❌ |
| Travel (airports/currency/…) | ✅ i18n | ❌ | ❌ |
| Privacy / Terms do evento | ✅ | ❌ | ❌ |
| Som ambiente no hero | ✅ | ❌ | ❌ |
| Calendar Google/Apple/Outlook/ICS | ✅ | 🟡 só Google | ❌ |
| Convite por token de guest | ✅ | 🟡 `/invite` genérico | ❌ |
| RSVP por pessoa (adult/child) | ✅ | 🟡 família + partySize | ❌ |
| Update RSVP / guest status | ✅ | ❌ | ❌ |
| Schedule filtrado por convite | ✅ | ❌ schedule global | ❌ |
| Admin magic link | ✅ | 🟡 senha/org | fora de escopo imediato* |
| Admin content/gallery CMS | ✅ | 🟡 via wizard | 🟡 |
| Check-in | ✅ | ❌ | P2 |
| Motion / tipografia / layout | ✅ | 🟡 | 🟡 polish |
| Conteúdo i18n por locale | ✅ en/pt | 🟡 chrome 4 idiomas; texto único | P2 |
| Analytics RSVP no dashboard | — | 🟡 contagens | P2 |

\* Auth do studio Mitzvah permanece a fonte de verdade da plataforma; não copiar magic-link do Beni para não misturar os dois admins.

---

## 5. Princípios para fechar a paridade

1. **Só `mitzvah-pro` muda.** Zero commits, PRs ou deploys no `bar-beni`.
2. **Config over code** — novos campos entram em `EventConfig` + wizard + renderers.
3. **Bar-Beni continua a servir o evento Beni** via proxy; eventos novos usam `{slug}.mitzvah.pro`.
4. **Não migrar o Beni legado** neste épico (isso seria Fase 5 histórica em `MELHORIAS.md` e exige decisão explícita).
5. **Paridade funcional primeiro**, polish visual depois — o cliente deve conseguir o mesmo fluxo (STD → convite tokenizado → RSVP por pessoa → site → admin).
6. **Sem regressão** no rewrite `/BarBeni/*` nem nas rotas da landing.

---

## 6. Referências rápidas no código (mitzvah-pro)

| Área | Onde |
|------|------|
| Schema do template | `lib/platform/types.ts` (`EventConfig`, `Guest`) |
| Defaults | `lib/platform/defaults.ts` |
| Wizard steps | `lib/platform/wizard.ts`, `components/wizard/*` |
| Site | `components/template/EventSite.tsx` |
| RSVP público | `components/template/EventRsvpForm.tsx` |
| Calendar | `lib/platform/calendar.ts` (só Google hoje) |
| Emails STD/invite | `components/template/EventEmails.tsx`, `app/api/platform/events/[id]/send` |
| Proxy Bar-Beni | `middleware.ts` (`BAR_BENI_ORIGIN`) |

Plano de execução: [`PLANO-IMPLEMENTACAO-PARIDADE.md`](./PLANO-IMPLEMENTACAO-PARIDADE.md).
