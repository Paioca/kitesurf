# Fluxo — Comprar acessório enviável (com escrow)

O fluxo principal do MVP — onde o diferencial antifraude vive.

## Pré-condições

- Anúncio `active` com `shippable = true`.
- Comprador autenticado.

## Fluxo

1. Comprador abre anúncio → "Comprar"
2. Checkout: escolhe **PIX** ou **cartão à vista**
3. Paga via **PSP** → `Order.status = pending`
4. PSP confirma pagamento (webhook) → **`held`** (dinheiro **retido em escrow**)
5. Vendedor é notificado: "pagamento confirmado, envie o item"
6. Vendedor envia e informa **rastreio** (`tracking_code`) → **`shipped`**
7. Comprador recebe e clica **"confirmei o recebimento"** → **`released`**
   - OU auto-liberação após **7 dias** de `shipped_at`
8. Liberação dispara **split** no PSP: vendedor recebe `amount - fee`, plataforma recebe `fee`
9. Anúncio → `sold`; ambos podem avaliar

## Proteções (antifraude)

- Dinheiro **nunca** vai direto pro vendedor — fica retido até confirmação.
- Rastreio obrigatório pra `shipped`.
- Janela de confirmação protege o comprador.
- Disputa trava a liberação (ver [dispute](dispute.md)).

## Exceções

- Vendedor não envia em N dias → auto-refund (`refunded`).
- Pagamento não confirma → `cancelled`.
- Problema no recebimento → comprador abre disputa → `disputed`.
