# Amazon SES (mitzvah.pro)

Envio via **Amazon SES** (`us-east-2`) com Resend como fallback (`EMAIL_PROVIDER=ses|resend`).

**Remetente único:** `EMAIL_FROM_ADDRESS` (default `convites@mitzvah.pro`), nome de exibição por evento e **Reply-To** do anfitrião. Não há domínio `mail.{slug}` nem gravação de DNS de e-mail na Vercel.

## Variáveis de ambiente

```bash
EMAIL_PROVIDER=ses
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
EMAIL_FROM_ADDRESS=convites@mitzvah.pro
# EMAIL_SES_PRODUCTION=true   # só após sair do sandbox
```

IAM de envio: `ses:SendEmail`, `ses:SendRawEmail` (opcional `ses:GetEmailIdentity` para o probe).

## Sandbox

Enquanto `EMAIL_SES_PRODUCTION` ≠ `true`, o app limita envios a **1/s** e **200/24h**. Throttling, quota diária e destinatário não verificado marcam a mensagem como `deferred` e **não a descartam** da fila (`retryDeferred` no process).

## Passos manuais

1. Identidade de domínio `mitzvah.pro` verificada com DKIM (já feita na conta)
2. Pedido de produção SES (rascunho honesto — não afirmar opt-out nem webhook SNS enquanto não existirem)
3. Opcional depois: SNS bounce/complaint + webhook; link de descadastro

## Comportamento

| Situação | Comportamento |
|----------|----------------|
| `EMAIL_PROVIDER=ses` + AWS | SESv2; From `Nome do evento <convites@mitzvah.pro>`; Reply-To anfitrião |
| SES indisponível + Resend | Fallback se `RESEND_API_KEY` + `RESEND_FROM_EMAIL` |
| `EMAIL_PROVIDER=resend` | Só Resend com `RESEND_FROM_EMAIL` (sem provisionar DNS) |

`email_logs.resend_id` (coluna legada) guarda o **messageId** genérico; a API TypeScript expõe `messageId` (e `resendId` como alias).

## Pendências (fora de escopo até pedido explícito)

- [ ] Pedido de produção SES (sandbox)
- [ ] Webhook SNS bounce/complaint + supressão
- [ ] Link de descadastro nos e-mails
- [ ] Secrets na Vercel + teste real (só com OK)

## Referências

- [Request production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)
- [DKIM](https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dkim.html)
