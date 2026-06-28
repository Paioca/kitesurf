# Checklist — Janela de rotação de credenciais

Runbook operacional pra executar a rotação numa janela de manutenção. O procedimento
detalhado (o porquê de cada passo) está em [`SECRETS.md`](./SECRETS.md); aqui é a
sequência prática pra seguir na hora.

> Contexto: a auditoria de pré-lançamento sinalizou a **senha do Postgres** e a
> **`SUPABASE_SERVICE_ROLE_KEY`** como potencialmente vazadas no histórico → rotacionar.
> O `JWT_SECRETS` entra como hygiene (zero downtime).

## Janela
- **Dia de semana, NUNCA sexta.**
- **Madrugada BRT, depois da 01:00** (os crons diários rodam 00:00 e 01:00 BRT — `0 3` e
  `0 4` UTC). Sugestão: **04:00–05:00 BRT**. Duração ~15–20 min.

## Pré-flight (deixar aberto antes de começar)
- [ ] Gerenciador de senhas (1Password/Bitwarden) — guardar as chaves novas **antes** de salvar no Vercel.
- [ ] Aba **Supabase**: Settings → API e Settings → Database.
- [ ] Aba **Vercel**: Project → Settings → Environment Variables.
- [ ] Terminal pronto pro `openssl rand -hex 48`.
- [ ] Avisar quem estiver de plantão (haverá ~2 min de queries falhando nas etapas A e B).

## Ordem (do mais seguro para o com downtime)

### C — `JWT_SECRETS` (zero downtime)
- [ ] `openssl rand -hex 48` → guarda no gerenciador.
- [ ] Vercel → `JWT_SECRETS = <nova>,<antiga>` (CSV; nova primeiro). Mantém `JWT_SECRET` legado se existir. Production + Preview.
- [ ] Save → Redeploy (sem cache).
- [ ] **Verifica:** logout/login numa conta de teste.
- [ ] (daqui a **30 dias**) remover a chave antiga → `JWT_SECRETS = <nova>` e deletar `JWT_SECRET` legado.

### A — `SUPABASE_SERVICE_ROLE_KEY` (~2 min de janela)
- [ ] Supabase → Settings → API → Project API keys → **service_role → Regenerate** → copia a nova **na hora**.
- [ ] Vercel → `SUPABASE_SERVICE_ROLE_KEY` → cola → Save → Redeploy.
- [ ] Atualiza no `.env` local (senão os scripts param) + gerenciador.
- [ ] **Verifica:** `https://kitetropos.com/api/health/login` = 200 **e** subir um anúncio com foto (testa Storage).

### B — Senha do Postgres (~2 min de janela)
- [ ] Supabase → Settings → Database → **Reset database password** → copia **na hora**.
- [ ] Vercel → substitui a senha em **`DATABASE_URL` E `DIRECT_URL`** (só o pedaço da senha) → Save → Redeploy.
- [ ] Atualiza as duas vars no `.env` local + gerenciador.
- [ ] **Verifica:** `/api/health/login` = 200 e `npx prisma migrate status` no `apps/web` responde normal.

## Pós-rotação
- [ ] **Fechar a superfície:** o `apps/web/.env.prod` no disco tem segredos reais — atualizar com os valores novos **ou apagar** (a fonte da verdade é o Vercel; secret de prod em arquivo local é superfície de vazamento).
- [ ] **Trilha de auditoria** (Notion/Linear/README), modelo do SECRETS.md:
  ```
  [AAAA-MM-DD] JWT_SECRETS rotacionado — vazamento sinalizado na auditoria — <quem>
  [AAAA-MM-DD] SERVICE_ROLE_KEY rotacionado — idem — <quem>
  [AAAA-MM-DD] senha Postgres rotacionada — idem — <quem>
  ```
- [ ] Confirmar no Sentry que não apareceu erro novo após cada redeploy.
