# Smoke — paridade BarBeni (mitzvah-pro)

Checklist rápido pós-deploy. **Não alterar** o proxy `/BarBeni` nem o app BarBeni.

Validação side-by-side e matriz inventário: [VALIDACAO-PARIDADE.md](./VALIDACAO-PARIDADE.md).  
E2E mínimo: `npm run test:e2e` (ver [e2e/README.md](../e2e/README.md)).

## Regressão BarBeni (inalterado)

- [ ] `https://mitzvah.pro/BarBeni` carrega o site legado
- [ ] `https://mitzvah.pro/BarBeni/en` locale EN ok
- [ ] `https://mitzvah.pro/BarBeni/admin/login` login admin legado ok
- [ ] Redirects conhecidos (`/en/invite`, etc.) continuam a funcionar

## Studio — create → publish → RSVP → cron

- [x] Login no dashboard mitzvah-pro *(código + e2e smoke)*
- [ ] Criar evento novo (wizard)
- [ ] Preencher steps mínimos (basics, story, schedule, invitation, domain, review)
- [ ] Publicar → site em `{slug}.mitzvah.pro` (ou apex path)
- [x] Importar ≥1 família / convidado com email *(código: CSV/XLSX import)*
- [x] Enviar Save the Date e/ou convite *(código: mail queue)*
- [ ] Abrir link com token → envelope / cartão
- [x] RSVP por token (`/rsvp/[token]` ou site com cookie) confirma sim/não *(código: rotas token)*
- [x] Cron de lembretes (`/api/cron/reminders`) corre sem erro (header/secret ok) *(código: rota presente; secret em prod = manual)*
- [x] Painel pós-publish: `Dashboard → Editar seção` guarda via PATCH *(código + e2e smoke)*

## i18n / envelope (P2)

- [x] Story: abas de locale gravam `contentI18n[locale]` com fallback a `story.*` *(código)*
- [ ] Site com `?lang=` / path locale mostra overlay quando definido
- [x] STD / Invitation: secção colapsável **Design do envelope** edita `design.*` *(código)*

## Coming-soon / Excel / Photos / design

- [x] Gate `legal.comingSoon` no site + rota `/e/[slug]/coming-soon` + mensagem
- [x] Export/import Excel convidados *(código)*
- [x] Design do envelope expandido (`pageTexture`, tipografia, CTAs, paleta…)
- [x] Google Fotos import opcional no step Mídia (`GOOGLE_PHOTOS_API_KEY`)
- [x] Dual-write `guests` (pessoas) além de `families` / `platform_store`

## Não fazer neste smoke

- Não editar middleware paths do BarBeni
- Não migrar dados do Beni
- Não partilhar pacote `event-cards` com o repo BarBeni
