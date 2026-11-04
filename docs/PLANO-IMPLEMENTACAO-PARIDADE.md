# Plano de implementação — Paridade BarBeni no Mitzvah Pro

Derivado do inventário estático em [`PARIDADE-BARBENI.md`](./PARIDADE-BARBENI.md) (BarBeni@`2e754ab` × mitzvah-pro@`fa53897`).

## Restrições (não negociáveis)

1. **BarBeni intocado** — zero commits, deploys, refactors ou pacotes compartilhados no app em produção. Proxy `/BarBeni/*` + `BAR_BENI_ORIGIN` permanecem.
2. **Só `mitzvah-pro` muda** — copiar ideias/código de referência; não extrair monorepo compartilhado com o Beni.
3. **4 idiomas por evento** (`en`/`pt`/`es`/`he`) com RTL no hebraico (site, RSVP, envelopes, e-mails).
4. **Validação de paridade** = evento de teste recriado + comparação read-only com Beni em produção. Sem importar o banco do Beni.
5. Manter diferenciais do studio: multi-tenant, subdomínio, domínio custom, e-mail isolado por evento, prazo/+1 no RSVP (L18), aprovação boutique.

## Tese arquitetural (do relatório §6.1)

Paridade **não** se resolve ampliando só o `EventConfig` JSON.

| Camada | Onde vive | Exemplos |
|--------|-----------|----------|
| Config / design | `events.config` JSONB (versionável) | tema, ~100 chaves STD/convite, SEO, flags |
| Operacional | Tabelas relacionais com `event_id` | families, guests (pessoas), schedule, gallery, email_logs, rate_limits |
| Mídia | Vercel Blob (ou equivalente) + `assets` | hero, galeria, vídeo, selo — **não** data-URL no JSON |

Pré-requisito explícito: sair de `platform_store` monolítico (L14) antes de RSVP concorrente, logs, cron e galerias reais.

---

## Ordem de execução

```
Hotfix L2 (proteger RSVP)     ── paralelo, imediato
        │
Fase 0 Fundação (relacional+Blob+CI)
        │
Fase 1 Famílias / pessoas / import-export / QR
        │
Fase 2 Rotas token + RSVP + cookie + notificações base
        │
Fase 3 E-mails ricos + fila + tracking + cron lembretes
        │
Fase 4 Envelope animado (packages/event-cards interno)
        │
Fase 5 Site completo + i18n por campo
        │
Fase 6 Wizard completo + painel pós-publicação
        │
Fase 7 Validação de paridade (read-only vs Beni)
```

Dependência dura: **0 → 1 → 2**. Fases 3–5 podem paralelizar parcialmente após 2. Fase 4 pode começar após 2 (precisa token pages) em paralelo com 3.

---

## Hotfix imediato (P0 #4 — independente)

| Item | Trabalho | Aceite |
|------|----------|--------|
| H1 | Desligar ou proteger `POST .../guests` `fromPublic` | Sem token válido (ou open-RSVP explícito + Turnstile/captcha) → 403/429 |
| H2 | Rate limit em login + RSVP | Tabela/`rsvp_rate_limits` ou Upstash; limites alinhados ao Beni (5/h fechado, 60/h open) |
| H3 | Exigir secrets em prod | Boot falha sem `DASHBOARD_PASSWORD` / `DASHBOARD_SECRET` / owner password |

Entregar como PR pequeno **antes ou em paralelo** à Fase 0.

---

## Fase 0 — Fundação (storage + qualidade)

**Fecha:** L14, base de L15, prepara tudo.

| # | Entrega |
|---|---------|
| 0.1 | Schema SQL: `orgs`, `users`, `events`, `families`, `guests` (pessoas), `schedule_items`, `family_schedule_items`, `hotels`, `faqs`, `things_to_do`, `gallery_items`, `email_logs`, `rsvp_rate_limits`, `assets` |
| 0.2 | Script idempotente `platform_store` JSON → tabelas (backup JSON mantido na transição) |
| 0.3 | Camada de acesso (Drizzle ou SQL cru) sempre com `event_id` + checagem `org_id` |
| 0.4 | Upload → Blob; remover data-URL do caminho feliz do wizard (limite 1,5 MB deixa de ser o modelo) |
| 0.5 | Testes de base (migrate, tokens, auth isolation) + CI |
| 0.6 | Rate limit infra reutilizável (login/RSVP/contato) |

**Aceite:** criar evento, listar, publish e RSVP (mesmo o fluxo atual) sem lost update sob 2 lambdas concorrentes; imagens em Blob.

**Não fazer nesta fase:** UI nova de envelope; não tocar BarBeni.

---

## Fase 1 — Convidados no padrão BarBeni

**Fecha:** L3, parte de L1/L16, P0 #2, P1 #8.

| # | Entrega |
|---|---------|
| 1.1 | Modelo `Family` (token 12 chars global, `emails[]`, `invite_locale`, `schedule_invite_mode`, `open_rsvp`, notes, sent/opened timestamps) |
| 1.2 | Modelo `Guest` = pessoa (`adult`/`child`, meal, dietary, rsvp individual) ligada à família |
| 1.3 | Migração dos `Guest` planos atuais → família + 1 pessoa adult |
| 1.4 | Dashboard: busca, filtros (RSVP, STD/invite sent, opened), ordenação, métricas adultos/crianças |
| 1.5 | Import Excel/CSV com **preview**, colunas `family_name, email, guest_name, type, notes, language`, dedupe |
| 1.6 | Export XLSX (convidados + RSVPs) |
| 1.7 | QR PNG do link da família (`/api/.../qr/[token]`) |
| 1.8 | Ligar famílias a subset de `schedule_items` |

**Aceite:** operador importa lista mista, edita família com 2 e-mails + 3 pessoas, copia link tokenizado, vê métricas por tipo.

---

## Fase 2 — Páginas por token + RSVP

**Fecha:** L1, L2 (completo), L8 (i18n RSVP), parte de L6/L13 status.

| # | Entrega |
|---|---------|
| 2.1 | Rotas no host do evento: `/card/[token]`, `/std/[token]`, `/rsvp/[token]`; `/invite/[token]` → `/card/` |
| 2.2 | Middleware/cookie: `?token=` ou path → cookie de convidado reutilizado no site |
| 2.3 | Resolver família por token **global** (não só por slug/host) |
| 2.4 | RSVP por pessoa + update; open-RSVP controlado; validação Zod; cross-family check |
| 2.5 | Confirmação por e-mail a todos os e-mails da família |
| 2.6 | Notificação ao admin (instant no mínimo; digest na fase 3) |
| 2.7 | Bloco “meu RSVP” na home quando há cookie/token |
| 2.8 | Calendar API por token: Google + Outlook + `.ics` com data/hora/local (fecha L17 parcial) |

**Aceite:** link do e-mail abre card/RSVP personalizado; editar RSVP funciona; anônimo sem open-RSVP não cria guests.

**Nota:** cartões podem ser **placeholder estático** até a Fase 4; o importante é a rota + token + RSVP.

---

## Fase 3 — E-mails e automação

**Fecha:** L4, L5, L6, P1 #5–7.

| # | Entrega |
|---|---------|
| 3.1 | Templates HTML ricos (selo/fonte/calendário/mapa), escape HTML; idioma = `invite_locale` (4 locales + RTL) |
| 3.2 | Pixel de abertura `/api/invite/open/[token]`, `/api/std/open/[token]` → `invitation_opened_at` / `std_opened_at` |
| 3.3 | Fila de envio (QStash/Inngest/Vercel Queues), lotes 25–50, retry, progresso por polling |
| 3.4 | `email_logs` + webhook Resend (delivered/bounced/complained) |
| 3.5 | Envio individual/massa com filtros e `skipIfSent`; teste de envio no dashboard |
| 3.6 | Cron multi-evento `/api/cron/reminders`: 30d / 7d / 2d (7d e 2d só confirmados) + digest admin |
| 3.7 | Manter remetente `mail.{slug}.mitzvah.pro` |

**Aceite:** lista de 200 famílias envia sem estourar `maxDuration`; logs auditáveis; lembrete dispara em evento de teste com data ajustada.

---

## Fase 4 — Motor de cartões (envelope)

**Fecha:** L7, P2 #9. **Só código dentro de mitzvah-pro** (copiar referência do Beni; não partilhar pacote).

| # | Entrega |
|---|---------|
| 4.1 | `packages/event-cards` (ou `lib/event-cards`): CSS/JS envelope **sem** `basePath` do Beni; `window.ENVELOPE_CONFIG` |
| 4.2 | Tipagem `StdConfig` / `InviteCardConfig` (~100 chaves) no `events.config` |
| 4.3 | Páginas `/card` e `/std` usam o motor; preview no wizard; RTL he |
| 4.4 | Processamento de selo (sharp) + texturas |
| 4.5 | Wizard steps `saveTheDate` / `invitation` expostos com preview ao vivo + envio de teste |

**Aceite:** preview do wizard ≈ página pública do token; PT/EN/ES/HE renderizam; hebraico com `dir=rtl` legível.

---

## Fase 5 — Site completo + i18n de conteúdo

**Fecha:** L9–L13, L17, P2 #10–11.

| # | Entrega |
|---|---------|
| 5.1 | Helper `t(field, locale)` + campos `{ en, pt, es, he }` com fallback |
| 5.2 | Schedule rico (data, início/fim, mapa, dress/notas i18n) + filtro por família/`schedule_invite_mode` |
| 5.3 | Hotéis (foto, estrelas, destaque, reserva), FAQ (publicado/oculto), places (6 cats + foto) |
| 5.4 | Galeria: foto/vídeo, lightbox, legenda i18n, aprovação, `show_on_site`, ordem; import Google Fotos (opcional se credenciais) |
| 5.5 | Contato multi WhatsApp `Nome|link` + formulário → Resend |
| 5.6 | Áudio ambiente (upload + toggle) |
| 5.7 | Privacy / Terms / coming-soon |
| 5.8 | Calendar menu completo na UI do site |

**Aceite:** checklist da matriz §5 do relatório sem ❌ nas linhas de Site (exceto polish fino).

---

## Fase 6 — Wizard + painel pós-publicação

**Fecha:** §6.5 do relatório; P3 parcial.

| # | Entrega |
|---|---------|
| 6.1 | Novos/estendidos steps: locales, places, contact, reminders, legal; schedule/venues/media/rsvp/STD/invite conforme tabela do relatório |
| 6.2 | Abas por idioma em cada passo + “traduzir a partir do padrão” (API de tradução = opcional) |
| 6.3 | Criador de evento: em branco / clonar / modelo BarBeni; token vs open-RSVP; checklist pós-criação |
| 6.4 | Painel pós-publicação por seção (reusa forms do wizard), save granular, aviso unsaved |
| 6.5 | Review checklist de paridade (selo, teste e-mail, ≥1 família, cron, domínio mail verificado) |

---

## Fase 7 — Validação de paridade

**Fecha:** critério de aceite #2 do `MELHORIAS.md` (paridade), **sem** migrar Beni.

| # | Entrega |
|---|---------|
| 7.1 | Evento-teste “Beni-like” recriado manualmente no studio (conteúdo fictício ou sanitizado) |
| 7.2 | Matriz §5 reavaliada item a item (atualizar status no relatório) |
| 7.3 | Comparação visual/funcional read-only com `https://mitzvah.pro/BarBeni/en` |
| 7.4 | E2E: criar → wizard → publish → import famílias → enviar → RSVP token → lembrete |
| 7.5 | Smoke regressão Beni: `/BarBeni/en`, `/BarBeni/admin/login`, redirects `/en/invite` |

---

## Fatias de PR sugeridas (só mitzvah-pro)

| PR | Conteúdo |
|----|----------|
| PR-H | Hotfix RSVP + rate limit login |
| PR0a | Schema SQL + migrate script (dual-read JSON) |
| PR0b | Blob assets + CI/testes base |
| PR1a | Families/guests model + API + migrate guests |
| PR1b | Dashboard filtros/métricas/import preview/export/QR |
| PR2a | Rotas token + cookie + RSVP API |
| PR2b | Confirmação e-mail + notificação instant + calendar API |
| PR3a | Templates ricos + tracking pixel + email_logs |
| PR3b | Fila de envio + progresso UI |
| PR3c | Cron reminders + digest |
| PR4a | Pacote event-cards + páginas card/std |
| PR4b | Wizard STD/invite ~100 campos + preview |
| PR5a | i18n por campo + schedule/hotels/places/faq ricos |
| PR5b | Galeria + contato form + áudio + legal |
| PR6 | Wizard steps restantes + painel pós-publish |
| PR7 | E2E + atualização da matriz no relatório |

Cada PR: sem mudança em `BAR_BENI_ORIGIN` além do necessário para **não** regressar o proxy; diff não inclui o repo bar-beni.

---

## Mapeamento limitações → fase

| Limitação | Fase |
|-----------|------|
| L14 storage JSON | 0 |
| L15 testes/secrets | 0 + H |
| L2 RSVP aberto | H + 2 |
| L3 guest plano | 1 |
| L1 sem rotas token | 2 |
| L8 RSVP PT hardcoded | 2 |
| L4/L5/L6 e-mail | 3 |
| L7 envelope | 4 |
| L9–L13, L17 site | 5 |
| L16 métricas/export/QR/log | 1 + 3 |
| L18 prazo/+1 | manter (diferencial) |

---

## Critérios de “paridade alcançada”

1. Backlog P0 e P1 do relatório §7 concluídos.
2. Matriz §5 sem ❌ em Convidados, RSVP, E-mail (operacional); P2 Site/Cartões podem fechar em seguida.
3. Checklist E2E da Fase 7 verde.
4. Smoke BarBeni produção inalterado.
5. `MELHORIAS.md` critério de aceite #2 marcado feito **só** após Fase 7.

---

## Explicitamente fora de escopo

- Qualquer alteração no repo/deploy BarBeni (incl. README/TechSpec desse repo, até haver manutenção separada).
- Migrar dados reais do evento Beni para o studio.
- Publicar pacote npm compartilhado consumido pelo Beni.
- Editor visual drag-and-drop.
- Remover diferenciais do mitzvah-pro (temas, multi-tenant, DNS, prazo/+1).
