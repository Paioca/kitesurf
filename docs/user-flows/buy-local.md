# Fluxo — Comprar equipamento grande (local / presencial)

Para kite, barra, board, foil — ticket alto, entrega na mão.

## Pré-condições

- Anúncio `active`, geralmente `shippable = false`.

## Fluxo (MVP)

1. Comprador abre anúncio → inicia conversa no chat
2. Negociam preço/encontro
3. Fecham presencialmente (PIX na hora, na praia)
4. Vendedor (ou comprador) marca o anúncio como **"vendido"** → `sold`
5. Se a venda passou pela plataforma com pagamento online opcional, segue o fluxo de escrow

## Por que não forçar pagamento online aqui

- Ticket alto + entrega presencial → muitos preferem PIX na mão.
- Forçar escrow aqui gera atrito e não captura (eles fechariam fora).
- A plataforma agrega valor na **descoberta + filtro + reputação**, mesmo sem capturar o pagamento.

## Realidade

- Disintermediação pro WhatsApp vai acontecer aqui. Aceite. O ganho é ser o melhor lugar pra
  **descobrir e filtrar** gear grande no hub, e construir reputação via os acessórios pagos.

## Opcional

- Oferecer pagamento online com escrow se **ambos** toparem (proteção em venda à distância entre hubs).
