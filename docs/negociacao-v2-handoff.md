# Handoff — implementação negociacao-v2

> Para a próxima conversa/sessão retomar do ponto exato. Leia também a spec canônica
> **`docs/negociacao-v2.md`** (decisões + máquina de estados + §16 ordem) e o
> diagnóstico **`apps/web/prisma/diag-negociacao-v2.mjs`**.

## TL;DR

- Branch: **`feat/negociacao-v2`** — backend (5 commits) + **UI/testes/copy (8 commits desta sessão)**,
  à frente de `origin/main` / tag `negociacao-v2-base`. **Não pushado** ainda.
- **Código completo:** todos os chunks de UI + gauges de backend + testes + copy estão FEITOS
  (ver "Feito nesta sessão"). `next build` verde; **vitest 141 passando**.
- **Resta só execução GATED:** diagnóstico em staging → resolver duplicados/colisões → aplicar
  migração → testes de concorrência/jornada em staging → migrar prod. Ver "Resta (gated)".
- **GATES (não violar):** NÃO dar push pra `main`; migração **escrita mas NÃO aplicada**;
  diagnóstico **não rodado em prod** (staging primeiro, OK do Felipe). Só código na branch.

## Como buildar / verificar

```bash
cd apps/web
# o tree principal já está no Next 16; se faltar dep: npm install
# se mexer no schema: npx --no-install prisma generate
JWT_SECRET="build_only_dummy_secret_0123456789_abcdefXYZ" \
  node ../../node_modules/next/dist/bin/next build
```
- Não há `tsc` standalone instalado — **`next build` é o gate de tipo** (roda em ~7s; ignora lint).
- O JWT dummy (≥32 chars) é só pra passar a validação de env no build (o `.env` local tem 26 chars).

## Estado do banco / migração

- Migração escrita: `apps/web/prisma/migrations/20260623000000_negociacao_v2/migration.sql`
  (ADD enum values em DealStatus/NotificationType; colunas de data no Deal; índice do cron;
  **índice único parcial** seller_confirmed por (listingId, component); tabela `DealDispute` + RLS).
- **APLICAR SÓ depois** de rodar `diag-negociacao-v2.mjs` em **staging** com gates VERDES
  (o índice parcial FALHA se houver seller_confirmed duplicados). Ver spec §6/§16.
- O Prisma client local **já foi regenerado** com o schema novo (DealStatus novos, DealDispute, etc.).

## O que está FEITO (backend, na branch)

**Schema (`prisma/schema.prisma`)** — commit `77e9db2`
- `DealStatus` +`closed_unconfirmed/reversal_requested/reversed/disputed`.
- `Deal` +`confirmationDeadlineAt/closedUnconfirmedAt/reversalRequestedAt/reversedAt` + índice `(status, confirmationDeadlineAt)`.
- `DealDispute` (modelo) + enums `DisputeStatus`/`DisputeReason`; relations no `User` e `Deal`.
- `NotificationType` +`sale_cancelled/sale_closed_unconfirmed/reversal_requested/reversal_confirmed/reversal_rejected`.

**`lib/components.ts`** — commit `07bef95`
- `RESERVES` (matriz de unidade física) + `reservationConflict(a, b)`.

**`lib/deals.ts`** — commits `07bef95`, `0f86168`
- **Trava (§3):** `confirmSaleFromRequest` faz `SELECT … FOR UPDATE` na linha do Listing
  e rejeita reserva pendente conflitante; grava `confirmationDeadlineAt = +72h`.
- `applyPieceSale(tx, deal, listing, finalStatus)` / `unmarkPieceSale(tx, listingId, comp)`
  — helpers compartilhados de marcar/desmarcar venda. `confirmPurchase` foi **refatorado** pra reusar.
- `closeUnconfirmedExpired(now?)` — **cron**: encerra seller_confirmed vencidos → `closed_unconfirmed`.
- `correctUnconfirmed(userId, dealId)` — vendedor corrige (unilateral) → peça `paused`, deal `cancelled`.
- `requestReversal` / `respondReversal(accept)` / `cancelReversal` (§11) — abre `DealDispute(open)`,
  aceite → `reversed`, recusa → `disputed` + `DealDispute.under_review`.
- `createReview` agora **só aceita `completed`** (§4).
- `cancelSale` **notifica o comprador** (`sale_cancelled`); cancel/deny limpam o prazo.

**`lib/requests.ts`** — commit `0c19f09`
- `createRequest`: **reserve-block (§7)** — rejeita oferta/visita em peça com venda em andamento
  (matriz). + **self-trade (§12)** — `buyer.phone === seller.phone`.

**Rotas / cron** — commit `0c19f09`
- `POST /api/deals/[id]/correct`.
- `POST /api/deals/[id]/reversal` — body `{op:'request',reason,description?}` | `{op:'respond',accept}` | `{op:'cancel'}`.
- `GET /api/cron/close-unconfirmed` — protegido por `CRON_SECRET` (Vercel manda `Authorization: Bearer`).
- `vercel.json`: cron diário `0 3 * * *`.

## Feito nesta sessão (8 commits, todos `next build` + `vitest` verdes)

1. **§8 — Aceite + WhatsApp same-tab.** `RequestActions` → 2 botões (Recusar · Conversar no
   WhatsApp) + confirmação inline; `setRequestStatus` devolve `{status, whatsapp}` (link do
   comprador); front faz `window.location.assign` no mesmo gesto. Contato do comprador em
   `/pedidos` só após o aceite.
2. **DealBox — novos estados + review só em `completed` (§4/§11).** `closed_unconfirmed`
   (→/correct), `completed` (Solicitar correção c/ motivo →/reversal), `reversal_requested`
   (Confirmar/Não concordo/Desistir), `disputed`/`reversed` (display). Review oculta em
   reversal/disputed/reversed; `dealState` expõe `iOpenedReversal`/`reversalReason`.
3. **§11 — Resolução de disputa pelo admin.** `resolveDispute(adminId, disputeId, 'uphold'|'reverse')`
   em `lib/deals.ts` (uphold→completed; reverse→reversed+unmarkPieceSale). Rota
   `POST /api/disputes/[id]` (admin-only). 2ª fila `components/DisputeList.tsx` em `app/moderacao`.
   Reusa `reversal_confirmed`/`reversal_rejected` (notificações são só badge) — não mexe na migração.
4. **§10 — Anúncio vendido imutável.** `removeListing` bloqueia (409) quando `sold` OU há Deal em
   `SOLD_RECORD_DEAL_STATUSES`; `OwnerControls` esconde Excluir + mostra "registro de venda".
   Helpers `listingHasSaleRecord`/`listingsWithSaleRecord`. **Decisão:** editar/reativar seguem por
   `listing-status` + guards por peça → kit parcialmente vendido continua gerenciável na peça que
   sobrou (fully-sold já é terminal). Exceção admin (ocultar/placeholder de fotos): **não feita** —
   ver "Resta".
5. **§7 — UX de reserva.** `applyReservations(sellables, reservedComponents)` (puro); detalhe mostra
   peça reservada sem CTA + estado "venda em andamento"; busca (`browse.buildWhere`) exclui via
   NOT EXISTS por perspectiva (count/paginação intactos). Facetas e Favoritos **não** filtram reserva
   (aproximação aceita).
6. **§4 — Contadores de perfil.** `COUNTS_AS_SALE_STATUSES` (completed/reversal_requested/disputed)
   em `salesCount`/`purchasesCount`; review pública segue só `completed`.
7. **#7 — Badges em `/pedidos`.** `StatusBadge` reflete o estado do deal (Venda marcada/Concluído/
   Correção pedida/Em disputa/Revertido/Encerrado); cancelled/voided caem no status do request.
8. **§15 testes + §14 copy.** Suíte consertada (7 quebrados pelos commits de backend) + cobertura §15
   → **141 passando**. Copy: "Quero ver pessoalmente" + "Enviar pedido e compartilhar WhatsApp"
   (ContactActions); "Agora não" na avaliação (DealBox). Fix de produto: `closeUnconfirmedExpired`
   agora conta só encerramentos reais (o tx devolve bool).

## Resta (gated — staging + OK do Felipe)

- **Execução da spec §16 (passos 6–9, 21–22):** rodar `diag-negociacao-v2.mjs` em **staging** →
  resolver duplicados de seller_confirmed + colisões de telefone (gate: zero) → **aplicar a migração**
  (`20260623000000_negociacao_v2`) → testes de **concorrência real** (2 confirmações simultâneas = 1
  venda; Postgres serializa o `FOR UPDATE`) e jornadas em staging → **migrar prod**. Nada disso rodado.
- **Backlog curto (não-bloqueante):** exceção administrativa do §10 (admin oculta anúncio vendido /
  fotos→placeholder, preservando o Deal); **lembrete 48h** do §9 (precisa de flag `remindedAt` pra ser
  idempotente); antifraude §13 (só alertas, backlog).

## Gotchas / decisões já tomadas (não re-litigar)
- **Trava** = query de seller_confirmed + `FOR UPDATE` na linha do Listing (não markers). Índice parcial = backstop.
- **Reversão** usa `DealDispute` como registro desde o request (status `open` = aguardando contraparte;
  `under_review` = aguardando admin). A contraparte é validada por `dispute.counterpartyId`.
- **72h = auto** (cron), não ação manual do vendedor. O manual é só `correctUnconfirmed` depois.
- **48h reminder**: ainda NÃO implementado (precisa de flag `remindedAt` pra ser idempotente) — backlog curto.
- **`voided`** sobrevive só no conflito cross-componente do kit (conjunto × peça) — ver §2.4 da spec.

## Ordem sugerida pra retomar
Código FEITO (ver acima). Próximo passo é **execução em staging** (não código): `git push` da
branch → diagnóstico em staging → resolver duplicados/colisões → aplicar migração → concorrência +
jornadas em staging → migrar prod. Só com OK do Felipe.
