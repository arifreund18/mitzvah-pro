# Smoke — paridade BarBeni (mitzvah-pro)

Checklist rápido pós-deploy. **Não alterar** o proxy `/BarBeni` nem o app BarBeni.

## Regressão BarBeni (inalterado)

- [ ] `https://mitzvah.pro/BarBeni` carrega o site legado
- [ ] `https://mitzvah.pro/BarBeni/en` locale EN ok
- [ ] `https://mitzvah.pro/BarBeni/admin/login` login admin legado ok
- [ ] Redirects conhecidos (`/en/invite`, etc.) continuam a funcionar

## Studio — create → publish → RSVP → cron

- [ ] Login no dashboard mitzvah-pro
- [ ] Criar evento novo (wizard)
- [ ] Preencher steps mínimos (basics, story, schedule, invitation, domain, review)
- [ ] Publicar → site em `{slug}.mitzvah.pro` (ou apex path)
- [ ] Importar ≥1 família / convidado com email
- [ ] Enviar Save the Date e/ou convite
- [ ] Abrir link com token → envelope / cartão
- [ ] RSVP por token (`/rsvp/[token]` ou site com cookie) confirma sim/não
- [ ] Cron de lembretes (`/api/cron/reminders`) corre sem erro (header/secret ok)
- [ ] Painel pós-publish: `Dashboard → Editar seção` guarda via PATCH

## i18n / envelope (P2)

- [ ] Story: abas de locale gravam `contentI18n[locale]` com fallback a `story.*`
- [ ] Site com `?lang=` / path locale mostra overlay quando definido
- [ ] STD / Invitation: secção colapsável **Design do envelope** edita `design.*`

## Não fazer neste smoke

- Não editar middleware paths do BarBeni
- Não migrar dados do Beni
- Não partilhar pacote `event-cards` com o repo BarBeni
