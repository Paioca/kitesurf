# Runbook — diagnóstico e realinhamento de migrations em PROD

Objetivo: garantir que o histórico do Prisma Migrate bate com o estado real do banco de
**produção**, para que migrations futuras (T5 e drops) apliquem com `migrate deploy` sem surpresa.

> **Quem executa:** o dono. O agente diagnosticou e ensaiou em **staging**; prod é este runbook.
> **Pré-requisitos:** backup do Supabase de prod confirmado (débito #4) + regra "uma feature com
> mudança de banco por vez" respeitada.

## Fatos do diagnóstico (staging — ref otuqhjatkdtmazvfnjrw)

Estado apurado em 2026-07-04, **antes** de qualquer ação em prod:

- Staging estava **2 migrations atrás** do histórico: `20260628202806_notification_listing_sold`
  (enum `NotificationType ADD VALUE 'listing_sold'`) e `20260629120000_user_unlimited_listings`
  (coluna `User.unlimitedListings BOOLEAN NOT NULL DEFAULT false`). **Ambas puramente aditivas.**
- `migrate diff` confirmou que as mudanças estavam **genuinamente ausentes** do banco (não era
  drift oculto) → `migrate deploy` limpo. Ensaiado em staging: aplicou as 2, `migrate status` =
  **"up to date"**, `migrate diff` vazio.
- Migrations do episódio antigo (Sprint 0/1: moderation_actions, negociacao_v2, ratehit,
  audit_event_job_run) estão **todas aplicadas** em staging, com tabelas/colunas presentes.
- O CI `scripts/check-migration-drift.sh` é um gate **só de git** (barra PR que muda
  `schema.prisma` sem migration nova) — **não** checa o estado do banco. O alinhamento
  história↔banco de prod é o que este runbook cobre.

**Conclusão:** staging não tinha drift, só atraso. Prod pode estar em qualquer um de três
estados (abaixo). Não presuma — diagnostique.

## Regras de conexão

- Use a `DIRECT_URL` (porta **5432**, conexão direta), **nunca** o pooler pgbouncer (6543):
  `migrate` e advisory locks quebram em transaction-mode.
- PROD = Supabase ref **`oycxkofylcofvvditjeg`**. Carregue o ambiente de prod num arquivo
  temporário (`vercel env pull`) e **apague-o depois** — não recrie um `.env.prod` fixo.

## 0. Carregar env de prod (temporário)

```bash
cd apps/web
vercel env pull .env.prod.tmp --environment=production   # ou copie do painel Vercel
# garanta que DATABASE_URL do script/migrate use a conexão DIRETA (5432):
#   se DATABASE_URL vier no pooler (6543), exporte DIRECT_URL como DATABASE_URL para os comandos.
```

## 1. GUARD (obrigatório — evita rodar em staging/errado)

```bash
node -r dotenv/config -e "const d=process.env.DIRECT_URL||''; const ref=(d.match(/postgres\.([a-z0-9]+)/)||[])[1]; const port=(d.match(/:(\d+)\//)||[])[1]; console.log('ref',ref,'porta',port); if(ref!=='oycxkofylcofvvditjeg'||port!=='5432'){console.error('⛔ NÃO é prod/5432 — ABORTAR');process.exit(1);}"
# usando o .env.prod.tmp: node -r dotenv/config exige DOTENV_CONFIG_PATH=.env.prod.tmp
```

## 2. Backup do metadado (rollback)

```bash
# dump da tabela de controle ANTES de mexer — permite reverter registro a registro
psql "$DIRECT_URL" -c "\copy (SELECT * FROM _prisma_migrations) TO 'prisma_migrations_prod_backup.csv' CSV HEADER"
```

## 3. Diagnóstico

```bash
DOTENV_CONFIG_PATH=.env.prod.tmp npx prisma migrate status
# lista APLICADAS x PENDENTES.

# o que falta no banco vs o schema (SQL que traria o banco até o schema):
DOTENV_CONFIG_PATH=.env.prod.tmp npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel   prisma/schema.prisma --script
```

## 4. Árvore de decisão

| O que `migrate status`/`diff` mostram | Situação | Ação |
|---|---|---|
| Migrations pendentes **e** o `diff` lista exatamente as mudanças delas (ausentes no banco) | Só atraso (= caso do staging) | `migrate deploy` |
| Migrations pendentes **mas** o `diff` vem **vazio** (mudanças já estão no banco, aplicadas à mão) | Drift de registro | `migrate resolve --applied <nome>` para cada pendente (marca sem re-rodar) |
| `diff` mostra objetos no banco que **não** vêm de nenhuma migration (ex.: coluna/índice criado no console) | Drift real de schema | **Parar.** Gerar migration corretiva (`migrate dev --create-only`) que descreva o que já existe, ou re-baseline. Ensaiar num clone antes. |

Aditivo é seguro aplicar direto. Se qualquer pendente for **destrutiva** (drop de coluna/tabela),
siga expand→contract do `docs/MIGRATIONS.md`: código sem o campo em prod **primeiro**, deploy verde,
só então o drop.

## 5. Aplicar (exemplo do caminho "só atraso")

```bash
DOTENV_CONFIG_PATH=.env.prod.tmp npx prisma migrate deploy
```

Para o caminho "drift de registro":

```bash
DOTENV_CONFIG_PATH=.env.prod.tmp npx prisma migrate resolve --applied 20260628202806_notification_listing_sold
DOTENV_CONFIG_PATH=.env.prod.tmp npx prisma migrate resolve --applied 20260629120000_user_unlimited_listings
```

## 6. Verificação

```bash
DOTENV_CONFIG_PATH=.env.prod.tmp npx prisma migrate status        # → "Database schema is up to date!"
DOTENV_CONFIG_PATH=.env.prod.tmp npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel   prisma/schema.prisma --script            # → vazio
```

Smoke: abrir o site de prod (busca, detalhe, criar anúncio) — nada quebrou.

## 7. Limpeza

```bash
rm -f .env.prod.tmp prisma_migrations_prod_backup.csv   # (guarde o CSV fora do repo se quiser histórico)
```

## Rollback

- **`migrate resolve` marcado errado:** delete a linha correspondente em `_prisma_migrations`
  (ou restaure do CSV do passo 2) e re-diagnostique.
- **Migration aditiva indesejada:** enum `ADD VALUE` é irreversível mas inócuo; coluna nova
  nullable/default pode ser dropada numa migration de contract posterior.
- **Pior caso:** restore do backup do Supabase.

## Depois

Com prod alinhado, a T5 (job de expiração de `Request` + `reminderSentAt`) e o drop de
`Conversation/Message` podem seguir o fluxo normal de migration. Registre aqui a data em que
prod ficou "up to date".
