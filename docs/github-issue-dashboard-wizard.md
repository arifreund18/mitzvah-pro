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
- [x] Auth de studio + CRUD de eventos (draft / published / archived) + duplicar
- [x] Ações: abrir wizard, publish, arquivar
- [ ] Organizações e papéis
- Path: `/dashboard` (nunca `/admin`)

### 2. Template inspirado no BarBeni
- [x] Schema + defaults + renderers config-driven **neste** repo
- [x] Runtime multi-evento para eventos novos (`{slug}.mitzvah.pro`)
- [ ] Inventariar campos do repo `bar-beni` (paridade 1:1)
- O evento Beni continua no repo `bar-beni` em `/BarBeni/*`

### 3. Wizard self-serve
- [x] Steps: basics → locales → branding → story → schedule → venues → media → saveTheDate → invitation → rsvp → faq → guestsBootstrap → domain → review
- [x] Autosave, progresso, preview no wizard, publish
- [ ] Import CSV; fluxo boutique (cliente só aprova); preview público do rascunho

## Fora de escopo (inicial)
- Page builder drag-and-drop
- Marketplace de templates
- App mobile
- Substituir `/BarBeni/admin/dashboard` pelo `/dashboard` da plataforma

## Fases
0. Descoberta / inventário do repo `bar-beni` / stack — **pendente**
1. Control plane (auth + CRUD) em `mitzvah-pro` — **feito** (falta orgs + DB)
2. Template config-driven em `mitzvah-pro` — **feito** (falta paridade 1:1)
3. Wizard MVP + publish subdomain — **feito**
4. Wizard completo + Signature domain + landing update — **parcial**
5. Endurecimento, E2E; o evento Beni permanece em `bar-beni` até migração explícita — **pendente**

## Critérios de aceite
- [x] Criar evento autenticado no `/dashboard` (mitzvah-pro)
- [ ] Wizard cobre customizações do template (paridade BarBeni)
- [x] Preview do draft (no wizard)
- [x] Publish em `{slug}.mitzvah.pro`
- [x] STD / convite / RSVP funcionando no publicado
- [ ] Isolamento multi-tenant
- [x] Locales + hebraico RTL (chrome; conteúdo do evento ainda único)
- [x] Sem regressão na landing (`/` `/en`) nem em `/BarBeni/en` e `/BarBeni/admin/dashboard`

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
