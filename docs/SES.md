# Amazon SES (mitzvah.pro)

Envio via **Amazon SES** (`us-east-2`) com Resend como fallback (`EMAIL_PROVIDER=ses|resend`).

**Status da conta (nov/2026):** produção ativa — ~50.000/24h, ~14 msg/s, HEALTHY. O app ainda exige `EMAIL_SES_PRODUCTION=true` na Vercel; sem isso a fila fica no modo sandbox (1/s e 200/24h).

## Isolamento por evento (anti-spam / reputação)

No **publish** (e em “Verificar email”), o app provisiona por slug:

| Recurso | Nome |
|---------|------|
| Domínio de envio | `mail.{slug}.mitzvah.pro` → `convites@mail.{slug}.mitzvah.pro` |
| Configuration set | `mitzvah-{slug}` (métricas de reputação ON) |

1. Cria **configuration set** com `ReputationMetricsEnabled` e `SendingEnabled`
2. Cria identidade SES (Easy DKIM) e associa o configuration set
3. Grava DNS **DKIM** (+ **DMARC** se `DMARC_REPORT_EMAIL` estiver definido) na Vercel
4. Cada `SendEmail` passa `ConfigurationSetName`
5. Enquanto `pending`, o envio usa o fallback `EMAIL_FROM_ADDRESS`

**Pausar um evento:** `pauseEventSending(slug)` / `setEventSendingEnabled(slug, false)` em `lib/email/ses-config-set.ts` (desliga `SendingEnabled` no configuration set).

## IAM obrigatório

### Envio
- `ses:SendEmail`
- `ses:SendRawEmail`

### Provisionamento (publish / identity + config set)
- `ses:CreateEmailIdentity`
- `ses:GetEmailIdentity`
- `ses:TagResource`
- `ses:CreateConfigurationSet`
- `ses:GetConfigurationSet`
- `ses:PutConfigurationSetReputationOptions`
- `ses:PutConfigurationSetSendingOptions`
- `ses:PutEmailIdentityConfigurationSetAttributes`

Sem essas permissões o publish falha ou fica em `skipped`/`failed` e o envio cai no fallback compartilhado.

## Variáveis (Vercel Production)

Copiar as chaves de `mitzvah-ses-sender.env` e o `VERCEL_TOKEN` para o projeto Vercel:

```bash
EMAIL_PROVIDER=ses
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
EMAIL_FROM_ADDRESS=convites@mitzvah.pro
EMAIL_SES_PRODUCTION=true
DMARC_REPORT_EMAIL=dmarc@mitzvah.pro   # rua= no TXT _dmarc.mail.{slug}...
VERCEL_TOKEN=...
# Opcional — teto por processo/evento (default 2/s; conta SES pode ser ~14/s)
# EMAIL_SES_EVENT_MAX_PER_SECOND=2
# EMAIL_SES_MIN_INTERVAL_MS=500
```

### DNS gravado automaticamente
- **DKIM:** 3× CNAME `{token}._domainkey.mail.{slug}` → `{token}.dkim.amazonses.com`
- **DMARC:** TXT `_dmarc.mail.{slug}` com `rua=mailto:$DMARC_REPORT_EMAIL` (só se a var estiver definida)
- **SPF no subdomínio:** **não** é criado — o Return-Path/MAIL FROM do SES não usa SPF do `mail.{slug}`; SPF do apex `mitzvah.pro` continua a cargo da zona raiz (manual)

### Opcional (manual na zona raiz)
TXT `_dmarc.mitzvah.pro` → `v=DMARC1; p=none; rua=mailto:dmarc@mitzvah.pro` (ou o mesmo endereço de `DMARC_REPORT_EMAIL`).

## Reputação e limites

| Camada | O que o SES / provedores olham |
|--------|--------------------------------|
| **Conta SES** | Bounce/complaint rates da **conta** (thresholds AWS). Quotas da conta (ex.: 50k/24h, 14/s). |
| **Domínio / subdomínio** | Gmail, Microsoft, etc. avaliam reputação por **domínio de From** (e alinhamento DKIM/DMARC). Por isso cada evento usa `mail.{slug}.mitzvah.pro`. |
| **Configuration set** | Métricas de reputação **por evento** (`mitzvah-{slug}`) no console SES; permite pausar só aquele slug. |

### Ritmo no app (`lib/email/ses-limits.ts`)

| Modo | Condição | Ritmo | Cap 24h local |
|------|----------|-------|---------------|
| Sandbox | `EMAIL_SES_PRODUCTION` ≠ `true` | **1/s** | **200** |
| Produção | `EMAIL_SES_PRODUCTION=true` | **2/s** default (`EMAIL_SES_EVENT_MAX_PER_SECOND`) | sem teto local (AWS aplica a quota da conta) |

O teto de produção fica **abaixo** da taxa da conta de propósito: subdomínio novo de evento deve aquecer devagar. Não use 14/s por evento.

**Warm-up:** num subdomínio novo, não dispare milhares de convites de uma vez. Espalhe o primeiro lote ao longo de **várias horas**. Comece por convidados engajados; monitore bounce/complaint no configuration set antes de aumentar volume (pode subir `EMAIL_SES_EVENT_MAX_PER_SECOND` com cautela).

Throttling / destinatário rejeitado → status `deferred` (mensagem permanece na fila).

## Checklist pós-deploy

1. Secrets Vercel acima (incl. `EMAIL_SES_PRODUCTION=true`)
2. Merge / deploy do PR com configuration set + DMARC
3. Publicar evento de teste → conferir identidade `mail.{slug}.mitzvah.pro` verificada no SES e DNS Vercel
4. Enviar convite de teste e conferir From / DKIM

## Pendências (fora de escopo até pedido)

- Webhook SNS bounce/complaint + supressão
- Link de descadastro

Não afirme no formulário AWS que opt-out ou webhook SNS existem enquanto não estiverem no código.

## Referências

- [Easy DKIM](https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dkim-easy.html)
- [Configuration sets](https://docs.aws.amazon.com/ses/latest/dg/using-configuration-sets.html)
- [Request production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)
