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
4. Crie um evento → o wizard abre com o site atualizando à direita a cada campo
5. Publique → o site fica em `/e/seu-slug`

Há um evento semente publicado em `/e/beni`. Os dados ficam em `data/platform.json` (gitignored).

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

## Rotas

- `/` — landing EN
- `/pt` `/es` `/he` — landing
- `/dashboard` — studio (login em `/dashboard/login`)
- `/dashboard/events/[id]/wizard` — wizard com preview ao vivo
- `/e/[slug]` — site publicado do evento
- `/api/contact` — POST formulário
- `/BarBeni/*` — rewrite para `BAR_BENI_ORIGIN` (evento Beni legado)

## Deploy Vercel

1. Novo projeto a partir deste repo
2. Domínio `mitzvah.pro`
3. `BAR_BENI_ORIGIN` = URL do projeto bar-beni

Ver também `docs/FASE1-DEPLOY.md` no repo bar-beni.
