# Resumo executivo — Auditoria pré-lançamento → correção → deploy (2026-06-28)

Visão de alto nível pra revisão com o time. Detalhes técnicos: `AUDIT-RUN-CLAUDE-2026-06-28.md`
(execução da auditoria) e os PRs #15–#19.

## Veredito
**GO PARA BETA PRIVADO** — 0 P0, 0 P1. Os 3 bloqueadores da auditoria anterior
(`AUDIT-PRE-LANCAMENTO.md`) estavam fechados; nenhum novo bloqueador encontrado. Os 2 sintomas
reportados (sessão piscando, criar anúncio no mobile) foram resolvidos.

## Jornada
Avaliar o prompt de auditoria → reescrever (v2) → **rodar a auditoria** (estática + smoke de
prod + funil autenticado ao vivo) → **corrigir os achados** (5 PRs) → **verificar a infra de
produção** (achando e corrigindo os check-ins de cron + erros reais de pool de banco) →
**mergear e deployar** com prod estável (15 min de watch, 0 anomalias).

## O que foi entregue (5 PRs)

| PR | Tema | Destaques |
|---|---|---|
| **#15** | Pré-lançamento | rate-limit em deal/request (abuso/SMS); flicker de login resolvido no SSR (desktop+mobile); teclado mobile (viewport); toggle EN escondido (PT-only no launch); copy/logout→Sentry |
| **#16** | Cauda P2 | recovery loop (escape por e-mail); rating cache invalidado na reversão; **N5** — encerramento de 72h passa a **reservar** o anúncio em vez de marcar "Vendido" fantasma |
| **#17** | Favoritos | notifica quem favoritou quando o anúncio é vendido/removido (`listing_sold`). **Migration** `20260628202806` (aplicada à mão) |
| **#18** | Observabilidade | check-ins de cron registram os monitores no Sentry (alerta de cron-parado); guard p/ dev local não poluir o Sentry de produção |
| **#19** | Pool de banco | serializa queries das rotas quentes — ataca o "Timed out fetching a connection" sob `connection_limit=1` |

Verificação de cada PR: `tsc` · `lint` · testes (até 199) · `build` · smoke ao vivo (Postgres
local descartável) · smoke de produção pós-deploy.

## Achados de infra (verificação em produção)
- ✅ `CRON_SECRET` setado; 3 crons rodando (plano Pro); Sentry recebendo erros; `connection_limit=1` aplicado; CSP/HSTS/headers fortes; sem IDOR (36 rotas); sem vazamento de PII (confirmado ao vivo); EXIF/GPS removido nos uploads.
- 🔧 Check-ins de cron estavam quebrados (sem `monitorConfig`) → corrigido no #18.
- 🟡 **Erros reais de pool de banco** em rotas quentes (`GET /`, `/perfil`, `/anuncio`, `/pedidos`) — `connection_limit=1` + latência do Supabase + queries paralelas. Onda calmou; #19 reduz a contenção (uma alavanca).

## Pendências (não bloqueiam beta)
1. **Alerta de cron-parado** no Sentry — ligar depois que os monitores `job-*` registrarem (pós-deploy #18).
2. **Rotação de credenciais** — agendada; ver `ROTACAO-CHECKLIST.md`.
3. **Escala (quando crescer):** cache de dados quentes (facets/taxonomia já têm cache parcial); tunar `pool_timeout`; rever `connection_limit` vs concorrência por instância.
4. **Higiene:** `apps/web/.env.prod` no disco tem segredos reais — atualizar/apagar na rotação.

## Decisões registradas (não-bug)
- B-1 (contato em disputa): fechado por superfície (`contactAllowed`), confirmado ao vivo.
- `sold_elsewhere`→404: intencional (tombstone, pendência conhecida).
- N5: opção "reservar/ocultar" (decisão de produto).
