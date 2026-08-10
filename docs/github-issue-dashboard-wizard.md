## Resumo
Implementar o control plane do Mitzvah.pro: dashboard para criar/gerenciar eventos, transformar o BarBeni em template reutilizável, e um Wizard self-serve etapa-a-etapa para customizar o site do evento.

Documento completo: `docs/MELHORIAS.md`

## Motivação
Hoje o `mitzvah-pro` é landing + proxy single-tenant para BarBeni. Cada evento novo depende de customização manual. Precisamos escalar com self-serve mantendo a qualidade do template Beni e o fluxo boutique assistido.

## Escopo

### 1. Dashboard
- Auth + organizações
- CRUD de eventos (draft / preview / published / archived)
- Ações: abrir wizard, preview, publish, arquivar, duplicar
- Path: `/dashboard` (não usar `/admin` — já reservado ao BarBeni)

### 2. Template BarBeni
- Inventariar campos do repo `bar-beni`
- Schema + defaults + renderers config-driven
- Runtime multi-evento (substituir origem única `BAR_BENI_ORIGIN` gradualmente)

### 3. Wizard self-serve
Steps (ajustar após inventário): basics → locales → branding → story → schedule → venues → media → saveTheDate → invitation → rsvp → faq → guestsBootstrap → domain → review
- Autosave, progresso, preview, publish
- Mesmo wizard para cliente e equipe boutique

## Fora de escopo (inicial)
- Page builder drag-and-drop
- Marketplace de templates
- App mobile

## Fases
0. Descoberta / inventário BarBeni / stack
1. Control plane (auth + CRUD)
2. Template config-driven
3. Wizard MVP + publish subdomain
4. Wizard completo + Signature domain + landing update
5. Endurecimento, E2E, migração Beni legado

## Critérios de aceite
- [ ] Criar evento autenticado no dashboard
- [ ] Wizard cobre customizações do template BarBeni
- [ ] Preview do draft
- [ ] Publish em `{slug}.mitzvah.pro`
- [ ] STD / convite / RSVP funcionando no publicado
- [ ] Isolamento multi-tenant
- [ ] Locales + hebraico RTL
- [ ] Sem regressão landing / Beni legado

## Decisões necessárias
- [ ] Auth provider
- [ ] Postgres + ORM
- [ ] Storage de mídia
- [ ] Monorepo vs multi-repo para o template
- [ ] Estratégia de migração do evento Beni atual

## Referências
- `docs/MELHORIAS.md`
- `middleware.ts` (rotas reservadas)
- README (Fase 1)
- Repo `bar-beni` + `docs/FASE1-DEPLOY.md`
