# Handoff — implementação negociacao-v2

> Para a próxima conversa/sessão retomar do ponto exato. Leia também a spec canônica
> **`docs/negociacao-v2.md`** (decisões + máquina de estados + §16 ordem) e o
> diagnóstico **`apps/web/prisma/diag-negociacao-v2.mjs`**.

## TL;DR

- Branch: **`feat/negociacao-v2`** (5 commits à frente de `origin/main` / tag `negociacao-v2-base`).
- **Backend essencialmente pronto** (domínio + API + cron + reserve-block), tudo `next build`-verificado.
- Falta majoritariamente **UI** + alguns gauges de backend (resolução de disputa por admin, contadores de perfil).
- **GATES (não violar):** NÃO dar push pra `main`; migração **escrita mas NÃO aplicada**;
  diagnóstico **não rodado em prod** (staging primeiro). Implementação só de código na branch.

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

## O que FALTA (próximos chunks)

### 1. §8 — Aceite simplificado + WhatsApp same-tab
- `components/RequestActions.tsx`: hoje 3 botões → **2** (`Recusar` · `Conversar no WhatsApp`)
  com confirmação inline ("seu WhatsApp também será compartilhado").
- `lib/requests.ts setRequestStatus`: ao aceitar, **retornar o link** `{status:'accepted', whatsapp}`.
- Rota `PATCH /api/requests/[id]`: repassar o link.
- Front: `window.location.assign(whatsapp)` **no mesmo gesto** (NÃO `window.open` após await — bloqueio Safari).

### 2. §7 — lado UX (o gate de backend já existe)
- Mostrar peça reservada como indisponível na **busca** e no **detalhe**.
- ⚠️ Decisão pendente: `sellables()` NÃO conhece reservas (a trava é por query de deal + lock,
  não por markers no Listing). Opções: (a) detalhe/`anuncio/[id]` consulta os seller_confirmed
  e ajusta a UI; busca (`lib/browse.ts`) carrega os seller_confirmed (conjunto pequeno) e filtra
  em memória; OU (b) adicionar markers de reserva no Listing (kiteReservedAt/barraReservedAt) —
  mais schema, mas integra direto no `sellables` (fonte única). Recomendo (a) pro detalhe e
  avaliar (b) se a busca pesar.

### 3. §10 — Anúncio vendido imutável
- `components/OwnerControls.tsx`: esconder Excluir/Editar/Reativar p/ `sold`/Deal `completed`/
  `closed_unconfirmed`/`reversal_requested`/`disputed`/`reversed`.
- `lib/lifecycle.ts removeListing` + rota DELETE: **bloquear** nesses estados (hoje só bloqueia
  se há seller_confirmed aberto — um anúncio `sold` AINDA é excluível pelo dono = lacuna).
- Exceção admin: ocultar (não apagar Deal); fotos → placeholder.

### 4. UI dos novos fluxos — `components/DealBox.tsx`
- Novos estados/ações: `closed_unconfirmed` (vendedor: "Corrigir e voltar a anunciar" → `/correct`);
  `completed` (qualquer parte: "Solicitar correção" → `/reversal` op:request, com motivo);
  `reversal_requested` (contraparte: "Confirmar correção"/"Não concordo" → op:respond; solicitante:
  "Desistir" → op:cancel); `disputed`/`reversed` (display).
- Review: só mostrar o form em `completed` (§4). Hoje o DealBox mostra em seller_confirmed — ajustar.

### 5. Fila de disputas na moderação (§11)
- **Falta o backend de resolução pelo admin:** função `resolveDispute(adminId, disputeId, action)`
  — `resolved_upheld` (Deal segue) / `resolved_reversed` (Deal → reversed + `unmarkPieceSale`) → `closed`.
  + rota admin-only. (O `DealDispute` já é criado em `under_review`; falta o admin resolver.)
- `components/ModerationList.tsx` / `app/moderacao/page.tsx`: **2ª fila** lendo `DealDispute`
  (where status `under_review`) com contexto (dealId/partes/motivo/datas) + ações de resolução.

### 6. Contadores de perfil (§4) — `lib/profile.ts` (getProfile)
- **DOIS predicados distintos** (não reusar um só):
  - Conta como venda: `status ∈ {completed, reversal_requested, disputed}`.
  - Review pública: `status == completed`.
- Verificar/ajustar as queries de reputação/contagem.

### 7. `app/pedidos/page.tsx`
- Garantir que os novos estados de Deal aparecem certos (o `StatusBadge` de Request já cobre os
  estados de request; o DealBox cobre os de deal).

### 8. §15 testes + §14 copy
- Testes (lista na spec §15; inclui concorrência de 2 confirmações = 1 venda só, e
  `cancelSale` notifica comprador). Copy: "Quero ver pessoalmente", confirmações, etc.

## Gotchas / decisões já tomadas (não re-litigar)
- **Trava** = query de seller_confirmed + `FOR UPDATE` na linha do Listing (não markers). Índice parcial = backstop.
- **Reversão** usa `DealDispute` como registro desde o request (status `open` = aguardando contraparte;
  `under_review` = aguardando admin). A contraparte é validada por `dispute.counterpartyId`.
- **72h = auto** (cron), não ação manual do vendedor. O manual é só `correctUnconfirmed` depois.
- **48h reminder**: ainda NÃO implementado (precisa de flag `remindedAt` pra ser idempotente) — backlog curto.
- **`voided`** sobrevive só no conflito cross-componente do kit (conjunto × peça) — ver §2.4 da spec.

## Ordem sugerida pra retomar
UI primeiro (§8 aceite/WhatsApp → DealBox → fila de disputa + resolveDispute → §10 imutável →
§7 UX → contadores), depois testes, depois copy. Migração/diagnóstico só com staging + OK do Felipe.
