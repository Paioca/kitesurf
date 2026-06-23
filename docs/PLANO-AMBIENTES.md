# Plano de ambientes — Kitetropos

Separar **produção**, **staging** e o trabalho de cada agente (Claude / Codex),
sem reorganizar pastas nem adotar Supabase Branching agora.

## Risco que isto resolve
Hoje: (1) push em `main` vai direto pra produção; (2) Previews da Vercel batem no
**banco de produção**; (3) `prisma migrate deploy` é rodado à mão com o `.env`
local apontando pra prod. Os dois primeiros são o risco principal.

## Arquitetura alvo
```
main      → Vercel Production   → kitetropos.com          → Supabase Production
staging   → Vercel Preview fixo → staging.kitetropos.com  → Supabase Staging
feat/*    → Vercel Preview      → URL por branch          → Supabase Staging
```
Plano Vercel é **Hobby**: não há "Custom Environment" formal. Usamos a branch
`staging` como Preview fixo + variáveis com escopo Preview.

---

## Fases

### Fase 0 — Higiene  ✅ (feito)
Tree de `main` estava limpa e as branches de feature já mergeadas (0 commits à frente).
- Worktree `../Kitesurf-observability` removido.
- Branches mortas apagadas: `feat/negociacao-v2`, `fix/observability-critical`, `sprint-0-observability`.
- `apps/web/.env.example` criado.

### Fase 1 — Proteger `main`  (P0 — maior ROI)
- [x] Branch `staging` criada a partir de `main` e publicada.
- [x] `.github/pull_request_template.md` + `docs/TEMPLATE-TAREFA-AGENTE.md`.
- [ ] **MANUAL (GitHub UI — `gh` não instalado):** Settings → Branches → regra em `main`:
  - Require a pull request before merging
  - Require status checks to pass → selecionar **CI**
  - Block force pushes / no deletions
  - (idem para `staging`, opcional)

> CI já roda em `push:main` e `pull_request` (tsc + vitest + build + lint). Só falta a regra acima pra ele virar gate.

### Fase 2 — Supabase Staging  (P0)
- [ ] Novo projeto Supabase em **São Paulo** (mesma região da prod).
- [ ] `.env` apontando pro staging → `cd apps/web && npx prisma migrate deploy`.
- [ ] Bucket `listings` + políticas RLS recriadas.
- [ ] Seed seguro (`prisma/seed.ts`) — **proibido** copiar telefone/CPF/email reais de prod.
- [ ] `JWT_SECRET` **diferente** do de prod.

### Fase 3 — Vercel: Preview → Staging  (P1)
- [ ] Env vars com escopo **Preview** (e/ou branch `staging`) → Supabase Staging.
- [ ] Domínio `staging.kitetropos.com` → branch `staging`.
- [ ] `APP_URL=https://staging.kitetropos.com` no Preview.
- [ ] `noindex` no staging; proteção por senha é Pro (no Hobby, checagem no middleware).
- [ ] Twilio em staging: números de teste / allowlist. E-mails marcados `[STAGING]`.
- [ ] Sentry `environment=staging`.

### Fase 4 — Migrations no pipeline  (P1)
- [ ] Job no CI: falhar PR se `schema.prisma` mudou sem migration nova.
- [ ] `migrate deploy` automático no merge em `staging`.
- [ ] Produção: `migrate deploy` só com **aprovação manual** (GitHub Environment + required reviewer).
- [ ] `docs/MIGRATIONS.md` com a política **expand → migrate → contract**.

### Fase 5 — Worktrees por agente  (P1)
```bash
git worktree add ../kitetropos-claude -b feat/claude-<tarefa>
git worktree add ../kitetropos-codex  -b feat/codex-<tarefa>
```
- Divisão por **domínio + dono temporário** (ver `docs/TEMPLATE-TAREFA-AGENTE.md`).
- Só **uma** feature com mudança de banco por vez.

---

## Fluxo Git
feature (`feat/*`) → PR → `staging` → CI verde + Preview testado → merge →
migrate em staging → smoke test → PR `staging` → `main` → **aprovação manual** →
migrate em prod → deploy → smoke test pós-deploy. **Sem** merge automático staging→main.

## Fora de escopo agora
- Supabase Branching por PR (alto custo; rever quando houver volume).
- Reorganização de pastas do monorepo (churn alto, não ataca o risco principal).

## Pendência de segurança (P0 pré-beta, ação do Felipe)
Rotação de credenciais. O `.env` local tem a **senha do banco em texto puro num
comentário** — trocar a senha do Supabase e limpar o comentário. Service_role/senha
já marcadas como vazadas no histórico.
