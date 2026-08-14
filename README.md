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
6. Publique → o **site** fica em `seu-slug.mitzvah.pro` e o **email** em `convites@mail.seu-slug.mitzvah.pro` (Resend + DNS Vercel)

Há um evento semente **do studio** em `/e/beni` (demo da plataforma, não é o BarBeni). O evento real do Beni continua em `/BarBeni/en`.

Dashboard de um evento do studio: `/dashboard/events/[id]`.

No DNS/Vercel, aponte o wildcard `*.mitzvah.pro` para **este** projeto. `/e/{slug}` redireciona para o subdomínio, **exceto** slugs reservados (`beni`, `en`, `admin`, …).

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `BAR_BENI_ORIGIN` | Sim (prod) | URL do deploy **bar-beni** (outro repo), sem barra final. Só para o rewrite `/BarBeni/*` |
| `RESEND_API_KEY` | Sim (contato e convites) | API Resend |
| `RESEND_FROM_EMAIL` | Sim (contato; fallback de convites) | Remetente da landing e fallback se o domínio do evento ainda não verificou |
| `EVENT_MAIL_ISOLATION` | Não (default `1`) | `0` desliga domínio por slug e envia tudo por `RESEND_FROM_EMAIL` |
| `VERCEL_TOKEN` | Sim (isolamento de email) | Token da conta Vercel para gravar DNS em `mitzvah.pro` |
| `VERCEL_TEAM_ID` | Se o projeto for de um team | Team ID (Settings do time na Vercel) |
| `VERCEL_DNS_DOMAIN` | Não | Zona DNS (default `mitzvah.pro`) |
| `MAIL_FROM_LOCAL` | Não | Parte local do remetente (default `convites`) |
| `MAIL_DOMAIN_PREFIX` | Não | Prefixo do domínio de envio (default `mail` → `mail.{slug}.mitzvah.pro`) |
| `MITZVAH_CONTACT_EMAIL` | Não | Exibido na página (default `mitzvah@mitzvah.pro`) |
| `MITZVAH_CONTACT_FORWARD_TO` | Não | Destino dos emails do form |
| `DASHBOARD_PASSWORD` | Não | Senha do studio **mitzvah-pro** (default `mitzvah`) |
| `DASHBOARD_SECRET` | Não | Segredo do cookie de sessão do studio |
| `NEXT_PUBLIC_SITE_HOST` | Não | Host canónico (default `mitzvah.pro`) → `{slug}.mitzvah.pro` |
| `DATABASE_URL` | Prod (recomendado) | Postgres/Neon — persiste eventos entre lambdas |
| `BLOB_READ_WRITE_TOKEN` | Prod (alternativa) | Vercel Blob se não houver Postgres |

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

## Email por evento (Resend + DNS Vercel)

O DNS de `mitzvah.pro` fica **na Vercel**, não no Cloudflare. No **publish** do wizard:

1. Cria o domínio `mail.{slug}.mitzvah.pro` na API do Resend
2. Grava SPF/DKIM/MX na zona DNS da Vercel
3. Pede verificação ao Resend
4. Envia Save the Date e convites de `convites@mail.{slug}.mitzvah.pro`

Assim a reputação de um evento não mistura com a dos outros nem com o formulário da landing (`RESEND_FROM_EMAIL`). Sem `VERCEL_TOKEN`, o publish do site continua e o envio usa o remetente compartilhado.

Crie o token em [vercel.com/account/tokens](https://vercel.com/account/tokens). Se o projeto for de um team, copie o Team ID em Team Settings.

## Deploy Vercel

1. Projeto **mitzvah-pro** (este repo): domínio `mitzvah.pro` e wildcard `*.mitzvah.pro`
2. Projeto **bar-beni** (outro repo): URL interna; este app aponta `BAR_BENI_ORIGIN` para ela
3. `NEXT_PUBLIC_SITE_HOST=mitzvah.pro`
4. `VERCEL_TOKEN` (+ `VERCEL_TEAM_ID` se for team) para gravar DNS de email por slug
