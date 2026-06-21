# Máquina de estados — ciclo de negociação (Kitetropos Fase 0)

**Verdade-terreno é o código.** As transições vivem em serviços de domínio
(`lib/requests.ts`, `lib/deals.ts`, `lib/lifecycle.ts`, `lib/listing-status.ts`),
não espalhadas nos route handlers. Toda transição que mexe em mais de uma entidade
(Listing + Request + Deal) roda na mesma transação Prisma.

Decisão de produto travada: **"Aceitar oferta" não confirma preço** — significa
*demonstrar interesse e liberar o WhatsApp do vendedor*. A negociação de valor
continua no WhatsApp. Não há contraproposta. Múltiplos compradores podem ter contato
liberado ao mesmo tempo. Uma venda só vira histórico/reputação quando começou na
plataforma, o vendedor marcou vendido e o comprador confirmou.

## Listing (`ListingStatus`)

`draft → active ⇄ paused → archived` · `active/paused → sold` · **`sold` é terminal**.

| de → para | quando | onde |
|---|---|---|
| draft → active | publicação | criar anúncio |
| active ⇄ paused | dono pausa/reativa | `canTransition` + PATCH |
| active/paused → archived | exclusão (soft) | `removeListing` |
| active/paused → sold | última peça confirmada | `confirmPurchase` |
| sold → * | **bloqueado** (terminal) | `canTransition` |
| archived → active | **só via republicar** (fluxo dedicado, ainda não existe) | `canTransition` |

Peças do kit: `kiteSoldAt` / `barraSoldAt` marcam venda parcial sem fechar o anúncio.
Editar disponibilidade: não dá pra **remover** uma peça (preço → null) com negociação
aberta, nem alterar uma peça já vendida (`openNegotiationExists` + guard no PATCH).

## Request (`RequestStatus`)

| estado | significado | transita de |
|---|---|---|
| `pending` | aguardando o vendedor | criação / re-oferta (upsert) |
| `accepted` | vendedor liberou o WhatsApp | `setRequestStatus` (vendedor) |
| `declined` | recusado pelo vendedor | `setRequestStatus` (vendedor) |
| `withdrawn` | comprador desistiu (inclui "não comprei") | `cancelRequest` / `denyPurchase` |
| `listing_removed` | anúncio excluído pelo dono | `removeListing` / `deleteAccount` (lado vendedor) |
| `sold_elsewhere` | peça vendida a outro comprador | `confirmPurchase` |
| `expired` | **reservado** — sem job de expiração ainda | — |

Regras:
- Desistência (`cancelRequest`) cobre `pending` e `accepted`; grava `withdrawn` (não
  apaga — preserva histórico; re-oferta volta a `pending` via upsert). Já aceito: o
  contato compartilhado **não** é revogável. Se o vendedor já marcou vendido, o caminho
  é **"não comprei"** (`denyPurchase`), não desistência — bloqueado com 409.
- Ao concluir uma venda, pedidos incompatíveis de **outros** compradores viram
  `sold_elsewhere` (não `declined` — recusa é decisão do vendedor). O pedido do
  comprador **vencedor** não é tocado: aparece como negócio concluído via o Deal.

## Deal (`DealStatus`)

| estado | significado | transita de |
|---|---|---|
| `seller_confirmed` | vendedor marcou vendido; falta o comprador confirmar | `confirmSaleFromRequest` |
| `completed` | comprador confirmou — entra no histórico/reputação | `confirmPurchase` |
| `cancelled` | desfeito pelo vendedor (`cancelSale`) ou comprador ("não comprei") | `cancelSale` / `denyPurchase` |
| `voided` | invalidado: peça vendida a outro / componente indisponível | `confirmPurchase` |

`completed` e `voided` são terminais. `seller_confirmed` concorrentes (o vendedor pode
marcar vendido pra mais de um comprador) viram `voided` quando um deles conclui — não
ficam órfãos esperando uma confirmação impossível. A trava de DB (índice único parcial
`(listingId, component) WHERE status='completed'`) garante 1 venda concluída por peça.

## Venda do kit (parcial)

- Conjunto vendido → fecha tudo (anúncio `sold`).
- Kite vendido → encerra kite + conjunto; barra continua à venda (se existir).
- Barra vendida → encerra barra + conjunto; kite continua à venda.
- Regra órfã: vender a única peça avulsa restante fecha o anúncio.

## Eventos de notificação (in-app)

Emitidos dentro da transação da transição (`NotificationType`):

| evento | destinatário | gatilho |
|---|---|---|
| `request_new` | vendedor | comprador cria oferta/visita |
| `request_accepted` | comprador | vendedor aceita (libera WhatsApp) |
| `request_declined` | comprador | vendedor recusa |
| `sale_marked` | comprador | vendedor marca vendido (falta confirmar) |
| `purchase_confirmed` | vendedor | comprador confirma a compra |
| `purchase_denied` | vendedor | comprador respondeu "não comprei" |
| `sold_elsewhere` | compradores afetados | peça vendida a outro |
| `listing_removed` | compradores afetados | anúncio removido |

## Pendências conhecidas

- `expired`: valor de enum reservado; mecanismo de expiração (job) não implementado.
- Republicação de arquivado (`archived → active`): fluxo dedicado ainda não existe.
- Tombstone público do anúncio concluído: hoje o histórico aparece em `/pedidos`; a
  página pública do anúncio removido ainda dá 404.
