## Resumo
Implementar o control plane do **mitzvah-pro**: dashboard para criar/gerenciar eventos novos, usar o visual do BarBeni como template, e um Wizard self-serve.

Documento completo: `docs/MELHORIAS.md`

## Dois repositórios (não misturar)

| | **mitzvah-pro** (este repo) | **bar-beni** (outro repo) |
|--|-----------------------------|---------------------------|
| Landing | `https://mitzvah.pro/` `/en` `/pt` `/es` `/he` | — |
| Site do evento | `{slug}.mitzvah.pro` | `https://mitzvah.pro/BarBeni/en` |
| Painel | `https://mitzvah.pro/dashboard` | `https://mitzvah.pro/BarBeni/admin/dashboard` |

`https://mitzvah.pro/admin` **não existe**. Não é atalho para o BarBeni.

## Motivação
Hoje o `mitzvah-pro` é landing + studio + proxy `/BarBeni/*` para o app `bar-beni`. Cada evento **novo** ainda depende de customização manual no modelo boutique. Precisamos de self-serve na plataforma, sem alterar as URLs do evento Beni.

## Escopo

### 1. Dashboard (mitzvah-pro)
- Auth + organizações
- CRUD de eventos (draft / preview / published / archived)
- Ações: abrir wizard, preview, publish, arquivar, duplicar
- Path: `/dashboard` (nunca `/admin`)

### 2. Template inspirado no BarBeni
- Inventariar campos do repo `bar-beni` (código de referência, outro repositório)
- Schema + defaults + renderers config-driven **neste** repo
- Runtime multi-evento para eventos novos (`{slug}.mitzvah.pro`)
- O evento Beni continua no repo `bar-beni` em `/BarBeni/*`

### 3. Wizard self-serve
Steps (ajustar após inventário): basics → locales → branding → story → schedule → venues → media → saveTheDate → invitation → rsvp → faq → guestsBootstrap → domain → review
- Autosave, progresso, preview, publish
- Mesmo wizard para cliente e equipe boutique

## Fora de escopo (inicial)
- Page builder drag-and-drop
- Marketplace de templates
- App mobile
- Substituir `/BarBeni/admin/dashboard` pelo `/dashboard` da plataforma

## Fases
0. Descoberta / inventário do repo `bar-beni` / stack
1. Control plane (auth + CRUD) em `mitzvah-pro`
2. Template config-driven em `mitzvah-pro`
3. Wizard MVP + publish subdomain
4. Wizard completo + Signature domain + landing update
5. Endurecimento, E2E; o evento Beni permanece em `bar-beni` até migração explícita

## Critérios de aceite
- [ ] Criar evento autenticado no `/dashboard` (mitzvah-pro)
- [ ] Wizard cobre customizações do template
- [ ] Preview do draft
- [ ] Publish em `{slug}.mitzvah.pro`
- [ ] STD / convite / RSVP funcionando no publicado
- [ ] Isolamento multi-tenant
- [ ] Locales + hebraico RTL
- [ ] Sem regressão na landing (`/` `/en`) nem em `/BarBeni/en` e `/BarBeni/admin/dashboard`

## Decisões necessárias
- [ ] Auth provider
- [ ] Postgres + ORM
- [ ] Storage de mídia
- [ ] Monorepo vs multi-repo para o template
- [ ] Se/quando migrar o evento Beni para fora de `bar-beni`

## Referências
- `docs/MELHORIAS.md`
- `README.md` (tabela dos dois repositórios)
- `middleware.ts` (só `/BarBeni/*` aponta para `bar-beni`)
- Repo `bar-beni` + `docs/FASE1-DEPLOY.md` (nesse repo)
