# Mitzvah.pro — plataforma

Landing comercial, studio local (dashboard + wizard) e proxy para sites de eventos.

## Documentação

- [`docs/MELHORIAS.md`](docs/MELHORIAS.md) — planos, prioridades e status da versão local

## Scripts

```bash
npm install --legacy-peer-deps
npm run dev      # http://localhost:3000
npm run build
```

## Studio local (dashboard + wizard)

1. `npm run dev`
2. Abra http://localhost:3000/dashboard/login
3. Senha padrão: `mitzvah` (`DASHBOARD_PASSWORD`)
4. Crie um evento → o wizard abre com preview ao vivo
5. Save the Date e convite são **emails** (preview no wizard; envio no dashboard do evento)
6. Publique → o **site** fica em `seu-slug.mitzvah.pro` (local: `http://seu-slug.localhost:3000`)

Há um evento semente de studio em `/e/beni` (não usa subdomínio). O **BarBeni legado** continua em `/en`, `/admin` e `/BarBeni/*` — não muda para `{slug}.mitzvah.pro`.

Dashboard do evento: `/dashboard/events/[id]` — convidados, RSVP, enviar STD/convites.

No DNS/Vercel, aponte o wildcard `*.mitzvah.pro` para este projeto. `/e/{slug}` redireciona para o subdomínio, **exceto** slugs reservados (`beni`, `en`, `admin`, …).

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `BAR_BENI_ORIGIN` | Sim (prod) | URL do deploy bar-beni, sem barra final |
| `RESEND_API_KEY` | Sim (contato) | API Resend |
| `RESEND_FROM_EMAIL` | Sim (contato) | Remetente verificado |
| `MITZVAH_CONTACT_EMAIL` | Não | Exibido na página (default `mitzvah@mitzvah.pro`) |
| `MITZVAH_CONTACT_FORWARD_TO` | Não | Destino dos emails do form |
| `DASHBOARD_PASSWORD` | Não | Senha do studio (default `mitzvah`) |
| `DASHBOARD_SECRET` | Não | Segredo do cookie de sessão |
| `NEXT_PUBLIC_SITE_HOST` | Não | Host canónico (default `mitzvah.pro`) → `{slug}.mitzvah.pro` |

## Rotas

- `/` — landing EN
- `/pt` `/es` `/he` — landing
- `/dashboard` — studio (login em `/dashboard/login`)
- `/dashboard/events/[id]` — dashboard do evento (convidados, envio de emails, RSVP)
- `/dashboard/events/[id]/wizard` — wizard com preview ao vivo
- `/e/[slug]` — runtime interno; redireciona para `{slug}.mitzvah.pro` (exceto BarBeni/`beni`)
- `{slug}.mitzvah.pro` — site público de eventos **novos** do studio (local: `{slug}.localhost:3000`)
- `{slug}.mitzvah.pro/std` — abertura do email Save the Date
- `{slug}.mitzvah.pro/invite` — abertura do email convite
- `/en` `/admin` `/BarBeni/*` — **BarBeni legado** (inalterado; `beni.mitzvah.pro` redireciona para `/en`)
- `/api/contact` — POST formulário

## Deploy Vercel

1. Novo projeto a partir deste repo
2. Domínio `mitzvah.pro` **e** wildcard `*.mitzvah.pro`
3. `BAR_BENI_ORIGIN` = URL do projeto bar-beni
4. `NEXT_PUBLIC_SITE_HOST=mitzvah.pro`

Ver também `docs/FASE1-DEPLOY.md` no repo bar-beni.
