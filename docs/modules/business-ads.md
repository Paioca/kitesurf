# Módulo — Anúncios de negócios locais (receita)

## Objetivo

A fonte de receita que **chega primeiro** e não depende de liquidez de transação.
Escolas, instrutores, lojas, pousadas, cafés, eventos pagam por presença na plataforma.

> Ver [07-monetization](../07-monetization.md). Esta é a aposta de R$60k/ano.

## Entidade: `BusinessListing`

`id, owner_user_id, type, name, description, contact, city/spot, plan, status, starts_at, ends_at`

- `type`: `school / instructor / store / lodging / cafe / event`
- `plan`: `basic / featured` (planos de assinatura mensal)
- `status`: `active / paused / expired`

## Produto (MVP)

- Página do negócio (perfil simples: descrição, fotos, contato, localização).
- **Selo "parceiro"** visível.
- Destaque na home do hub / na busca relacionada.

## Pricing (referência inicial — validar com vendas)

- Escola: ~R$200/mês
- Pousada: ~R$150/mês
- Café/loja/evento: faixa R$100–150/mês

## Operação no MVP

- Venda manual (você vende; é relacionamento local).
- Cobrança via PSP (assinatura) ou boleto/PIX recorrente.
- Cadastro do negócio pode ser feito por você no começo (concierge).

## Fora do MVP

- Auto-serviço de compra de plano.
- Métricas de performance do anúncio pro negócio.
- Leilão de destaque.
