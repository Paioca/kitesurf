# Política de migrations — Kitetropos

Prisma Migrate. Migrations versionadas em `apps/web/prisma/migrations/`.
Schema e migrations **sempre evoluem juntos** — o CI barra PR que mexe no
`schema.prisma` sem migration nova (`scripts/check-migration-drift.sh`).

## Comandos

```bash
cd apps/web
npm run db:migrate    # dev: cria a migration a partir do schema (prisma migrate dev)
npm run db:deploy     # staging/prod: aplica migrations pendentes (prisma migrate deploy)
```

- `DIRECT_URL` (porta 5432, conexão direta) é o que migrate usa.
- **Nunca** apontar `.env` local pra prod pra rodar migrate à mão (era o modelo
  antigo; o alvo é `migrate deploy` no pipeline — ver `docs/PLANO-AMBIENTES.md`,
  Fase 4).

## Regra de ouro: expand → migrate → contract

Toda mudança que pode quebrar precisa ser **retrocompatível durante o rollout**
(há uma janela em que o banco já mudou mas o código antigo ainda roda, e vice-versa).
Divida em releases:

1. **Expand** — adiciona o novo SEM quebrar o velho.
   Coluna/tabela nova nullable; enum ganha valor novo (`ALTER TYPE ADD VALUE` é
   aditivo e seguro); índice criado concorrentemente.
2. **Migrate / backfill** — preenche os dados novos; código passa a entender as
   duas formas (velha e nova).
3. **Contract** — só numa release **posterior**, remove o velho (drop column,
   drop enum value, remove código de compatibilidade).

### Nunca na mesma implantação
- Renomear/remover coluna **+** deploy de código que já depende da remoção.
  Entre a migration e o deploy da app há indisponibilidade garantida.

## Ordem de deploy quando schema e código têm ordens opostas

O build da Vercel **não** roda migration. Aplique na ordem certa:

- **Aditivo** (expand): aplicar migration **antes** do push do código que usa o novo.
- **Destrutivo** (contract): fazer o push do código que **não** usa mais a coluna,
  confirmar o deploy verde, **só então** rodar o `DROP` no banco. (Senão o client
  Prisma antigo ainda lista a coluna no SELECT e quebra.)

> Exemplo real: a remoção de `User.city/state` foi feita assim — push do código
> sem os campos primeiro, deploy verde, depois `DROP COLUMN` em prod.

## Antes de migration destrutiva em produção
- Backup do banco.
- Confirmar que nenhuma outra feature está com mudança de schema em andamento
  (regra do `docs/PLANO-AMBIENTES.md`: **uma** feature com mudança de banco por vez).
- Aplicar em **staging** primeiro + smoke test.
- Produção só com aprovação manual.
