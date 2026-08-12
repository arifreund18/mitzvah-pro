# Melhorias — Mitzvah.pro

Documento vivo de planos e estratégias de produto/engenharia.
Atualizado em: 2026-08-12

---

## 0. Lista priorizada (e o que já existe localmente)

| Prioridade | Melhoria | Status local (2026-08-12) |
|------------|----------|---------------------------|
| **P0** | Auth simples + dashboard CRUD de eventos | ✅ `/dashboard` |
| **P0** | Persistência EventConfig (JSON local) | ✅ `data/platform.json` |
| **P0** | Template BarBeni config-driven | ✅ `components/template/EventSite.tsx` |
| **P0** | Wizard passo a passo com **preview ao vivo** | ✅ `/dashboard/events/[id]/wizard` |
| **P0** | Publish do site do evento | ✅ `/e/[slug]` |
| **P0** | RSVP público + lista de convidados | ✅ `/e/[slug]` + `/dashboard/events/[id]/guests` |
| **P1** | Inventário fiel do repo `bar-beni` (paridade 1:1) | ⏳ pendente (template inspirado) |
| **P1** | Multi-tenant (orgs, papéis, isolamento) | ⏳ senha única de studio |
| **P1** | Preview token / subdomain `*.mitzvah.pro` | ⏳ path local `/e/slug` |
| **P1** | Import CSV de convidados | ⏳ lista manual no wizard |
| **P1** | Fluxo boutique assistido (aprovação do cliente) | ⏳ mesmo wizard para ops |
| **P2** | Domínio custom Signature + SSL | ⏳ |
| **P2** | Mais templates além do BarBeni | ⏳ contrato único pronto |
| **P2** | Analytics de RSVP | ⏳ contagem no detalhe |
| **P2** | Editor visual drag-and-drop | ⏳ fora de escopo |
| **P2** | i18n completo do conteúdo do evento (N idiomas) | ⏳ idioma/RTL do site; textos únicos |
| **P2** | Unificar APIs de contato | ⏳ |

**Como usar a versão local:** `/dashboard/login` (senha `mitzvah`) → Novo evento → wizard. O painel direito atualiza na hora. Publicar abre `/e/{slug}`. Evento demo: `/e/beni`.

---

## Índice

1. [Contexto atual (Fase 1)](#1-contexto-atual-fase-1)
2. [Épico: Dashboard + Template BarBeni + Wizard self-serve](#2-épico-dashboard--template-barbeni--wizard-self-serve)
3. [Objetivos de produto](#3-objetivos-de-produto)
4. [Princípios e restrições](#4-princípios-e-restrições)
5. [Arquitetura alvo](#5-arquitetura-alvo)
6. [Modelo de dados](#6-modelo-de-dados)
7. [Dashboard (gestão de eventos)](#7-dashboard-gestão-de-eventos)
8. [Template baseado no BarBeni](#8-template-baseado-no-barbeni)
9. [Wizard de customização (passo a passo)](#9-wizard-de-customização-passo-a-passo)
10. [Fluxos de usuário](#10-fluxos-de-usuário)
11. [Auth, papéis e segurança](#11-auth-papéis-e-segurança)
12. [Multi-tenant, domínios e rotas](#12-multi-tenant-domínios-e-rotas)
13. [i18n, RTL e conteúdo](#13-i18n-rtl-e-conteúdo)
14. [Fases de entrega](#14-fases-de-entrega)
15. [Critérios de aceite](#15-critérios-de-aceite)
16. [Riscos e mitigações](#16-riscos-e-mitigações)
17. [Dependências externas](#17-dependências-externas)
18. [Backlog priorizado](#18-backlog-priorizado)
19. [Issue GitHub (corpo pronto)](#19-issue-github-corpo-pronto)

---

## 1. Contexto atual (Fase 1)

Hoje o repo `mitzvah-pro` é uma **casca de plataforma**:

| Capacidade | Estado |
|------------|--------|
| Landing comercial multilíngue (`en`/`pt`/`es`/`he`) | ✅ |
| Proxy para um evento BarBeni (`BAR_BENI_ORIGIN`) | ✅ (origem única) |
| Formulário de contato (vendas/boutique) | ✅ |
| Dashboard multi-evento | ❌ |
| Auth / contas | ❌ |
| Template reutilizável | ❌ |
| Wizard self-serve | ❌ |
| Domínios/subdomínios por família | ❌ (só copy de pricing) |
| Persistência (DB / storage) | ❌ |

**Implicação:** BarBeni é o “produto de evento” real (STD, convite, RSVP, admin de convidados), mas está **fora** deste repo, acessível via rewrite. Qualquer dashboard/wizard precisa decidir se:

- **A)** evolui o `bar-beni` para multi-tenant + template + wizard, e o `mitzvah-pro` vira painel + router; ou
- **B)** absorve/extraí o runtime de evento para dentro de `mitzvah-pro`; ou
- **C)** cria um terceiro serviço “event-runtime” e ambos os frontends falam com ele.

**Recomendação:** **A + extração gradual** — tratar BarBeni como **Template v1** (código + schema de config), e construir em `mitzvah-pro` o **Control Plane** (auth, dashboard, wizard, billing futuro). O runtime de evento continua no app derivado do BarBeni até estabilizar o schema.

Rotas já reservadas (não colidir):

- `/admin`, `/admin/*` → BarBeni
- `/en`, `/en/*` → BarBeni
- `/pt/(invite|rsvp|card|std|privacy|terms)` → BarBeni
- `/BarBeni/*` → rewrite upstream

Usar para o painel da plataforma: `/dashboard`, `/studio`, `/wizard`, `/login` (nunca `/admin` na plataforma).

---

## 2. Épico: Dashboard + Template BarBeni + Wizard self-serve

### Problema
Hoje cada novo evento depende de trabalho manual da equipe (posicionamento boutique). Isso não escala e impede o cliente de montar sozinho um site baseado no que já funciona no BarBeni.

### Solução
1. **Dashboard Mitzvah.pro** — o operador (e depois o cliente) cria, lista, edita, publica e arquiva eventos.
2. **Template “BarBeni”** — o site Beni vira o template oficial (config-driven), não um deploy hard-coded único.
3. **Wizard self-serve** — fluxo guiado, etapa por etapa, cobrindo todas as informações customizáveis do template, com preview e publish.

### Resultado desejado
Uma família (ou a equipe Mitzvah) consegue, sem deploy manual:

1. Criar evento no dashboard  
2. Escolher o template BarBeni  
3. Completar o wizard  
4. Publicar em `familia.mitzvah.pro` (plano Mitzvah) ou domínio próprio (Signature)  
5. Gerenciar convidados / RSVP no admin do evento  

---

## 3. Objetivos de produto

| Objetivo | Detalhe |
|----------|---------|
| Self-serve | Cliente customiza sozinho via wizard |
| Operação interna | Equipe Mitzvah usa o mesmo dashboard para montar eventos “boutique” |
| Paridade BarBeni | Template cobre STD, convite, site, RSVP, calendário, FAQ, hotéis, galeria |
| Duas velocidades | Plano assistido (equipe) **e** plano wizard (self-serve) coexistindo |
| Multilíngue | Wizard e site do evento em `en`/`pt`/`es`/`he` (RTL no he) |
| Segurança | Auth obrigatória; eventos isolados por tenant |

### Não-objetivos (nesta entrega)
- App mobile nativo  
- Marketplace de templates de terceiros  
- Editor visual drag-and-drop completo (pode vir depois; wizard form-based primeiro)  
- Migração automática de todos os eventos históricos fora do schema  

---

## 4. Princípios e restrições

1. **Config over code** — customizações do cliente vivem em dados (JSON/DB), não em forks do repo.
2. **BarBeni como source of truth do template** — inventariar campos reais do Beni antes de fechar o wizard.
3. **Preview ≠ Publish** — rascunho sempre; publicar é ação explícita.
4. **Sem colisão de rotas** — painel em `/dashboard/*`; runtime de evento em subdomínio ou path `/e/[slug]`.
5. **Uma origem de contato** — unificar form local vs `/BarBeni/api/platform/contact`.
6. **Segurança first** — upload de mídia com limites; sem XSS em rich text; RLS/tenant isolation.
7. **Copy da landing** — hoje diz “você não monta sozinho”; atualizar quando o wizard for GA.

---

## 5. Arquitetura alvo

```
┌─────────────────────────────────────────────────────────────┐
│                     mitzvah.pro (Control Plane)             │
│  Landing │ Auth │ Dashboard │ Wizard │ Billing (futuro)     │
└─────────────┬───────────────────────┬───────────────────────┘
              │                       │
              │ CRUD eventos/config   │ publish / preview token
              ▼                       ▼
┌──────────────────────┐   ┌──────────────────────────────────┐
│  Platform API + DB   │   │  Event Runtime (Template BarBeni)│
│  users, orgs, events │──▶│  STD │ Invite │ Site │ RSVP     │
│  configs, assets     │   │  Admin convidados por evento     │
└──────────────────────┘   └──────────────────────────────────┘
              │                       ▲
              │ media                 │ resolve host → eventId
              ▼                       │
         Object storage         Middleware / edge routing
         (fotos, logos)         familia.mitzvah.pro → event
```

### Decisões abertas (resolver na Fase 0)

| Decisão | Opções | Sugestão |
|---------|--------|----------|
| Onde vive o runtime | Continuar repo bar-beni vs monorepo vs pacote `@mitzvah/event-template` | Extrair template package; bar-beni vira 1ª instância |
| DB | Postgres (Neon/Supabase/Vercel) | Postgres + Prisma/Drizzle |
| Auth | Clerk / Auth.js / Supabase Auth | Auth.js ou Clerk (rápido para dashboard) |
| Hosting multi-evento | Subdomínio wildcard vs path `/e/[slug]` | Wildcard `*.mitzvah.pro` + path preview |
| Media | Vercel Blob / S3 / Cloudflare R2 | R2 ou Vercel Blob |

---

## 6. Modelo de dados (mínimo)

```
User
  id, email, name, role (platform_admin | org_owner | org_member)

Organization (família / cliente)
  id, name, billingPlan (mitzvah | signature | boutique_assisted)

Event
  id, orgId, slug, status (draft | preview | published | archived)
  templateId ("barbeni"), localeDefault, localesEnabled[]
  subdomain, customDomain?, publishedAt

EventConfig (versionado)
  eventId, version, data (JSON schema do template), updatedBy

Asset
  id, eventId, type (hero|gallery|logo|std|invite), url, meta

Guest / RSVP (pode permanecer no runtime BarBeni no início)
  — integrar depois via eventId compartilhado

WizardProgress
  eventId, currentStep, completedSteps[], lastSavedAt
```

**Versionamento:** cada “Salvar” no wizard cria ou atualiza draft; **Publish** congela uma versão imutável referenciada pelo runtime.

---

## 7. Dashboard (gestão de eventos)

### Quem usa
- **Operador Mitzvah** (platform_admin): todos os eventos  
- **Cliente** (org_owner): só os eventos da própria org  

### Telas

1. **Login / convite de equipe**  
2. **Lista de eventos** — busca, filtro por status, plano, data  
3. **Criar evento** — nome, slug, celebrante, data alvo, template (BarBeni), locales  
4. **Detalhe do evento**  
   - Status + ações: Abrir wizard, Preview, Publicar, Despublicar, Arquivar  
   - Links: site público, admin de convidados, STD, convite  
   - Domínio: subdomínio / domínio custom (Signature)  
5. **Configurações da org** — membros, plano  
6. **(Ops)** Impersonation / “abrir como boutique” para a equipe montar no lugar do cliente  

### Ações CRUD
- Create / Read / Update / Soft-delete (archive)  
- Duplicate event (clonar config do template + overrides)  
- Transfer org (futuro)

### Path sugerido
`/dashboard` — **não** usar `/admin` (já proxy do BarBeni).

---

## 8. Template baseado no BarBeni

### Meta
Transformar o site Beni de “um deploy” em **Template ID = `barbeni`** com:

1. **Schema JSON** de todos os campos customizáveis  
2. **Defaults** (textos, cores, seções on/off)  
3. **Renderers** (STD, invite card, site pages, emails)  
4. **Admin de convidados** parametrizado por `eventId`

### Trabalho de inventário (obrigatório antes do wizard)

Auditar no repo `bar-beni` e listar:

- Textos (hero, nomes, datas, locais, FAQ, hotéis, dress code, etc.)  
- Mídia (fotos, envelope, selo, fundo)  
- Cores / tipografia / tema  
- Seções opcionais (galeria, mapa, playlist, registry…)  
- Regras de RSVP (refeições, restrições, +1, crianças, deadline)  
- Fluxos: STD → Invite → RSVP → Site  
- Locales e RTL  
- Emails/lembretes  

Saída: `packages/template-barbeni/schema.json` + `README` do template.

### Contrato do template

```ts
type TemplateModule = {
  id: 'barbeni'
  version: string
  schema: JSONSchema // campos do wizard
  defaultConfig: EventConfigData
  steps: WizardStepDefinition[] // ordem e validação
  renderPreview: (config, step) => PreviewModel
}
```

Novos templates futuros (ex.: “Jerusalem”, “Minimal”) implementam o mesmo contrato.

---

## 9. Wizard de customização (passo a passo)

### Princípios UX
- Uma etapa = um objetivo claro  
- Autosave + indicador “salvo”  
- Preview ao lado (desktop) / aba Preview (mobile)  
- Validação por etapa; não bloquear explorar, mas bloquear Publish se inválido  
- Permitir pular etapas opcionais e voltar depois  
- Barra de progresso com steps concluídos  

### Etapas propostas (base BarBeni — ajustar após inventário)

| # | Step ID | Título | O que captura | Obrigatório |
|---|---------|--------|---------------|-------------|
| 1 | `basics` | Celebração | Tipo (Bar/Bat/Other), nome do celebrante, família, data, cidade | Sim |
| 2 | `locales` | Idiomas | Idiomas do site + idioma padrão (incl. he/RTL) | Sim |
| 3 | `branding` | Visual | Cores, fontes, logo, estilo (elegante/moderno/…) | Sim |
| 4 | `story` | Textos principais | Headline, subtítulo, mensagem dos pais, about | Sim |
| 5 | `schedule` | Programação | Cerimônia, recepção, horários, endereços, mapa | Sim |
| 6 | `venues` | Locais & hotéis | Locais, hotéis sugeridos, dress code, estacionamento | Não |
| 7 | `media` | Fotos & galeria | Upload hero, galeria, foto STD/convite | Sim (mín. 1) |
| 8 | `saveTheDate` | Save the Date | Copy STD, animação/tema envelope, data de envio | Não |
| 9 | `invitation` | Convite digital | Texto do cartão, selo, QR, regras do link | Sim |
| 10 | `rsvp` | RSVP | Deadline, refeições, restrições, campos extras, +1 | Sim |
| 11 | `faq` | FAQ | Perguntas/respostas | Não |
| 12 | `guestsBootstrap` | Convidados | Import CSV / adicionar manual (pode ser pós-publish) | Não |
| 13 | `domain` | Publicação | Slug/subdomínio, domínio custom (Signature), SEO | Sim |
| 14 | `review` | Revisão | Checklist, preview full, Publish | Sim |

### Comportamento técnico do Wizard
- Rota: `/dashboard/events/[eventId]/wizard/[step]`  
- API: `PATCH /api/events/[id]/config` (merge parcial por step)  
- `WizardProgress` atualizado a cada save  
- Preview: `https://preview-{token}.mitzvah.pro` ou `/preview/[eventId]?step=` com config draft  
- Publish: valida schema completo → grava `publishedVersion` → invalida cache CDN  

### Assistido vs self-serve
- **Self-serve:** cliente preenche o wizard  
- **Boutique:** operador preenche o mesmo wizard; cliente só aprova (step `review` compartilhado)  

---

## 10. Fluxos de usuário

### A) Cliente self-serve
1. Contato ou signup → cria Organization  
2. Dashboard → Novo evento → template BarBeni  
3. Wizard (steps 1–14)  
4. Preview → Publish  
5. Admin de convidados (runtime) → envia STD/convites  

### B) Equipe boutique (como hoje, mas no produto)
1. Ops cria Organization + Event  
2. Ops completa wizard (ou importa brief do form de contato)  
3. Cliente recebe link de preview/aprovação  
4. Ops publica  

### C) Duplicar de um evento modelo
1. “Usar BarBeni como base” = clonar `defaultConfig` + assets de referência  
2. Wizard só sobrescreve o que mudou  

---

## 11. Auth, papéis e segurança

| Papel | Permissões |
|-------|------------|
| `platform_admin` | Tudo + impersonation |
| `org_owner` | CRUD eventos da org, membros, publish |
| `org_member` | Editar wizard / convidados; sem deletar org |
| `guest` (convidado) | Só rotas públicas do evento + RSVP tokenizado |

Requisitos:
- Sessão segura (httpOnly)  
- Links de convite/RSVP com token opaco  
- Uploads: tipos MIME allowlist, tamanho máx, scan básico  
- Rate limit em auth, publish, upload  
- Audit log: quem publicou / alterou domínio  

---

## 12. Multi-tenant, domínios e rotas

| Plano | URL pública |
|-------|-------------|
| Mitzvah | `{slug}.mitzvah.pro` |
| Signature | domínio custom + SSL |
| Preview | `preview-{id}.mitzvah.pro` ou path autenticado |

### Mudanças no middleware (`mitzvah-pro`)
1. Host-based routing: se host é subdomain de evento → rewrite para runtime com `eventId`  
2. Manter compat BarBeni atual (`/BarBeni`) durante migração  
3. Dashboard/auth **excluídos** do proxy BarBeni  

### DNS
- Wildcard `*.mitzvah.pro` na Vercel  
- Signature: fluxo de verificação de domínio (TXT/CNAME) + certificado  

---

## 13. i18n, RTL e conteúdo

- Wizard UI: mesmos locales da landing (`en`/`pt`/`es`/`he`)  
- Config do evento: campos por locale (`title.pt`, `title.he`, …) ou estrutura `i18n: { pt: {...}, he: {...} }`  
- Preview hebraico com `dir=rtl` (já há precedente na landing)  
- Atualizar copy da landing quando self-serve for público (howItWorks hoje é 100% assistido)

---

## 14. Fases de entrega

### Fase 0 — Descoberta (bloqueante)
- [ ] Acesso e inventário completo do repo `bar-beni` + `docs/FASE1-DEPLOY.md`  
- [ ] Extrair lista de campos customizáveis → draft do schema  
- [ ] Decidir stack auth/DB/storage  
- [ ] Definir estratégia monorepo vs multi-repo  

### Fase 1 — Control Plane mínimo
- [ ] Auth + Organization + Event CRUD  
- [ ] Dashboard lista/cria/arquiva  
- [ ] EventConfig draft na DB  
- [ ] Rotas `/dashboard` sem colidir com proxy  

### Fase 2 — Template BarBeni config-driven
- [ ] Empacotar template + schema + defaults  
- [ ] Runtime lê config por `eventId` (não só hardcode Beni)  
- [ ] Preview draft  

### Fase 3 — Wizard MVP
- [ ] Steps obrigatórios (basics, branding, story, schedule, media, invitation, rsvp, domain, review)  
- [ ] Autosave + progresso  
- [ ] Publish para subdomain  

### Fase 4 — Wizard completo + ops
- [ ] Steps opcionais (STD, venues, FAQ, guests import)  
- [ ] Fluxo boutique assistido + aprovação  
- [ ] Domínio custom (Signature)  
- [ ] Atualizar landing (self-serve + assisted)  

### Fase 5 — Endurecimento
- [ ] Observabilidade, backups, audit log  
- [ ] Testes E2E (criar → wizard → publish → RSVP)  
- [ ] Migração do evento Beni legado para o novo modelo  
- [ ] Remover hardcode `BAR_BENI_ORIGIN` single-tenant (ou manter só fallback)

---

## 15. Critérios de aceite (épico)

1. Usuário autenticado cria um evento no dashboard em &lt; 1 minuto.  
2. Wizard cobre **todas** as customizações necessárias do template BarBeni (paridade com o que a equipe edita manualmente hoje).  
3. Preview reflete o draft em tempo quase real.  
4. Publish disponibiliza o site em `{slug}.mitzvah.pro`.  
5. RSVP/STD/convite funcionam no evento publicado.  
6. Operador Mitzvah consegue gerenciar múltiplos eventos e impersonar/editar.  
7. Isolamento: org A não vê dados da org B.  
8. Hebraico (RTL) e demais locales funcionam no site gerado.  
9. Nenhuma regressão na landing nem no proxy do Beni legado durante a migração.

---

## 16. Riscos e mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Schema incompleto do BarBeni | Wizard incompleto | Fase 0 inventário obrigatório |
| Colisão `/admin` e `/en` | Quebra evento legado | Paths novos; feature flags |
| Escopo virar page builder | Atraso | Wizard form-based; builder depois |
| Uploads grandes | Custo/abuse | Quotas por plano |
| Single `BAR_BENI_ORIGIN` | Bloqueia multi-evento | Runtime multi-tenant o quanto antes |
| Copy “boutique only” vs self-serve | Confusão de marca | Dois CTAs claros na landing |

---

## 17. Dependências externas

- Repo **bar-beni** (código + `docs/FASE1-DEPLOY.md`) — **crítico**  
- DNS wildcard `*.mitzvah.pro`  
- Provedor Auth + Postgres + Object Storage  
- Email (já há Resend) para magic link / convites equipe / lembretes  

---

## 18. Backlog priorizado

### P0 — feito na versão local (2026-08-12)
1. Auth studio + dashboard CRUD eventos  
2. Persistência EventConfig em JSON  
3. Template BarBeni config-driven + preview ao vivo no wizard  
4. Publish em `/e/[slug]` + RSVP + convidados  

### P1
5. Inventário real do repo bar-beni → schema 1:1  
6. Multi-tenant (orgs / papéis)  
7. Import CSV convidados  
8. Fluxo boutique assistido + aprovação  
9. Subdomínio `{slug}.mitzvah.pro`  

### P2
10. Domínio custom Signature  
11. Mais templates  
12. Analytics de RSVP no dashboard  
13. Editor visual avançado  

---

## 19. Issue GitHub

- **Issue:** https://github.com/arifreund18/mitzvah-pro/issues/3
- Corpo espelhado em [`docs/github-issue-dashboard-wizard.md`](./github-issue-dashboard-wizard.md)

---

## Histórico deste documento

| Data | Mudança |
|------|---------|
| 2026-08-12 | Versão local P0: dashboard, template BarBeni, wizard com preview ao vivo, publish `/e/[slug]`, RSVP |
| 2026-08-10 | Criação: épico Dashboard + Template BarBeni + Wizard; issue #3 |
