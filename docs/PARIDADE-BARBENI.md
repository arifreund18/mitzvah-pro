# Relatório de paridade: BarBeni → Mitzvah-pro (template + wizard)

**Data:** 2026-11-04 · **Modo:** somente leitura (nenhum arquivo dos repositórios foi alterado na análise original)  
**Base analisada:** BarBeni@`2e754ab` e mitzvah-pro@`fa53897` (branch padrão, clone raso)  
**Método:** leitura do código-fonte (rotas, componentes, libs, 18 migrations SQL, middleware, templates de e-mail, `public/envelope`). A análise original **não** rodou os apps nem abriu o site em produção; tudo abaixo vem de análise estática. Onde algo é inferência, está marcado.

> **Decisões de produto (2026-11-04):** o BarBeni **NÃO** será migrado nem alterado (já no ar, convites enviados). Continua como app separado via proxy `/BarBeni` + `BAR_BENI_ORIGIN` e serve **só** como referência de funcionalidades. Eventos do Mitzvah-pro oferecem os 4 idiomas (`en`/`pt`/`es`/`he`) como opção por evento.

Plano de implementação derivado deste inventário: [`PLANO-IMPLEMENTACAO-PARIDADE.md`](./PLANO-IMPLEMENTACAO-PARIDADE.md).

---

## 1. Resumo executivo

O mitzvah-pro hoje é uma "versão simplificada inspirada no BarBeni", não uma réplica. Cobre a vitrine (hero, countdown, sobre, programação, FAQ, hotéis, lugares, galeria, contato) e um fluxo mínimo de STD/convite/RSVP. Falta quase toda a operação de convidados que torna o BarBeni um produto: links pessoais por família, convite em envelope animado, RSVP por pessoa, lembretes automáticos, confirmações, notificações ao anfitrião, rastreio de abertura, log de e-mails, importação Excel com preview, exportações, galeria com vídeo/importação, áudio ambiente etc.

A diferença estrutural mais importante é o **modelo de convidado**. BarBeni: família (token, vários e-mails, idioma, subconjunto de eventos, open-RSVP) → pessoas (adulto/criança, RSVP individual, refeição, restrição). Mitzvah-pro: um `Guest` plano com `partySize` e um status único. Quase todas as lacunas (links pessoais, lembretes, cronograma por convidado, RSVP editável) dependem de corrigir isso primeiro.

A segunda diferença estrutural é o **armazenamento**. Mitzvah-pro guarda toda a plataforma (orgs, usuários, eventos, convidados) em uma única linha JSONB (`platform_store`) e imagens como data-URL dentro desse JSON (limite 1,5 MB por arquivo). Isso não sustenta RSVP concorrente, listas grandes, logs, cron nem galerias reais. É pré-requisito técnico da paridade.

A documentação engana nos dois lados. O README do BarBeni descreve só o MVP (não menciona STD, envelope, open-RSVP, notificações, galeria, 18 migrations). O `MELHORIAS.md` do mitzvah-pro marca STD/convite/RSVP como "entregues", mas o critério de aceite "wizard cobre todas as customizações do BarBeni" está explicitamente aberto e o P1 (inventário 1:1) nunca foi feito. **Este relatório é esse inventário** (seções 3 e 4).

**Recomendação:** portar o runtime do BarBeni para dentro do mitzvah-pro de forma multi-tenant (`event_id` em tabelas relacionais), em vez de continuar ampliando o `EventConfig` JSON. Plano em fases na seção 6 / documento de plano.

---

## 2. Discrepâncias de documentação (o que o código diz vs. o que a doc diz)

| Documento | Afirma | Realidade no código |
|-----------|--------|---------------------|
| BarBeni/README.md | Admin cria guests, RSVPs, CMS, gallery, email log; cron em 30d/7d/2d | Faltam na doc: save-the-date, página de envelope `/card`, open-RSVP, notificação de RSVP (instant/digest), import Google Photos, cronograma por família, idioma por família, QR, áudio ambiente, tracking pixel. Migrations 002–018 não citadas. Base path `/BarBeni` não explicado. |
| BarBeni/docs/FASE2-PROXIMOS-PASSOS.md | Auth "hoje: login único via env (`ADMIN_PASSWORD`)" | O admin real usa magic link por e-mail (Resend) com allowlist `ADMIN_EMAIL` e cookie HMAC de 7 dias (`lib/admin-auth.ts`). |
| BarBeni/instrucoes/BarMitzvah-TechSpec.md | Música removida do escopo; upload de fotos por convidado só na Fase 3; Prisma removido; Supabase | O Hero tem áudio ambiente (`public/audio/ambient.mp3`, botão de som). BD é Neon via `@neondatabase/serverless`; a pasta continua chamada `supabase/`. Spec é histórico, não fonte de verdade. |
| mitzvah-pro/docs/MELHORIAS.md §0 | "Template BarBeni config-driven… RSVP público + lista de convidados; emails STD/convite" entregues | Entregue em versão reduzida (ver seção 3/4). Critério de aceite #2 (paridade) está `[ ]`. |
| mitzvah-pro/docs/github-issue-dashboard-wizard.md | "Organizações e papéis" e "Import CSV / preview público / fluxo boutique" como `[ ]` | Todos já existem no código (orgs, `/api/platform/users`, guests/import, `/p/[token]`, `/approve/[token]`). Doc defasada. |
| mitzvah-pro/README.md | Rotas e envs | Coerente com o código; não lista que o RSVP público é anônimo e sem proteção, nem as limitações de storage JSON. |

**Ação sugerida de documentação:** (a) reescrever o README do BarBeni a partir da seção 3 — **bloqueado** enquanto o BarBeni permanecer intocado (decisão 2026-11-04); (b) este inventário em `docs/PARIDADE-BARBENI.md` no mitzvah-pro como checklist; (c) arquivar o TechSpec do BarBeni com aviso "histórico" — só quando/se houver manutenção de docs no outro repo.

---

## 3. Inventário completo do BarBeni (a "fonte da verdade")

### 3.1 Site público (`app/[locale]/page.tsx`, EN/PT)

- **Hero:** imagem de fundo (CMS `hero_image`), subtítulo acima do título, nome/data/cidade (Settings), countdown, CTA de RSVP (usa o token do visitante), CTA para programação (só se houver token), áudio ambiente com toggle.
- **Welcome** (mensagem + nome da família do visitante ou `family_names` padrão), **About** (sobre o evento + sobre o homenageado).
- **Programação personalizada:** a seção só aparece para quem tem token válido, e mostra apenas os eventos a que aquela família foi convidada (`schedule_invite_mode`: `all` / `subset` / `none` via `family_events`).
- **Travel / FAQ** (acordeão; itens publicados/ocultos, bilíngues), **Hotéis** (foto, estrelas, destaque, descrição, distância, site, link de reserva, mapa), **Things to do** (6 categorias: restaurantes, compras, museus, parques, família, dicas; cada item com foto, link e mapa; abas), **Galeria** (foto e vídeo, lightbox, legenda bilíngue, aprovada/mostrar-no-site, ordenação), **Contato** (telefone, e-mail, lista de WhatsApp `Nome|link`, formulário que envia e-mail).
- **Status do RSVP** do convidado na home (confirmados/recusados/pendentes, editar RSVP, adicionar ao Google/Outlook, rever convite).
- Navbar, seletor de idioma, rodapé com Privacy/Terms, páginas `privacy`, `terms`, `coming-soon`.
- Cookie de convidado (middleware grava token vindo de `?token=` ou do path e o reutiliza).

### 3.2 Páginas por token

| Rota | Função |
|------|--------|
| `/[locale]/card/[token]` | Convite em envelope animado (`public/envelope`). Tema por variáveis CSS: cor de página, textura, forro, envelope, selo (imagem recortada), foto circular/retangular no painel, cores de saudação/nome/intro/corpo, tamanho e negrito da mensagem, fonte, saudação com `{name}`, rótulos PT/EN. Marca `invitation_opened_at`. |
| `/[locale]/std/[token]` | Save the Date em envelope com ~40 campos configuráveis (ver 3.4). Marca `std_opened_at`. |
| `/[locale]/rsvp/[token]` | Formulário por pessoa; refeição/restrição opcionais (flag global); recado; atualização de RSVP já enviado; modo open-RSVP (link compartilhado, o convidado digita nome(s) + e-mail). |
| `/[locale]/invite/[token]` | Redireciona para `/card/` (compatibilidade com e-mails antigos). |
| `/api/calendar/[token]` | Google/Outlook/.ics com data, hora, local. |
| `/api/qr/[token]` | QR PNG do link do convidado. |
| `/api/invite/open/[token]`, `/api/std/open/[token]` | Pixel de rastreio (abertura de e-mail). |
| `/api/invite/seal` | Selo do convite processado (sharp). |

### 3.3 RSVP (`/api/rsvp`)

Validação Zod; rate limit por token persistido (5/h fechado, 60/h open); checagem cross-family; refeição só se attending e flag ligada; e-mail de confirmação para todos os e-mails da família (ou para o contato no open-RSVP); notificação ao admin (instant, daily, weekly, monthly, off) com digest por cron e fingerprint para não reenviar sem mudanças; registro em `email_logs`.

### 3.4 Configuração de design de STD e Convite (tudo editável no admin, bilíngue)

- **STD** (`lib/std-config.ts`, migrations 008/009/012): assunto, "ver cartão", "adicionar ao calendário", "para:", cor/textura do envelope, cor do nome no envelope, selo (url + cor de fundo), título, nome do evento, data, hora, local, cidade, heading, anfitriões, mensagem, dica, cor/textura da página, cor/imagem/cor de texto do cartão, forro/exterior do envelope, fonte.
- **Convite** (`lib/invite-email-config.ts`, migrations 004–007): cor/texto do cartão, fonte, selo, título, data, hora, local, endereço 1/2, URL do mapa, assunto, rótulos (ver cartão, calendário, mapa), tema da página do cartão, saudação/intro/mensagem/cores/tamanho/negrito, rótulo e dica do RSVP, foto do painel (círculo/retângulo), paleta de cores sugerida, pré-visualização ao vivo e envio de teste (`/api/admin/invite-email/test`, `/api/admin/std/test`).

Total: em torno de **100 chaves** de content só para esses dois artefatos.

### 3.5 E-mails e automação

- Templates HTML robustos (`invitation-template.ts`, `std-template.ts`): fonte por `fontKey`, selo com dimensionamento (`seal-image.ts`, `stamp-frame.ts` via sharp), botões de calendário/mapa, pixel de rastreio, idioma por família (`invite_locale`).
- Envio individual e em massa com progresso, filtros, "somente não enviados", `skipIfSent`.
- Lembretes 30d / 7d / 2d (cron Vercel; os de 7d/2d só para quem confirmou), digest diário para o admin.
- Log de e-mails (`email_logs`: tipo, família, status, id Resend).
- Login do admin por magic link.

### 3.6 Admin (`/admin/*`)

Dashboard com métricas (total, confirmados, pendentes, recusados, adultos, crianças) · Convidados (busca; filtros por RSVP, STD enviado, convite enviado, confirmado; ordenar por nome/RSVP/abertura; editar família/e-mails/pessoas; trocar idioma; ligar open-RSVP; selecionar quais eventos cada família vê; envio individual/em massa; import Excel com preview, colunas `family_name`, `email`, `guest_name`, `type`, `notes`, `language`; export XLSX) · RSVPs (tabela filtrável + export) · Programação (CRUD, ordem, data explícita, início/fim, mapa, dress code e notas bilíngues, ordenação cronológica) · Hotéis · FAQ · Things to do · Galeria (upload com compressão client-side + sharp, vídeo, importação de álbum do Google Fotos, aprovação, `show_on_site`, reordenação, seletor de selo) · Conteúdo (CMS por seção na ordem do site) · Settings (nome/título/descrição SEO PT/EN, data, cidade, subtítulo, flag de refeição/restrição, modo de notificação de RSVP) · Save the Date · Invite card · Invite email · E-mails (log). `AdminFormProvider` avisa sobre alterações não salvas.

### 3.7 Qualidade e operação

19 arquivos de teste (`node:test`: calendário, tokens, import Excel, templates de e-mail, ordenação, reorder, things-to-do, validações…), scripts de manutenção (`scripts/*.mjs`), cron em `vercel.json`, Blob privado com proxy (`/api/gallery/media`), `basePath` configurável.

---

## 4. Estado atual do mitzvah-pro

**O que existe** (verificado no código): landing 4 idiomas (RTL no hebraico); studio com login (admin da plataforma por senha + usuários por org com scrypt), orgs/papéis, CRUD de eventos, duplicar/arquivar, fluxo de aprovação boutique, preview público `/p/{token}`; wizard de 13 passos com preview ao vivo e autosave; publicação em `{slug}.mitzvah.pro` (+ provisão de DNS), domínio de e-mail isolado por evento (Resend + DNS Vercel), domínio custom (CNAME); site do evento com 4 temas; RSVP público; import/export CSV; envio de STD/convite.

**Limitações encontradas** (todas confirmadas por leitura de código):

| # | Limitação | Evidência |
|---|-----------|-----------|
| L1 | Sem links pessoais: não há `/rsvp/[token]`, `/card/[token]`, `/std/[token]`; os e-mails apontam para páginas genéricas `/std` e `/invite` iguais para todos. O campo `Guest.token` existe no tipo mas não tem rota pública. | lista de rotas; `lib/platform/mail.ts` |
| L2 | RSVP público é anônimo, sem rate limit/captcha/deduplicação; qualquer um pode inserir convidados em evento publicado. | `api/platform/events/[id]/guests` (`POST fromPublic`) |
| L3 | Guest plano (`partySize`, um status). Sem pessoas individuais, adulto/criança, múltiplos e-mails, idioma por convidado, subconjunto de programação. | `types.ts` |
| L4 | Envio de e-mail sequencial dentro de uma requisição (`maxDuration = 30`): listas grandes estouram; sem fila, retry, log ou tracking. Apenas grava `stdSentAt`/`inviteSentAt`. | `send/route.ts` |
| L5 | Um único template de e-mail simples, textos em inglês fixos ("Open save the date"), sem idioma por convidado, sem selo/fonte/calendário/mapa. | `lib/platform/mail.ts` |
| L6 | Sem confirmação ao convidado, sem notificação ao anfitrião, sem lembretes, sem cron (`vercel.json` não tem crons). | `vercel.json` |
| L7 | STD e convite são cartões estáticos (`EventEmails.tsx`) — sem envelope animado, selo configurável limitado a imagem, só 4 temas fixos + cor de destaque. | `components/template/EventEmails.tsx` |
| L8 | `EventRsvpForm` tem strings em português hardcoded (não usa os 4 locales). | `EventRsvpForm.tsx` |
| L9 | Conteúdo do evento é monolíngue (um texto por campo) enquanto o BarBeni é bilíngue por campo. A própria doc admite. | `EventConfig`, `MELHORIAS.md` |
| L10 | Programação sem data por item, fim, mapa, dress code/notas por item, ordenação cronológica, nem visibilidade por convidado. | `ScheduleItem` |
| L11 | Hotéis sem foto/estrelas/destaque/reserva; lugares com 5 categorias (sem "família"/"dicas") e sem foto; FAQ sem publicado/oculto. | `Hotel`, `LocalPlace`, `FaqItem` |
| L12 | Galeria = lista de URLs/data-URLs; sem vídeo, legenda, lightbox, aprovação, ordenação, importação, compressão, storage real. | `media.gallery: string[]` |
| L13 | Sem formulário de contato no site do evento (só exibe dados), sem áudio, sem Privacy/Terms, sem coming-soon, sem seção "meu RSVP". | `EventSite.tsx` |
| L14 | Storage monolítico: todo o store em 1 linha JSONB, travamento só em memória (`withLock` por processo) → risco de lost update com várias lambdas; imagens inline em JSON. | `persistence.ts`, `store.ts`, `WizardStepForm.tsx` |
| L15 | Zero testes, sem rate limit em login, senha padrão documentada `mitzvah` / `owner@mitzvah.pro` (confirmar que prod sobrescreve via env). | `package.json`, `README.md` |
| L16 | Sem métricas de RSVP além de contagem; sem export XLSX; sem log de e-mails; sem QR. | — |
| L17 | Cálculo de calendário só Google, dia inteiro (`dates=D/D`), sem hora, sem .ics/Outlook. | `lib/platform/calendar.ts` |
| L18 | O RSVP tem `deadline`, `allowPlusOne`, `meals`, `collectDietary` no wizard — recursos que o BarBeni **não** tem (BarBeni não impõe prazo nem +1). Vale manter no mitzvah-pro. | `types.ts` |

---

## 5. Matriz de paridade (BarBeni × Mitzvah-pro)

Legenda: ✅ equivalente · 🟡 parcial · ❌ ausente · ➕ só no mitzvah-pro

| Área | Funcionalidade | Status | Nota |
|------|----------------|--------|------|
| Site | Hero + countdown | ✅ | |
| | Áudio ambiente | ❌ | |
| | Welcome / About | ✅ | |
| | Programação personalizada por família | ❌ | depende do token |
| | FAQ / Hotéis | 🟡 | faltam campos (L11) |
| | Things to do | 🟡 | 5 categorias, sem foto |
| | Galeria (vídeo, lightbox, legenda, import) | ❌ / 🟡 | só grade de imagens |
| | Contato com formulário + WhatsApp múltiplo | 🟡 | só exibição, 1 WhatsApp |
| | Status do RSVP / editar | ❌ | |
| | Privacy / Terms / coming-soon | ❌ | |
| | Idiomas (conteúdo por idioma) | 🟡 | chrome em 4 idiomas; conteúdo único |
| | Temas | ➕ | 4 temas + cor de destaque |
| Convidados | Token por família + cookie | ❌ | |
| | Família → pessoas (adulto/criança) | ❌ | |
| | Vários e-mails por família | ❌ | |
| | Idioma por família | ❌ | |
| | Cronograma por família (`all`/`subset`/`none`) | ❌ | |
| | Open RSVP (link compartilhado) | 🟡 | RSVP público anônimo existe, sem controle |
| | Import | 🟡 | CSV simples; sem preview/dedupe/idioma/tipo |
| | Export | 🟡 | CSV; sem XLSX/RSVP |
| | Filtros/busca/ordenar | ❌ | |
| | QR code | ❌ | |
| RSVP | Formulário por pessoa, edição | ❌ | |
| | Rate limit / anti-abuso | ❌ | |
| | Confirmação por e-mail | ❌ | |
| | Notificação ao admin (instant/digest) | ❌ | |
| | Prazo, +1 | ➕ | |
| Cartões | STD em envelope animado | ❌ | cartão estático |
| | Convite em envelope animado | ❌ | cartão estático |
| | ~100 parâmetros de design | ❌ | ~6 campos |
| | Selo (imagem processada) | 🟡 | url simples |
| E-mail | Template rico, selo, fonte, calendário, mapa | ❌ | |
| | Rastreio de abertura | ❌ | |
| | Envio individual / em massa com progresso | 🟡 | em massa síncrono |
| | Teste de envio / preview | 🟡 | preview sim, teste de envio não |
| | Lembretes 30/7/2d + digest | ❌ | sem cron |
| | Log de e-mails | ❌ | |
| | Domínio de envio isolado por evento | ➕ | |
| Admin | Métricas (adultos/crianças…) | 🟡 | |
| | CMS por seção, settings, SEO | 🟡 | via wizard |
| | Aviso de alterações não salvas | 🟡 | autosave |
| | Edição pós-publicação de tudo | 🟡 | wizard cobre; falta painel dedicado |
| Plataforma | Multi-tenant, orgs, papéis | ➕ | |
| | Domínio custom, subdomínio, DNS | ➕ | |
| | Aprovação boutique, preview público | ➕ | |
| | Duplicar/arquivar evento | ➕ | |
| | Testes, rate limit, storage relacional | ❌ | |

---

## 6. Ideias de implementação (arquitetura e fases)

> Detalhamento operacional, fatias de PR e checklist: [`PLANO-IMPLEMENTACAO-PARIDADE.md`](./PLANO-IMPLEMENTACAO-PARIDADE.md).

### 6.1 Decisão-base: relacional multi-tenant, não JSON

Criar tabelas com `event_id` (FK para `events`), espelhando as do BarBeni. O `EventConfig` JSON continua para configuração (tema, textos), mas **dados operacionais saem do JSON**.

```
events(id, org_id, slug, status, template_id, config jsonb, ...)
families(id, event_id, name, token, emails text[], invite_locale, schedule_invite_mode,
         open_rsvp, notes, invitation_sent_at, invitation_opened_at, std_sent_at, std_opened_at)
guests(id, family_id, event_id, name, type, email, meal_choice, dietary_restrictions,
       rsvp_status, rsvp_submitted_at, message_to_family)
schedule_items(... title_i18n jsonb ..., sort_order)
family_schedule_items(family_id, schedule_item_id)
hotels, faqs, things_to_do, gallery_items(+type, show_on_site, approved)
email_logs(...), rsvp_rate_limits(...), assets(... Blob ...)
```

Token de família único global (12 chars) para resolver evento a partir do token sem depender do host. Migrar `platform_store` → tabelas com script idempotente. Query builder leve (Drizzle) ou SQL cru com `WHERE event_id = $1`.

### 6.2 Conteúdo i18n por campo

Trocar strings por `{ pt, en, es, he }` com helper `t(field, locale)` e fallback. Wizard com abas por idioma. RTL no hebraico para site, RSVP, envelopes e e-mails.

### 6.3 Extrair o "motor de cartões" (envelope)

`public/envelope/*` + configs tipados → pacote **interno só do mitzvah-pro** (`packages/event-cards`). **Copiar, não compartilhar** com o BarBeni (decisão: BarBeni intocado).

### 6.4 Fases propostas

| Fase | Entrega | Principais itens |
|------|---------|------------------|
| 0 | Fundação | Tabelas relacionais, migração do JSON, Blob, testes de base, rate-limit login/RSVP, CI |
| 1 | Convidados no padrão BarBeni | Famílias/pessoas, token, multi-e-mail, idioma, import Excel+preview, export XLSX, filtros, QR, métricas |
| 2 | Páginas por token + RSVP | `/rsvp\|card\|std/[token]`, cookie/middleware, edição RSVP, open-RSVP, rate limit, confirmação, notificações |
| 3 | E-mails e automação | Templates ricos, idioma por família, tracking, fila+progresso, teste de envio, log, lembretes 30/7/2d + digest multi-evento |
| 4 | Cartões em envelope | Pacote event-cards, ~100 parâmetros no wizard, preview ao vivo |
| 5 | Site completo | Programação por família, áudio, galeria rica, hotéis/lugares/FAQ, contato+form, Privacy/Terms, i18n por campo, calendar .ics/Outlook |
| 6 | Wizard + painel pós-publicação | Novos passos (6.5), editor por seção, avisos, paridade validada |
| 7 | Validação de paridade | Evento de teste recriado manualmente + comparação visual/funcional com BarBeni em produção (**somente leitura**). Sem importar/migrar dados reais do Beni. |

### 6.5 Mudanças no wizard (e criador de eventos)

| Passo | O que adicionar |
|-------|-----------------|
| `basics` | Nome/subtítulo/SEO por idioma, hora de início |
| `locales` (novo ou em basics) | Idiomas ativos + padrão; abas de tradução |
| `schedule` | Data, início/fim, mapa, dress/notas, rótulo de dia, ordem, visível para (todos/subconjunto) |
| `venues` → travel | Hotéis ricos; FAQ publicado/oculto; viagem |
| `places` (novo) | 6 categorias + foto/link/mapa |
| `media` | Blob+compressão, vídeo, legendas i18n, ordenação, aprovação, Google Fotos, hero+áudio |
| `contact` (novo) | Telefone, e-mail, WhatsApp Nome\|link, form |
| `saveTheDate` | ~40 campos + preview envelope + envio de teste |
| `invitation` | ~35 campos cartão/e-mail + paleta + preview |
| `rsvp` | Manter prazo/+1; + refeições, flags, open-RSVP, notificação, confirmação |
| `reminders` (novo) | 30d/7d/2d, textos, só confirmados |
| `guestsBootstrap` | Excel/CSV+preview, famílias+pessoas, idioma/tipo, dedupe, subset de eventos |
| `legal` (novo, opcional) | Privacy/Terms |
| `domain` / `review` | Checklist de paridade |

Criador de eventos: modo em branco / clonar / modelo BarBeni; brief do contato; token vs open-RSVP desde o início; checklist pós-criação.

Painel pós-publicação: tela por seção (reaproveitar wizard) com salvamento granular.

### 6.6 Cron multi-evento e e-mails em escala

Cron diário `/api/cron/reminders` multi-evento; fila (QStash/Inngest) lotes 25–50; webhook Resend → `email_logs`; manter domínio isolado por evento (diferencial mitzvah-pro).

### 6.7 Segurança e qualidade (pré-requisitos)

Rate limit login/RSVP/contato; RSVP só com token (ou open-RSVP + Turnstile); exigir secrets em prod; portar testes do BarBeni (reimplementados no mitzvah-pro) + E2E; validar uploads; sanitizar HTML de e-mail.

---

## 7. Backlog priorizado (resumo acionável)

**P0 – bloqueia qualquer paridade**

1. Migrar storage JSON → tabelas relacionais + Blob (fase 0).
2. Modelo família → pessoas + token + multi-e-mail + idioma (fase 1).
3. Rotas `/rsvp|card|std/[token]` e cookie (fase 2).
4. Proteger o RSVP atual (token ou rate limit + captcha) — correção imediata, independente do resto.

**P1 – paridade operacional**

5. Confirmação por e-mail + notificação ao admin + log (fase 2/3).
6. Templates de e-mail ricos + idioma por família + tracking + envio em fila (fase 3).
7. Lembretes 30/7/2d + digest com cron multi-evento (fase 3).
8. Import Excel com preview, export XLSX, filtros, QR, métricas (fase 1).

**P2 – paridade de experiência**

9. Envelope animado STD/convite + parâmetros de design (fase 4).
10. Programação por família; galeria rica; hotéis/lugares/FAQ; áudio; contato+form; calendar multi (fase 5).
11. Conteúdo i18n por campo nos 4 idiomas (fase 5).

**P3 – acabamento**

12. Privacy/Terms, coming-soon, painel pós-publicação, versionamento, E2E, validação de paridade vs Beni produção read-only (fases 6–7).
13. Corrigir documentação do mitzvah-pro; docs do BarBeni só se houver manutenção separada nesse repo.

---

## 8. Riscos e perguntas em aberto

- **DECIDIDO (2026-11-04):** o BarBeni **NÃO** será migrado. Continua app separado. Fase 7 = evento-teste + comparação read-only com produção. Pacote `event-cards` só no mitzvah-pro (copiar, não compartilhar). Links/e-mails já enviados do Beni continuam via redirects atuais.
- **DECIDIDO:** eventos do Mitzvah-pro oferecem os 4 idiomas (`en`/`pt`/`es`/`he`) por evento; RTL no hebraico em envelopes, e-mails, RSVP e site.
- Envelope animado é JS/CSS estático com `window.ENVELOPE_CONFIG`; precisa ser empacotado sem depender de `basePath` do BarBeni (`withBasePath`).
- Custo de e-mail/DNS por evento (Resend + Vercel DNS) cresce com o número de eventos.
- LGPD/privacidade: Privacy/Terms + rotina de exclusão/export por evento.
- **Não verificado na análise original:** comportamento em produção, valores de env, conteúdo real do banco do BarBeni, PRs/branches abertos com trabalho em andamento.
