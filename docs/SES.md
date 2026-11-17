# Amazon SES (mitzvah.pro)

Envio via **Amazon SES** (`us-east-2`) com Resend como fallback (`EMAIL_PROVIDER=ses|resend`).

## Isolamento por evento (anti-spam / reputação)

No **publish** (e em “Verificar email”), o app provisiona um domínio de envio por slug:

`mail.{slug}.mitzvah.pro` → From `convites@mail.{slug}.mitzvah.pro`

1. Cria identidade SES (Easy DKIM) se ainda não existir  
2. Grava CNAME DKIM + TXT SPF/DMARC na zona Vercel (`VERCEL_TOKEN`)  
3. Consulta verificação; enquanto `pending`, o envio usa o fallback `EMAIL_FROM_ADDRESS`

Assim a reputação de um evento não mistura com a dos outros.

## Variáveis

```bash
EMAIL_PROVIDER=ses
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
EMAIL_FROM_ADDRESS=convites@mitzvah.pro   # fallback enquanto o domínio do evento não verifica
VERCEL_TOKEN=...                          # DNS do mail.{slug}
# EMAIL_SES_PRODUCTION=true               # só após sair do sandbox
```

### IAM

- **Envio:** `ses:SendEmail`, `ses:SendRawEmail`
- **Provisionamento (publish):** também `ses:CreateEmailIdentity`, `ses:GetEmailIdentity`

## Sandbox

Enquanto `EMAIL_SES_PRODUCTION` ≠ `true`: máx. **1/s** e **200/24h**. Throttling / destinatário não verificado → status `deferred` (mensagem permanece na fila).

## Pendências (fora de escopo até pedido)

- Pedido de produção SES
- Webhook SNS bounce/complaint + supressão
- Link de descadastro

Não afirme no formulário AWS que opt-out ou webhook SNS existem enquanto não estiverem no código.

## Referências

- [Easy DKIM](https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dkim-easy.html)
- [Request production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)
