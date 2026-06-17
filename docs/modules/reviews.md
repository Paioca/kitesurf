# Módulo — Reviews / Reputação

## Objetivo

Reputação **não-gameável**: só quem pagou de verdade avalia.

## Regra central

> Review só existe atrelada a um **`Order` pago** (`released` ou `refunded`).
> Sem transação paga, sem review. Isso elimina o honor system do plano original.

## Formato (MVP — simplificado)

- **1 estrela (1–5)** + comentário opcional.
- 1 review por par, por order.
- Ambos os lados podem avaliar (comprador↔vendedor) após a order fechar.

> Cortamos os 4 critérios (comunicação / precisão / experiência) do plano original — overkill
> no MVP e baixa taxa de preenchimento. Uma nota + comentário basta.

## Exibição (perfil)

- Nota média
- Total de avaliações
- Total de vendas / compras

## Cálculo

Média simples das estrelas. (Sem ponderação no MVP.)

## Antiabuso

- Atrelada a order paga → não dá pra inflar com transação fake.
- Sem retaliação cruzada automática; report cobre casos de abuso.
