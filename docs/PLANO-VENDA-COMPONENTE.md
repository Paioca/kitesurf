# Plano de implementação — Venda por componente (Opção A) · Kitetropos Fase 0

**Data:** 2026-06-20 · **Método:** painel de design (3 abordagens) → síntese. Validado contra o código
real em `apps/web` (schema, lib/requests, lib/deals, browse, ContactActions, detalhe, rotas, testes,
migrations, RLS). Status: **aprovação pendente do dono antes de codar.**

---

## 1. Decisão de modelo

**Base: híbrido pragmático.** Enum `Component` = **`conjunto` / `kite` / `barra`** (PT, alinhado à UI
"Conjunto / Só o kite / Só a barra"). Disponibilidade por componente via colunas no próprio `Listing`
(não tabela nova). Lógica concentrada num **helper puro único** `lib/components.ts` (fonte de verdade
pra backend + browse + UI — elimina a divergência "o que a busca esconde ≠ o que o gate bloqueia").

**Por que não tabela `ListingComponent` (normalizado):** exige RLS+policies novas, reescrita das
facetas (`computeFacets`), backfill, risco de dupla contagem. Over-engineering pra ≤3 alvos fixos
derivados de campos que já existem (`hasBarra`/`kitePrice`/`barraPrice`).

**Custo aceito:** `Listing` ganha 4 colunas; a regra "conjunto exclui kite/barra" é lógica (no
`confirmPurchase`), não 100% no banco — mitigado por concentrar TODA escrita num só ponto. Migração
100% aditiva, zero tabela/RLS/backfill.

---

## 2. Schema + migration

```prisma
enum Component { conjunto  kite  barra }

// Listing (após lastConfirmedAt):
  kiteSoldAt        DateTime?   kiteSoldToUserId  String?
  barraSoldAt       DateTime?   barraSoldToUserId String?

// Request: component Component @default(conjunto)
//   @@unique([listingId, buyerId, type, component])   // era [listingId, buyerId, type]
// Deal:    component Component @default(conjunto)
```

Migration `20260621000000_component_sales/migration.sql`:
```sql
CREATE TYPE "Component" AS ENUM ('conjunto', 'kite', 'barra');
ALTER TABLE "Listing" ADD COLUMN "kiteSoldAt" TIMESTAMP(3), ADD COLUMN "kiteSoldToUserId" TEXT,
  ADD COLUMN "barraSoldAt" TIMESTAMP(3), ADD COLUMN "barraSoldToUserId" TEXT;
ALTER TABLE "Request" ADD COLUMN "component" "Component" NOT NULL DEFAULT 'conjunto';
ALTER TABLE "Request" DROP CONSTRAINT "Request_listingId_buyerId_type_key";
ALTER TABLE "Request" ADD CONSTRAINT "Request_listingId_buyerId_type_component_key"
  UNIQUE ("listingId", "buyerId", "type", "component");
ALTER TABLE "Deal" ADD COLUMN "component" "Component" NOT NULL DEFAULT 'conjunto';
DROP INDEX IF EXISTS "Deal_listingId_completed_key";
CREATE UNIQUE INDEX "Deal_listing_component_completed_key"
  ON "Deal" ("listingId", "component") WHERE "status" = 'completed';
CREATE INDEX "Listing_kiteSoldAt_idx" ON "Listing" ("kiteSoldAt");
CREATE INDEX "Listing_barraSoldAt_idx" ON "Listing" ("barraSoldAt");
```

**Migração dos anúncios existentes: ZERO backfill.** Os `DEFAULT 'conjunto'` cobrem todo histórico
(era sempre "anúncio inteiro"): kit/kite-only/barra-only → alvo `conjunto`; anúncio `sold` continua
`sold` + `*SoldAt=NULL` → `sellables` retorna tudo indisponível. Pré-checagem barata no Supabase:
`SELECT "listingId", count(*) FROM "Deal" WHERE status='completed' GROUP BY "listingId" HAVING count(*)>1;`
(deve vir vazio). `*SoldToUserId` sem FK formal no v1 (espelha `soldToUserId` atual).

---

## 3. Disponibilidade e status (`lib/components.ts`, novo)

`sellables(listing)` → lista de `{component, price, available}` (só alvos do anúncio).
`shouldCloseListing(listing, justSold)` → quando fechar o anúncio (inclui regra ÓRFÃ: vender a única
peça avulsa de um kit sem a outra à venda fecha). `priceOf(listing, component)` → preço da peça.

**Regras de ouro:** (1) vender barra mantém kite à venda; (2) vender conjunto fecha tudo; (3) última
peça → `sold` (o `BASE={status:'active'}` tira das duas buscas). **Invariante:** qualquer peça avulsa
vendida → `conjunto` deixa de ser vendável (`conjuntoGone`) — evita "vendi a barra mas alguém compra o kit".

---

## 4. Backend

**`lib/requests.ts`:** `createRequest(…, component='conjunto')` — `select` ganha os campos do
`ListingLike`; gate por componente via `sellables` (substitui o `status!=='active'` cego);
`amount` validado contra `sell.price` (não `listing.price`) + teto de sanidade `>3×`; `upsert` na nova
unique. `setRequestStatus`: gate por componente no ramo `accepted`. `getRequestsForUser`: incluir
`component` no shape e **corrigir a chave de `dealState`** pra `listingId|buyerId|sellerId|component`
(senão casa o deal errado quando o comprador tem oferta no kite E na barra). `getListingRequestState`
→ mapa por componente (TS força achar os call sites).

**`lib/deals.ts`:** `confirmSaleFromRequest` herda `r.component`. **`confirmPurchase` (coração):**
reler listing; rejeitar se a peça não está disponível; `close=shouldCloseListing`; setar
`kiteSoldAt`/`barraSoldAt` (+`*SoldToUserId`) ou `status='sold'` se `close`; `updateMany` com guard por
componente (`count===0`→409, trava a corrida); **recusa cirúrgica** (se fechou → recusa todos; se vendeu
peça sem fechar → recusa só a mesma peça + todos os `conjunto`, preserva a outra peça); +
`revalidateTag`. **`cancelSale`: zero mudança** (não grava `*SoldAt`; reabrir após cancelar é de graça).
`confirmSale` via chat cai em `conjunto` (default) — dívida anotada, não regride.

**Rotas:** `request/route.ts` ganha `component` no zod; `confirm/route.ts` ganha `revalidateTag(LISTINGS_TAG)`
(hoje ausente → peça vendida fica até 60s na faceta).

---

## 5. Busca / browse (`lib/browse.ts`)

`BASE` permanece. `buildWhere`: persp barra ganha `barraSoldAt: null`; persp kite ganha
`OR:[{hasBarra:false},{hasBarra:true,kiteSoldAt:null}]`. `ActiveRow`/`loadActiveRows`: +`kiteSoldAt`/
`barraSoldAt`. `computeFacets`/`inPersp`/`barraCount`: +`&& *SoldAt==null` (mata a dupla contagem
"Barra (7)" devolvendo 6). `toCard`: `includesBar` considera `barraSoldAt`. **Sort por preço efetivo
já existe** (`eff()` faz `barraPrice ?? price`) — mantido, é o ponto onde rejeitamos a coluna do Design 2.

---

## 6. UI

`ContactActions`: props viram `targets[]` + `initialByComponent` (montados no server via `sellables`).
**1 alvo → UI idêntica a hoje** (caminho dominante intocado). **2+ alvos → chips de seleção**
`[Conjunto R$X][Só o kite R$Y][Só a barra R$Z]` antes de ofertar; alvo define `component`/preço/summary.
`sessionStorage` pré-login inclui `component` (senão retoma no alvo errado). Detalhe: pills de peça
vendida riscadas e fora dos targets. `pedidos`/`DealBox`: rótulo do alvo na oferta e na confirmação.
`ListingCard`: selo "peça vendida" só em "meus anúncios". **`anunciar` + POST `/api/listings`: zero
mudança** (o form já gera `hasBarra`/`kitePrice`/`barraPrice`).

---

## 7. Edge cases (resumo)

E1 kit só-conjunto · E2 barra-only · E3 kite-only → 1 alvo, vender fecha. E4 vende barra avulsa → kite
segue à venda; some da busca de barra; recusa conjunto+barra de outros, preserva kite. E5 vende conjunto
com oferta pendente → fecha + recusa todos. E6 regra órfã → fecha. E7 última peça → sold. E8 reabrir após
cancelar → zero código novo. E9 comprador oferta no kite E barra → 2 requests permitidos. E10/E11 corridas
por componente → índice parcial `(listingId, component)` + `sellables` travam ambas as ordens. E12 antigos
vendidos → tudo indisponível.

---

## 8. Testes (estender os 40 do Vitest)

`test/components.test.ts` (novo, helper puro sem mock): `sellables` + `shouldCloseListing` incl. regra
órfã. `test/requests.test.ts`: oferta em peça vendida→409; amount vs `sell.price`; default conjunto.
`test/deals.test.ts`: confirmPurchase da barra (não fecha, recusa cirúrgica); do conjunto (fecha);
aborto por componente; regra órfã. **Cobertura mínima:** 3 regras de ouro + corrida por componente +
órfã.

---

## 9. Plano de execução (ordenado, esforço)

| # | Passo | Esforço |
|---|-------|---------|
| 1 | schema.prisma (enum + 4 colunas + component em Request/Deal + nova unique) | baixo |
| 2 | migration + pré-checagem SQL no Supabase | baixo |
| 3 | `lib/components.ts` + `test/components.test.ts` | médio |
| 4 | `lib/requests.ts` (gate/amount/dealState/getListingRequestState por componente) | médio |
| 5 | `lib/deals.ts` `confirmPurchase` (guard + recusa cirúrgica + órfã) | **alto** |
| 6 | rotas (zod component + revalidateTag) | baixo |
| 7 | `lib/browse.ts` (buildWhere/facetas/ActiveRow/toCard) | **alto** |
| 8 | UI (ContactActions targets, detalhe, pedidos/DealBox, ListingCard) | **alto** |
| 9 | `npm run test:run` + smoke do caminho dominante (peça única = idêntico) | baixo |
| 10 | deploy: **migration primeiro** (aditiva), depois push | baixo |

**Ordem segura:** colunas aditivas + defaults ⇒ código antigo em prod ignora os campos novos na janela
de deploy. Schema antes do código.

---

## 10. Riscos

1. Faceta mente até 60s (cache) → `revalidateTag` no confirm (passo 6). 2. `dealState`/`getListingRequestState`
por componente esquecidos → mudar o **tipo de retorno** força o compilador. 3. Coexistência conjunto×peça
não travada pelo índice → `confirmPurchase` é o único ponto de escrita + `conjuntoGone` + teste E11.
4. sessionStorage sem component → incluir obrigatório. 5. Recusa cruzada over/under → gate `sellables` em
2 pontos como rede. 6. Reverter venda `completed` → fora do v1 (SQL admin + runbook). 7. confirmSale via
chat → default conjunto, follow-up.

**Não-objetivos do v1 (sem dívida tóxica):** reverter completed via UI; editar anúncio após ofertas;
alvo no fluxo de chat; push em tempo real. Nenhum está no caminho da venda por componente correta.

---

**Arquivos:** `prisma/schema.prisma` · `migrations/20260621000000_component_sales/` · `lib/components.ts`
(novo) · `lib/requests.ts` · `lib/deals.ts` · `lib/browse.ts` · `app/api/listings/[id]/request/route.ts` ·
`app/api/deals/[id]/confirm/route.ts` · `components/ContactActions.tsx` · `app/anuncio/[id]/page.tsx` ·
`app/pedidos/page.tsx` · `components/DealBox.tsx` · `components/ListingCard.tsx` · `test/`. **Sem mudança:**
`app/anunciar/page.tsx`, POST `/api/listings`, `cancelSale`.
