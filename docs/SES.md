# Amazon SES (mitzvah.pro)

Envio de email via **Amazon SES** na região **`us-east-2`**, com Resend como fallback (`EMAIL_PROVIDER=ses|resend`).

O código usa o **modo domínio compartilhado**: um único domínio/endereço verificado no SES (`SES_FROM_EMAIL`), nome de exibição por evento e **Reply-To** do anfitrião. Não cria identidades SES nem altera DNS automaticamente.

## Variáveis de ambiente

```bash
EMAIL_PROVIDER=ses
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
SES_FROM_EMAIL=convites@mitzvah.pro
```

Credenciais: perfil IAM com permissão mínima `ses:SendEmail`, `ses:SendRawEmail`, `ses:GetEmailIdentity` (e `ses:CreateEmailIdentity` só se for criar identidades à mão).

## Passos manuais (obrigatórios)

### 1. Sair do sandbox do SES

Contas novas ficam em **sandbox**: só enviam para endereços verificados.

1. Console AWS → SES → região `us-east-2`
2. Account dashboard → **Request production access**
3. Descreva o caso de uso (convites de eventos, confirmações RSVP, lembretes)
4. Aguarde aprovação

Até lá, teste só com destinatários verificados.

### 2. Verificar o domínio (identidade)

1. SES → **Identities** → Create identity → **Domain** (ex.: `mitzvah.pro`)
2. Ative **Easy DKIM** (RSA 2048)
3. Anote os registros DNS (CNAME DKIM). O app também lista sugestões em `GET /api/platform/email-setup` (`sesDnsRecords`) quando as credenciais AWS estão configuradas — **só consulta**, não grava DNS.

### 3. SPF / DKIM / DMARC no DNS (Vercel)

Na zona `mitzvah.pro` (Vercel DNS), adicione **manualmente** (não rode scripts de DNS sem revisão):

| Tipo | Nome | Valor (exemplo) |
|------|------|-----------------|
| CNAME | `{token}._domainkey` | `{token}.dkim.amazonses.com` (3 tokens do Easy DKIM) |
| TXT | `@` ou host usado no From | `v=spf1 include:amazonses.com ~all` (mesclar com SPF existente) |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@mitzvah.pro` (endureça `p=` depois) |

Depois: SES → identity → confirme **Verified** / DKIM **Successful**.

Defina `SES_FROM_EMAIL` com um endereço nesse domínio (ex. `convites@mitzvah.pro`).

### 4. Bounces e reclamações (SNS)

1. Crie tópicos SNS (ex. `ses-bounces`, `ses-complaints`) em `us-east-2`
2. SES → Configuration sets (recomendado) **ou** Identity → Notifications
3. Publique **Bounce** e **Complaint** nos tópicos
4. Assine o tópico com HTTPS endpoint ou email da equipe; processe/suprimir destinatários inválidos

Sem isto, a reputação do domínio cai e o SES pode pausar o envio.

### 5. Configuração no deploy

1. Defina as variáveis acima na Vercel (sem commitar segredos)
2. `EMAIL_PROVIDER=ses`
3. Opcional: mantenha `RESEND_API_KEY` + `RESEND_FROM_EMAIL` como fallback
4. Publique um evento e use “Reparar domínio de email” / envio de teste — o provisionamento SES só **consulta** o status da identidade compartilhada

## Comportamento no app

| Situação | Comportamento |
|----------|----------------|
| `EMAIL_PROVIDER=ses` + AWS + `SES_FROM_EMAIL` | Envia via SESv2; From com display name do evento; Reply-To do contato/anfitrião |
| SES forçado mas AWS incompleto + Resend ok | Fallback automático para Resend |
| `EMAIL_PROVIDER=resend` | Isolamento legado `mail.{slug}.mitzvah.pro` via Resend + Vercel DNS |
| Sem provedor | Marca envio local / fila `queued` (como antes) |

O campo `email_logs.resend_id` guarda o **message id** genérico (SES `MessageId` ou id Resend).

## Pendências operacionais

- [ ] Pedir produção (sair do sandbox)
- [ ] Criar/verificar identidade de domínio no SES `us-east-2`
- [ ] Publicar SPF/DKIM/DMARC no DNS (revisão humana)
- [ ] Ligar SNS para bounces/complaints + processo de supressão
- [ ] Preencher secrets na Vercel e validar `/api/platform/email-setup`
- [ ] Enviar email de teste real após produção

## Referências

- [Request production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)
- [DKIM](https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dkim.html)
- [SPF](https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-spf.html)
- [Event notifications (SNS)](https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html)
