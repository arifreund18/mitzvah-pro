# Mitzvah.pro — plataforma (`mitzvah-pro`)

Este repositório é a **plataforma Mitzvah.pro**: landing comercial, studio (dashboard + wizard) e proxy para o evento BarBeni, que vive noutro repo.

## Dois repositórios (não misturar)

| | **mitzvah-pro** (este repo) | **bar-beni** (outro repo) |
|--|-----------------------------|---------------------------|
| O que é | Site da empresa + studio para **eventos novos** | Site e admin do **evento do Beni** (um único evento) |
| Landing | `https://mitzvah.pro/` e `/en` `/pt` `/es` `/he` | — |
| Site do evento | `{slug}.mitzvah.pro` (eventos publicados no studio) | `https://mitzvah.pro/BarBeni/en` |
| Painel | `https://mitzvah.pro/dashboard` | `https://mitzvah.pro/BarBeni/admin/dashboard` |
| **Não existe** | `/admin` neste domínio (não é atalho para o BarBeni) | `/dashboard` da plataforma |

O app `bar-beni` é servido só sob o prefixo **`/BarBeni/*`**, via rewrite para `BAR_BENI_ORIGIN`. Não há rota `https://mitzvah.pro/admin`.

## Documentação

- [`docs/MELHORIAS.md`](docs/MELHORIAS.md) — backlog pendente e o que já foi entregue
- [`docs/github-issue-dashboard-wizard.md`](docs/github-issue-dashboard-wizard.md) — issue do épico studio

## Scripts

```bash
npm install --legacy-peer-deps
npm run dev      # http://localhost:3000
npm run build
```

## Studio (este repo)

1. `npm run dev`
2. Abra http://localhost:3000/dashboard/login
3. Senha padrão: `mitzvah` (`DASHBOARD_PASSWORD`)
4. Crie um evento → o wizard abre com preview ao vivo
5. Save the Date e convite são **emails** (preview no wizard; envio no dashboard do evento)
6. Publique → o **site** fica em `seu-slug.mitzvah.pro` e o **email** em `convites@mail.seu-slug.mitzvah.pro` (SES + DKIM + DNS Vercel; fallback `EMAIL_FROM_ADDRESS`)

Há um evento semente **do studio** em `/e/beni` (demo da plataforma, não é o BarBeni). O evento real do Beni continua em `/BarBeni/en`.

Dashboard de um evento do studio: `/dashboard/events/[id]`.

No DNS/Vercel, aponte o wildcard `*.mitzvah.pro` para **este** projeto. `/e/{slug}` redireciona para o subdomínio, **exceto** slugs reservados (`beni`, `en`, `admin`, …).

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `BAR_BENI_ORIGIN` | Sim (prod) | URL do deploy **bar-beni** (outro repo), sem barra final. Só para o rewrite `/BarBeni/*` |
| `EMAIL_PROVIDER` | Não | `ses` ou `resend` (auto: SES se `AWS_*`) |
| `AWS_REGION` | Não | Região SES (default `us-east-2`) |
| `AWS_ACCESS_KEY_ID` | Sim (SES) | Credencial IAM de envio (não commitar) |
| `AWS_SECRET_ACCESS_KEY` | Sim (SES) | Credencial IAM (não commitar) |
| `EMAIL_FROM_ADDRESS` | Sim (SES) | Fallback apex (ex. `convites@mitzvah.pro`) enquanto o domínio do evento não verifica |
| `EMAIL_SES_PRODUCTION` | Não | `true` após sair do sandbox (senão 1/s e 200/24h) |
| `RESEND_API_KEY` | Fallback | Só se `EMAIL_PROVIDER=resend` |
| `RESEND_FROM_EMAIL` | Fallback | Remetente Resend |
| `VERCEL_TOKEN` | Sim (isolamento email + site) | DNS `{slug}` e `mail.{slug}` |
| `MAIL_DOMAIN_PREFIX` | Não | Default `mail` → `mail.{slug}.mitzvah.pro` |
| `MITZVAH_CONTACT_EMAIL` | Não | Exibido na página (default `mitzvah@mitzvah.pro`) |
| `MITZVAH_CONTACT_FORWARD_TO` | Não | Destino dos emails do form |
| `DASHBOARD_PASSWORD` | Não | Senha do studio **mitzvah-pro** (default `mitzvah`) |
| `DASHBOARD_SECRET` | Não | Segredo do cookie de sessão do studio |
| `NEXT_PUBLIC_SITE_HOST` | Não | Host canónico (default `mitzvah.pro`) → `{slug}.mitzvah.pro` |
| `DATABASE_URL` | **Obrigatória em prod** | Postgres/Neon — sem isto, criar evento → wizard 404 (storage `/tmp` por lambda) |
| `BLOB_READ_WRITE_TOKEN` | Alternativa em prod | Vercel Blob se não houver Postgres |

## Rotas neste repo (`mitzvah-pro`)

- `/` `/en` — landing Mitzvah.pro (inglês; `/en` canónico em `/`)
- `/pt` `/es` `/he` — landing
- `/dashboard` — studio da plataforma (login em `/dashboard/login`)
- `/dashboard/events/[id]` — dashboard de um evento **criado no studio**
- `/dashboard/events/[id]/wizard` — wizard com preview ao vivo
- `/e/[slug]` — runtime interno de evento do studio (redireciona para `{slug}.mitzvah.pro`, exceto `beni`)
- `{slug}.mitzvah.pro` — site público de eventos **novos** (local: `{slug}.localhost:3000`)
- `/api/contact` — POST formulário da landing
- `/BarBeni/*` — **proxy** para o repo `bar-beni` (não é código deste repo)

## Rotas do repo `bar-beni` (só via `/BarBeni`)

- `/BarBeni/en` — site público do evento Beni
- `/BarBeni/admin/dashboard` — admin de convidados do BarBeni
- `/BarBeni/en/invite`, `/BarBeni/en/rsvp`, … — páginas do evento Beni

Atalhos antigos `/en/invite` e `/pt/invite` (etc.) ainda redirecionam para `/BarBeni/...` para não quebrar emails já enviados. **`/admin` no apex não existe.**

## Email (Amazon SES + fallback Resend)

Padrão: **Amazon SES** (`us-east-2`) com **domínio isolado por evento** `mail.{slug}.mitzvah.pro` (DKIM + DNS Vercel) para não misturar reputação. Display name + Reply-To do anfitrião. Ver [`docs/SES.md`](docs/SES.md).

Enquanto o domínio do evento está `pending`, usa-se `EMAIL_FROM_ADDRESS`. Em sandbox: ~1/s e 200/24h; falhas retryable ficam `deferred`.

Fallback: `EMAIL_PROVIDER=resend` restaura o fluxo Resend + `mail.{slug}`.

## Deploy Vercel

1. Projeto **mitzvah-pro** (este repo): domínio `mitzvah.pro` e wildcard `*.mitzvah.pro`
2. Projeto **bar-beni** (outro repo): URL interna; este app aponta `BAR_BENI_ORIGIN` para ela
3. `NEXT_PUBLIC_SITE_HOST=mitzvah.pro`
4. Credenciais SES (envio + Create/Get identity) + `EMAIL_FROM_ADDRESS` + `VERCEL_TOKEN` (site e `mail.{slug}`)
