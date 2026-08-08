# Mitzvah.pro — plataforma

Landing comercial e proxy para sites de eventos.

## Scripts

```bash
npm install --legacy-peer-deps
npm run dev      # http://localhost:3000
npm run build
```

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `BAR_BENI_ORIGIN` | Sim (prod) | URL do deploy bar-beni, sem barra final |
| `RESEND_API_KEY` | Sim (contato) | API Resend |
| `RESEND_FROM_EMAIL` | Sim (contato) | Remetente verificado |
| `MITZVAH_CONTACT_EMAIL` | Não | Exibido na página (default `mitzvah@mitzvah.pro`) |
| `MITZVAH_CONTACT_FORWARD_TO` | Não | Destino dos emails do form |

## Rotas

- `/` — landing EN
- `/pt` — landing PT
- `/api/contact` — POST formulário
- `/BarBeni/*` — rewrite para `BAR_BENI_ORIGIN` (evento Beni)

## Deploy Vercel

1. Novo projeto a partir deste repo
2. Domínio `mitzvah.pro`
3. `BAR_BENI_ORIGIN` = URL do projeto bar-beni

Ver também `docs/FASE1-DEPLOY.md` no repo bar-beni.
