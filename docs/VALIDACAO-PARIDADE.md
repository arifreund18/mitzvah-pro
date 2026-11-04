# Validação side-by-side — paridade BarBeni

## Restrição (obrigatória)

- O app **Bar-Beni** e o proxy `/BarBeni` são **read-only / intocados** neste trabalho.
- Não alterar `middleware` paths do BarBeni, `BAR_BENI_ORIGIN`, nem qualquer coisa sob `bar-beni`.
- Não migrar dados do Beni nem partilhar pacotes com o repo legado.
- Validação visual compara o evento mitzvah-pro com `https://mitzvah.pro/BarBeni/en` **sem** alterar Beni.

Ver também: [SMOKE-PARIDADE.md](./SMOKE-PARIDADE.md).

## Matriz checklist × inventário

| Área | Inventário (BarBeni) | Estado no mitzvah-pro | Validação |
| --- | --- | --- | --- |
| **Convidados** | Lista famílias / convidados, import | Código: painel Convidados, CSV/XLSX import+export | Manual: importar ≥1 família e conferir stats |
| **RSVP token** | Link com token → confirma sim/não | Código: `/e/[slug]/rsvp/[token]`, API RSVP | Manual: abrir token e confirmar |
| **E-mail fila** | Envio STD/convite em lote | Código: mail queue (`send` / `process` / `status`) | Manual: enfileirar envio (Resend opcional em local) |
| **Envelope design** | ~100 chaves STD/convite | Código: `CardDesign` expandido + `CardDesignFields` (pageTexture, tipografia, CTAs, etc.) | Side-by-side visual vs BarBeni EN |
| **Site i18n** | Conteúdo por campo / locale | Código: `contentI18n` story + schedule/faq/hotels/places/legal/card overlays | Manual: trocar `?lang=` no site |
| **Coming-soon** | Página “em breve” | Código: `legal.comingSoon` gate no `EventSite` + `/e/[slug]/coming-soon` | Manual: ativar flag e abrir site |
| **Google Fotos** | Import álbum → galeria | Código: API `media/google-photos` (opcional via `GOOGLE_PHOTOS_API_KEY`) | Manual se houver credenciais |
| **Dual-write guests** | Pessoas em tabela relacional | Código: sync `families` + linhas `guests` no Postgres | Manual com `DATABASE_URL` |
| **Excel** | Import/export XLSX | Código: `xlsx-guests` + rotas guests import/export | Manual: round-trip XLSX |
| **Cron** | Lembretes D-30 / D-7 / D-2 | Código: `/api/cron/reminders` | Manual: chamar com secret e ver 200 |

Legenda: **Código** = implementado no repo; **Manual** = ainda precisa de verificação humana / ambiente (DNS, Resend, produção).

## Procedimento side-by-side

1. Publicar (ou usar seed) um evento no studio mitzvah-pro.
2. Abrir o site do evento (`{slug}.mitzvah.pro` ou path local `/e/{slug}`).
3. Em paralelo, abrir `https://mitzvah.pro/BarBeni/en` (somente leitura).
4. Comparar visualmente: hero/story, schedule, envelope/card, RSVP, locales.
5. No dashboard: Convidados, envio de email, Editar seção, export XLSX.
6. **Não** editar middleware, proxy, nem o deploy BarBeni.

## O que é automático vs manual

| Automático (código / CI local) | Ainda manual |
| --- | --- |
| Unit tests (`npm test`) | Visual vs BarBeni EN |
| E2E smoke login → Eventos → Editar seção (`npm run test:e2e`) | RSVP real com email entregue |
| Rotas e APIs de guests / mail queue / cron / XLSX / coming-soon | Cron em produção com secret |
| Wizard fields envelope + i18n | Aprovação de paridade 1:1 de copy/mídia |
